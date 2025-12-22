from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
import json
from datetime import datetime

# IMPORTY TWOICH MODUŁÓW
from database import SessionLocal
from models import Notebooks, NotebookCollaborator, Users, NotebookMessages

router = APIRouter(
    prefix="/group-chat",
    tags=["group-chat"]
)

# --- POMOCNICZE ---
def format_time(dt: datetime):
    """Formatowanie czasu do czytelnej postaci HH:MM"""
    return dt.strftime("%H:%M")

# --- MENEDŻER POŁĄCZEŃ ---
class ConnectionManager:
    def __init__(self):
        # Słownik: { notebook_id: [lista_websocketów] }
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, notebook_id: int):
        await websocket.accept()
        if notebook_id not in self.active_connections:
            self.active_connections[notebook_id] = []
        self.active_connections[notebook_id].append(websocket)

    def disconnect(self, websocket: WebSocket, notebook_id: int):
        if notebook_id in self.active_connections:
            if websocket in self.active_connections[notebook_id]:
                self.active_connections[notebook_id].remove(websocket)
            if not self.active_connections[notebook_id]:
                del self.active_connections[notebook_id]

    async def broadcast(self, message: dict, notebook_id: int):
        """Wysyła wiadomość do wszystkich osób przypisanych do danego notatnika"""
        if notebook_id in self.active_connections:
            for connection in self.active_connections[notebook_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    # Ignorujemy błędy wysyłki dla pojedynczych połączeń
                    pass

manager = ConnectionManager()

# --- ENDPOINTY HTTP ---

@router.get("/{notebook_id}/history")
async def get_chat_history(notebook_id: int):
    """Pobiera historyczne wiadomości z bazy danych dla konkretnego notatnika"""
    db = SessionLocal()
    try:
        messages = db.query(NotebookMessages).filter(
            NotebookMessages.notebook_id == notebook_id
        ).order_by(NotebookMessages.created_at.asc()).all()

        return [{
            "id": m.id,
            "senderId": m.user_id,
            "senderName": m.user.username if m.user else "Użytkownik",
            "text": m.content,
            "timestamp": format_time(m.created_at),
            "type": m.type
        } for m in messages]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

# --- ENDPOINT WEBSOCKET ---

@router.websocket("/ws/{notebook_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, notebook_id: int, user_id: int):
    db = SessionLocal()
    try:
        # 1. WERYFIKACJA DOSTĘPU
        is_owner = db.query(Notebooks).filter(
            Notebooks.id == notebook_id, 
            Notebooks.created_by == user_id
        ).first()
        
        is_collaborator = db.query(NotebookCollaborator).filter(
            NotebookCollaborator.notebook_id == notebook_id,
            NotebookCollaborator.user_id == user_id
        ).first()

        if not is_owner and not is_collaborator:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # 2. AKCEPTACJA POŁĄCZENIA
        await manager.connect(websocket, notebook_id)

        while True:
            # Oczekiwanie na wiadomość
            data = await websocket.receive_text()
            message_json = json.loads(data)
            
            # 3. ZAPIS DO BAZY DANYCH (PERSYSTENCJA)
            new_msg = NotebookMessages(
                notebook_id=notebook_id,
                user_id=user_id,
                content=message_json.get('text', ''),
                type=message_json.get('type', 'text'),
                created_at=datetime.utcnow()
            )
            db.add(new_msg)
            db.commit()
            db.refresh(new_msg)

            # Pobranie danych nadawcy do broadcastu
            user = db.query(Users).filter(Users.id == user_id).first()
            
            # 4. ROZESŁANIE (BROADCAST) DO INNYCH
            broadcast_data = {
                "id": new_msg.id,
                "senderId": user_id,
                "senderName": user.username if user else "Użytkownik",
                "text": new_msg.content,
                "timestamp": format_time(new_msg.created_at),
                "type": new_msg.type
            }

            await manager.broadcast(broadcast_data, notebook_id)

    except WebSocketDisconnect:
        manager.disconnect(websocket, notebook_id)
    except Exception as e:
        print(f"Błąd krytyczny WebSocket: {e}")
        manager.disconnect(websocket, notebook_id)
    finally:
        db.close()