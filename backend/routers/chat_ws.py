from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Dict
import json
from datetime import datetime
from database import SessionLocal
from models import Notebooks, NotebookCollaborator, Users, NotebookMessages, StudyFiles
from models import Notes, Tests, FlashcardSets, Podcasts, Notifications, ChatReadStatus
import re
from sqlalchemy import func

router = APIRouter(
    prefix="/group-chat",
    tags=["group-chat"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

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
                "senderAvatar": m.user.avatar_url if m.user else None,
                "text": m.content,
                "timestamp": m.created_at.isoformat(),
                "type": m.type,
                "is_edited": m.is_edited if m.is_edited is not None else False,
                "is_deleted": False
            } for m in messages]
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

@router.websocket("/ws/{notebook_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, notebook_id: int, user_id: int):
    with SessionLocal() as db:
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

                user_sender = db.query(Users).filter(Users.id == user_id).first()
                
                content = new_msg.content
                mentioned_user_ids = set()

                if "@wszyscy" in content.lower():
                    notebook = db.query(Notebooks).filter(Notebooks.id == notebook_id).first()
                    if notebook:
                        mentioned_user_ids.add(notebook.created_by)
                    
                    collabs = db.query(NotebookCollaborator).filter(
                        NotebookCollaborator.notebook_id == notebook_id
                    ).all()
                    for c in collabs:
                        mentioned_user_ids.add(c.user_id)
                
                else:
                    mentions = re.findall(r"@(\w+)", content)
                    if mentions:
                        db_users = db.query(Users.id).filter(Users.username.in_(mentions)).all()
                        for u in db_users:
                            mentioned_user_ids.add(u.id)

                if user_id in mentioned_user_ids:
                    mentioned_user_ids.remove(user_id)

                for target_id in mentioned_user_ids:
                    new_notification = Notifications(
                        user_id=target_id,
                        sender_id=user_id,
                        content=user_sender.username,
                        type="mention",
                        redirect_type="notebook",
                        notebook_id=notebook_id,
                        tab_target="chat",
                        item_id=new_msg.id,
                        is_read=False,
                        created_at=datetime.utcnow()
                    )
                    db.add(new_notification)
                
                db.commit()

                broadcast_data = {
                    "id": new_msg.id,
                    "senderId": user_id,
                    "senderName": user_sender.username if user_sender else "Użytkownik",
                    "senderAvatar": user_sender.avatar_url if user_sender else None,
                    "text": new_msg.content,
                    "timestamp": datetime.utcnow().isoformat(),
                    "type": new_msg.type,
                    "is_edited": False,
                    "is_deleted": False
                }
                await manager.broadcast(broadcast_data, notebook_id)

    except WebSocketDisconnect:
        manager.disconnect(websocket, notebook_id)
    except Exception as e:
        print(f"Błąd WebSocket: {e}")
        manager.disconnect(websocket, notebook_id)

@router.delete("/message/{message_id}")
async def delete_message(message_id: int, user_id: int):
    with SessionLocal() as db:
        msg = db.query(NotebookMessages).filter(NotebookMessages.id == message_id).first()
        if not msg or msg.user_id != user_id:
            raise HTTPException(status_code=403, detail="Brak uprawnień")

        notebook_id = msg.notebook_id
        was_pinned = msg.is_pinned
        db.delete(msg)
        db.commit()

        await manager.broadcast({
            "type": "message_delete",
            "messageId": message_id
        }, notebook_id)

        if was_pinned:
            await manager.broadcast({
                "type": "message_unpin"
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
    
@router.get("/{notebook_id}/pinned")
async def get_pinned_message(notebook_id: int):
    with SessionLocal() as db:
        msg = db.query(NotebookMessages).filter(
            NotebookMessages.notebook_id == notebook_id,
            NotebookMessages.is_pinned == True
        ).first()
        if not msg:
            return None
        return {
            "id": msg.id,
            "text": msg.content,
            "senderName": msg.user.username if msg.user else "Użytkownik"
        }

@router.patch("/message/{message_id}/pin")
async def pin_message(message_id: int, user_id: int):
    with SessionLocal() as db:
        msg = db.query(NotebookMessages).filter(NotebookMessages.id == message_id).first()
        if not msg:
            raise HTTPException(status_code=404, detail="Wiadomość nie istnieje")
        
        db.query(NotebookMessages).filter(
            NotebookMessages.notebook_id == msg.notebook_id
        ).update({NotebookMessages.is_pinned: False})
        
        msg.is_pinned = True
        db.commit()

        await manager.broadcast({
            "type": "message_pin",
            "pinnedMessage": {
                "id": msg.id,
                "text": msg.content,
                "senderName": msg.user.username if msg.user else "Użytkownik"
            }
        }, msg.notebook_id)
        
        return {"status": "success"}
    
@router.patch("/{notebook_id}/unpin")
async def unpin_message(notebook_id: int):
    with SessionLocal() as db:
        # Odpinamy wszystko w tym notatniku
        db.query(NotebookMessages).filter(
            NotebookMessages.notebook_id == notebook_id
        ).update({NotebookMessages.is_pinned: False})
        
        db.commit()

        # Informujemy wszystkich przez WebSocket, że pinezka zniknęła
        await manager.broadcast({
            "type": "message_unpin"
        }, notebook_id)
        
        return {"status": "success"}

@router.get("/notes/notebook/{notebook_id}")
async def get_notebook_notes(notebook_id: int):
    with SessionLocal() as db:
        notes = db.query(Notes).filter(
            Notes.notebook_id == notebook_id, 
            Notes.type.in_(["Notatka", "Chat AI"])
            ).all()
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
    
@router.get("/files/notebook/{notebook_id}")
async def get_notebook_files(notebook_id: int):
    with SessionLocal() as db:
        files = db.query(StudyFiles).filter(StudyFiles.notebook_id == notebook_id).all()
        return [{"id": f.id, "title": f.file_name, "type": "file"} for f in files]
    
@router.get("/{notebook_id}/members")
async def get_notebook_members(notebook_id: int):
    with SessionLocal() as db:
        notebook = db.query(Notebooks).filter(Notebooks.id == notebook_id).first()
        if not notebook:
            raise HTTPException(status_code=404, detail="Notebook not found")

        members = []

        owner = db.query(Users).filter(Users.id == notebook.created_by).first()
        if owner:
            members.append({
                "id": owner.id, 
                "username": owner.username,
                "avatar_url": owner.avatar_url
            })

        collaborators = db.query(NotebookCollaborator).filter(
            NotebookCollaborator.notebook_id == notebook_id
        ).all()

        for collab in collaborators:
            if collab.user and collab.user.id != notebook.created_by:
                members.append({
                    "id": collab.user.id, 
                    "username": collab.user.username,
                    "avatar_url": collab.user.avatar_url
                })

        return members
    
@router.post("/{notebook_id}/mark-read")
def mark_chat_read(notebook_id: int, user_id: int, db: Session = Depends(get_db)):
    read_status = db.query(ChatReadStatus).filter(
        ChatReadStatus.user_id == user_id,
        ChatReadStatus.notebook_id == notebook_id
    ).first()

    if read_status:
        read_status.last_viewed_at = datetime.utcnow()
    else:
        new_status = ChatReadStatus(
            user_id=user_id,
            notebook_id=notebook_id,
            last_viewed_at=datetime.utcnow()
        )
        db.add(new_status)
    
    db.commit()
    return {"status": "success"}

@router.get("/unread-status/{user_id}")
def get_unread_status(user_id: int, db: Session = Depends(get_db)):
    collab_notebooks = db.query(NotebookCollaborator.notebook_id).filter(
        NotebookCollaborator.user_id == user_id
    ).all()
    
    owner_shared_notebooks = db.query(Notebooks.id).filter(
        Notebooks.created_by == user_id, 
        Notebooks.space_type == 'shared'
    ).all()
    
    notebook_ids = list(set(
        [id[0] for id in collab_notebooks] + [id[0] for id in owner_shared_notebooks]
    ))

    if not notebook_ids:
        return {}

    last_messages = db.query(
        NotebookMessages.notebook_id,
        func.max(NotebookMessages.created_at).label('last_message_at')
    ).filter(
        NotebookMessages.notebook_id.in_(notebook_ids)
    ).group_by(
        NotebookMessages.notebook_id
    ).all()

    user_views = db.query(
        ChatReadStatus.notebook_id,
        ChatReadStatus.last_viewed_at
    ).filter(
        ChatReadStatus.user_id == user_id,
        ChatReadStatus.notebook_id.in_(notebook_ids)
    ).all()

    views_map = {uv.notebook_id: uv.last_viewed_at for uv in user_views}

    unread_notebooks = {}

    for item in last_messages:
        notebook_id = item.notebook_id
        last_msg_date = item.last_message_at
        
        if not last_msg_date:
            continue

        last_viewed_date = views_map.get(notebook_id, datetime.min)
        if last_msg_date > last_viewed_date:
             iso_date = last_msg_date.isoformat()
             if not iso_date.endswith("Z") and "+" not in iso_date:
                iso_date += "Z"
             unread_notebooks[notebook_id] = iso_date

    return unread_notebooks