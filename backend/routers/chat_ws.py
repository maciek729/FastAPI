from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
import json
from datetime import datetime
from database import SessionLocal
from models import Notebooks, NotebookCollaborator, Users, NotebookMessages
from models import Notes, Tests, FlashcardSets, Podcasts

router = APIRouter(
    prefix="/group-chat",
    tags=["group-chat"]
)

def format_time(dt: datetime):
    return dt.strftime("%H:%M")

class ConnectionManager:
    def __init__(self):
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
        if notebook_id in self.active_connections:
            for connection in self.active_connections[notebook_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

manager = ConnectionManager()

@router.get("/{notebook_id}/history")
async def get_chat_history(notebook_id: int):
    with SessionLocal() as db:
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
                "type": m.type,
                "is_edited": m.is_edited if m.is_edited is not None else False,
                "is_deleted": False
            } for m in messages]
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

@router.websocket("/ws/{notebook_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, notebook_id: int, user_id: int):
    with SessionLocal() as db:
        is_owner = db.query(Notebooks).filter(Notebooks.id == notebook_id, Notebooks.created_by == user_id).first()
        is_collaborator = db.query(NotebookCollaborator).filter(NotebookCollaborator.notebook_id == notebook_id, NotebookCollaborator.user_id == user_id).first()

        if not is_owner and not is_collaborator:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
            
    await manager.connect(websocket, notebook_id)

    try:
        while True:
            data = await websocket.receive_text()
            message_json = json.loads(data)
            
            with SessionLocal() as db:
                new_msg = NotebookMessages(
                    notebook_id=notebook_id,
                    user_id=user_id,
                    content=message_json.get('text', ''),
                    type=message_json.get('type', 'text'),
                    created_at=datetime.utcnow(),
                    is_edited=False,
                    is_deleted=False
                )
                db.add(new_msg)
                db.commit()
                db.refresh(new_msg)

                user = db.query(Users).filter(Users.id == user_id).first()
                
                broadcast_data = {
                    "id": new_msg.id,
                    "senderId": user_id,
                    "senderName": user.username if user else "Użytkownik",
                    "text": new_msg.content,
                    "timestamp": format_time(new_msg.created_at),
                    "type": new_msg.type,
                    "is_edited": False,
                    "is_deleted": False
                }
                await manager.broadcast(broadcast_data, notebook_id)

    except WebSocketDisconnect:
        manager.disconnect(websocket, notebook_id)
    except Exception:
        manager.disconnect(websocket, notebook_id)

@router.delete("/message/{message_id}")
async def delete_message(message_id: int, user_id: int):
    with SessionLocal() as db:
        msg = db.query(NotebookMessages).filter(NotebookMessages.id == message_id).first()
        if not msg or msg.user_id != user_id:
            raise HTTPException(status_code=403, detail="Brak uprawnień")

        notebook_id = msg.notebook_id
        db.delete(msg)
        db.commit()

        await manager.broadcast({
            "type": "message_delete",
            "messageId": message_id
        }, notebook_id)
        
        return {"status": "success"}

@router.patch("/message/{message_id}")
async def edit_message(message_id: int, user_id: int, new_content: str):
    with SessionLocal() as db:
        msg = db.query(NotebookMessages).filter(NotebookMessages.id == message_id).first()
        if not msg or msg.user_id != user_id:
            raise HTTPException(status_code=403, detail="Brak uprawnień")

        msg.content = new_content
        msg.is_edited = True
        db.commit()

        await manager.broadcast({
            "type": "message_edit",
            "messageId": message_id,
            "newText": new_content
        }, msg.notebook_id)
        
        return {"status": "success"}

@router.get("/notes/notebook/{notebook_id}")
async def get_notebook_notes(notebook_id: int):
    with SessionLocal() as db:
        notes = db.query(Notes).filter(Notes.notebook_id == notebook_id, Notes.type == "Notatka").all()
        return [{"id": n.id, "title": n.title} for n in notes]

@router.get("/tests/notebook/{notebook_id}")
async def get_notebook_tests(notebook_id: int):
    with SessionLocal() as db:
        tests = db.query(Tests).filter(Tests.notebook_id == notebook_id).all()
        return [{"id": t.id, "title": t.title} for t in tests]

@router.get("/flashcards/notebook/{notebook_id}")
async def get_notebook_flashcards(notebook_id: int):
    with SessionLocal() as db:
        sets = db.query(FlashcardSets).filter(FlashcardSets.notebook_id == notebook_id).all()
        return [{"id": s.id, "title": s.title} for s in sets]
    
@router.get("/podcasts/notebook/{notebook_id}")
async def get_notebook_podcasts(notebook_id: int):
    with SessionLocal() as db:
        podcasts = db.query(Podcasts).filter(Podcasts.notebook_id == notebook_id).all()
        return [{"id": p.id, "title": p.title} for p in podcasts]