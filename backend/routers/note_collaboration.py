from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Set
import json
from datetime import datetime
from database import SessionLocal
from models import Notes, Notebooks, NotebookCollaborator, Users

router = APIRouter(
    prefix="/note-collab",
    tags=["note-collaboration"]
)

class NoteCollaborationManager:
    def __init__(self):
        # note_id -> list of connections
        self.active_connections: Dict[int, List[Dict]] = {}
        # note_id -> set of user_ids currently editing
        self.active_editors: Dict[int, Set[int]] = {}

    async def connect(self, websocket: WebSocket, note_id: int, user_id: int, username: str, avatar_url: str = None):
        await websocket.accept()
        
        if note_id not in self.active_connections:
            self.active_connections[note_id] = []
            self.active_editors[note_id] = set()
        
        connection_info = {
            'websocket': websocket,
            'user_id': user_id,
            'username': username,
            'avatar_url': avatar_url,
            'cursor_position': None
        }
        
        self.active_connections[note_id].append(connection_info)
        self.active_editors[note_id].add(user_id)
        
        # Notify others that a new user joined
        await self.broadcast_presence(note_id)

    def disconnect(self, websocket: WebSocket, note_id: int, user_id: int):
        if note_id in self.active_connections:
            self.active_connections[note_id] = [
                conn for conn in self.active_connections[note_id] 
                if conn['websocket'] != websocket
            ]
            
            if user_id in self.active_editors.get(note_id, set()):
                self.active_editors[note_id].discard(user_id)
            
            if not self.active_connections[note_id]:
                del self.active_connections[note_id]
                if note_id in self.active_editors:
                    del self.active_editors[note_id]

    async def broadcast_presence(self, note_id: int):
        """Broadcast who is currently editing the note"""
        if note_id not in self.active_connections:
            return
        
        editors = []
        for conn in self.active_connections[note_id]:
            editors.append({
                'user_id': conn['user_id'],
                'username': conn['username'],
                'avatar_url': conn['avatar_url'],
                'cursor_position': conn['cursor_position']
            })
        
        message = {
            'type': 'presence',
            'editors': editors
        }
        
        await self.broadcast(message, note_id)

    async def broadcast(self, message: dict, note_id: int, exclude_user_id: int = None):
        """Send message to all connected users, optionally excluding one"""
        if note_id in self.active_connections:
            for conn in self.active_connections[note_id]:
                if exclude_user_id is None or conn['user_id'] != exclude_user_id:
                    try:
                        await conn['websocket'].send_json(message)
                    except Exception:
                        pass

    async def update_cursor(self, note_id: int, user_id: int, cursor_position: dict):
        """Update a user's cursor position and broadcast it"""
        if note_id in self.active_connections:
            for conn in self.active_connections[note_id]:
                if conn['user_id'] == user_id:
                    conn['cursor_position'] = cursor_position
                    break
            
            # Broadcast cursor update
            message = {
                'type': 'cursor',
                'user_id': user_id,
                'cursor_position': cursor_position
            }
            await self.broadcast(message, note_id, exclude_user_id=user_id)

    def get_editors(self, note_id: int) -> List[Dict]:
        """Get list of current editors for a note"""
        if note_id not in self.active_connections:
            return []
        
        return [{
            'user_id': conn['user_id'],
            'username': conn['username'],
            'avatar_url': conn['avatar_url']
        } for conn in self.active_connections[note_id]]


manager = NoteCollaborationManager()


@router.get("/{note_id}/editors")
async def get_active_editors(note_id: int):
    """Get list of users currently editing a note"""
    editors = manager.get_editors(note_id)
    return {"editors": editors}


@router.websocket("/ws/{note_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, note_id: int, user_id: int):
    """WebSocket endpoint for collaborative note editing"""
    
    # Verify permissions
    with SessionLocal() as db:
        note = db.query(Notes).filter(Notes.id == note_id).first()
        if not note:
            await websocket.close(code=1008)
            return
        
        # Check if user has access to this note's notebook
        notebook = db.query(Notebooks).filter(Notebooks.id == note.notebook_id).first()
        if not notebook:
            await websocket.close(code=1008)
            return
        
        # Check if user is owner or collaborator
        is_owner = notebook.created_by == user_id
        is_collaborator = db.query(NotebookCollaborator).filter(
            NotebookCollaborator.notebook_id == note.notebook_id,
            NotebookCollaborator.user_id == user_id
        ).first()
        
        if not is_owner and not is_collaborator:
            await websocket.close(code=1008)
            return
        
        # Get user info
        user = db.query(Users).filter(Users.id == user_id).first()
        username = user.username if user else "Unknown"
        avatar_url = user.avatar_url if user else None
    
    await manager.connect(websocket, note_id, user_id, username, avatar_url)
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            message_type = message.get('type')
            
            if message_type == 'content_change':
                # Broadcast content change to all other users
                await manager.broadcast({
                    'type': 'content_change',
                    'user_id': user_id,
                    'username': username,
                    'changes': message.get('changes'),
                    'content': message.get('content'),
                    'timestamp': datetime.now().isoformat()
                }, note_id, exclude_user_id=user_id)
            
            elif message_type == 'cursor_update':
                # Update and broadcast cursor position
                cursor_position = message.get('cursor_position')
                await manager.update_cursor(note_id, user_id, cursor_position)
            
            elif message_type == 'save':
                # User saved the note, broadcast to others
                with SessionLocal() as db:
                    note = db.query(Notes).filter(Notes.id == note_id).first()
                    if note:
                        note.content = message.get('content')
                        note.title = message.get('title', note.title)
                        note.updated_at = datetime.now()
                        db.commit()
                        
                        await manager.broadcast({
                            'type': 'saved',
                            'user_id': user_id,
                            'username': username,
                            'content': message.get('content'),
                            'title': message.get('title'),
                            'timestamp': datetime.now().isoformat()
                        }, note_id)
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, note_id, user_id)
        await manager.broadcast_presence(note_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket, note_id, user_id)
        await manager.broadcast_presence(note_id)
