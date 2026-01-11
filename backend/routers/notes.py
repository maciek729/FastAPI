from datetime import datetime
from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Notes
from dotenv import load_dotenv

router = APIRouter(
    prefix="/notes",
    tags=["notes"]
)

load_dotenv()

# --- DB dependency ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]

# --- MODELE ---

class NoteCreate(BaseModel):
    user_id: int
    notebook_id: int
    title: str
    content: str
    type: str = "Notatka"
    is_shared: bool = False


class NoteOut(BaseModel):
    id: int
    user_id: int
    notebook_id: int
    folder_id: int | None = None
    title: str
    content: str
    type: str
    created_at: datetime
    updated_at: datetime
    is_shared: bool
    grid_position: int | None = None
    is_pinned: bool = False

    class Config:
        from_attributes = True


# --- ENDPOINTY ---

@router.post("/create", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
def create_note(note: NoteCreate, db: db_dependency):
    new_note = Notes(
        user_id=note.user_id,
        notebook_id=note.notebook_id,
        title=note.title,
        content=note.content,
        type=note.type,
        is_shared=note.is_shared,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    return new_note


@router.get("/list/{notebook_id}", response_model=List[NoteOut])
def list_notes(notebook_id: int, db: db_dependency):
    notes = db.query(Notes).filter(Notes.notebook_id == notebook_id).all()
    return notes


@router.get("/{note_id}", response_model=NoteOut)
def get_note(note_id: int, db: db_dependency):
    note = db.query(Notes).filter(Notes.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.put("/{note_id}", response_model=NoteOut)
def update_note(note_id: int, request: NoteCreate, db: db_dependency):
    """Update an existing note"""
    note = db.query(Notes).filter(Notes.id == note_id).first()
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    # Update note fields
    note.title = request.title
    note.content = request.content
    note.type = request.type
    note.is_shared = request.is_shared
    
    db.commit()
    db.refresh(note)
    return note


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(note_id: int, db: db_dependency):
    """Delete a note"""
    note = db.query(Notes).filter(Notes.id == note_id).first()
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    db.delete(note)
    db.commit()
    return {"message": "Note deleted successfully"}

# Dodaj te endpointy do swojego routers/notes.py

from datetime import datetime, timedelta, timezone

# Słownik do przechowywania blokad notatek (w produkcji użyj Redis lub bazy danych)
note_locks = {}

@router.post("/{note_id}/lock")
def lock_note(note_id: int, user_id: int, db: db_dependency):
    """Lock a note for editing"""
    note = db.query(Notes).filter(Notes.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    current_time = datetime.now(timezone.utc)
    
    # Check if note is already locked
    if note_id in note_locks:
        lock_info = note_locks[note_id]
        # Check if lock is still valid (less than 5 minutes old)
        if current_time - lock_info['locked_at'] < timedelta(minutes=5):
            if lock_info['user_id'] != user_id:
                return {
                    "locked": True,
                    "locked_by_user_id": lock_info['user_id'],
                    "locked_by_username": lock_info['username'],
                    "can_edit": False
                }
        else:
            # Lock expired, remove it
            del note_locks[note_id]
    
    # Get username
    from models import Users
    user = db.query(Users).filter(Users.id == user_id).first()
    username = user.username if user else "Unknown"
    
    # Lock the note
    note_locks[note_id] = {
        'user_id': user_id,
        'username': username,
        'locked_at': current_time
    }
    
    return {
        "locked": True,
        "locked_by_user_id": user_id,
        "locked_by_username": username,
        "can_edit": True
    }


@router.post("/{note_id}/unlock")
def unlock_note(note_id: int, user_id: int):
    """Unlock a note"""
    if note_id in note_locks:
        lock_info = note_locks[note_id]
        # Only the user who locked it can unlock it
        if lock_info['user_id'] == user_id:
            del note_locks[note_id]
            return {"message": "Note unlocked successfully"}
        else:
            raise HTTPException(status_code=403, detail="You don't have permission to unlock this note")
    
    return {"message": "Note was not locked"}


@router.get("/{note_id}/lock-status")
def get_lock_status(note_id: int, db: db_dependency):
    """Check if a note is locked"""
    note = db.query(Notes).filter(Notes.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    current_time = datetime.now(timezone.utc)
    
    if note_id in note_locks:
        lock_info = note_locks[note_id]
        # Check if lock is still valid
        if current_time - lock_info['locked_at'] < timedelta(minutes=5):
            return {
                "locked": True,
                "locked_by_user_id": lock_info['user_id'],
                "locked_by_username": lock_info['username']
            }
        else:
            # Lock expired, remove it
            del note_locks[note_id]
    
    return {"locked": False}


# Pin and Position endpoints for drag-and-drop functionality

class UpdatePinRequest(BaseModel):
    is_pinned: bool


class UpdatePositionRequest(BaseModel):
    grid_position: int


@router.patch("/{note_id}/pin")
async def update_note_pin(note_id: int, request: UpdatePinRequest, db: db_dependency):
    """
    Pin or unpin a note to keep it at the top of the list
    """
    note = db.query(Notes).filter(Notes.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    note.is_pinned = request.is_pinned
    db.commit()
    db.refresh(note)

    return {"message": "Pin status updated successfully", "is_pinned": note.is_pinned}


@router.patch("/{note_id}/position")
async def update_note_position(note_id: int, request: UpdatePositionRequest, db: db_dependency):
    """
    Update the grid position of a note for drag-and-drop ordering
    """
    note = db.query(Notes).filter(Notes.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    note.grid_position = request.grid_position
    db.commit()
    db.refresh(note)

    return {"message": "Position updated successfully", "grid_position": note.grid_position}


# Copy note to another notebook

class CopyNoteRequest(BaseModel):
    target_notebook_id: int
    user_id: int


@router.post("/{note_id}/copy", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
async def copy_note_to_notebook(note_id: int, request: CopyNoteRequest, db: db_dependency):
    """
    Copy a note to another notebook
    """
    # Get the original note
    original_note = db.query(Notes).filter(Notes.id == note_id).first()
    if not original_note:
        raise HTTPException(status_code=404, detail="Note not found")

    # Create a new note in the target notebook
    new_note = Notes(
        user_id=request.user_id,
        notebook_id=request.target_notebook_id,
        title=original_note.title,
        content=original_note.content,
        type=original_note.type,
        is_shared=False,  # New copy starts as not shared
        grid_position=None,  # Will be set by frontend drag-and-drop
        is_pinned=False,  # New copy starts unpinned
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)

    return new_note