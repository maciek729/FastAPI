from datetime import datetime, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from database import SessionLocal, Base  
from models import Notes
from dotenv import load_dotenv

router = APIRouter(
    prefix='/notes',
    tags=['notes']
)

load_dotenv()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class NoteCreate(BaseModel):
    user_id: int
    notebook_id: int
    title: str
    content: str
    type: str = "Notatka"  # Add type field with default value
    is_shared: bool = False

class NoteOut(BaseModel):
    id: int
    user_id: int
    notebook_id: int
    title: str
    content: str
    type: str  # Add type field to output
    created_at: datetime
    updated_at: datetime
    is_shared: bool

    class Config:
        from_attributes = True

db_dependency = Annotated[Session, Depends(get_db)]

@router.post("/create", response_model=NoteOut)
def create_note(note: NoteCreate, db: Session = Depends(db_dependency)):
    new_note = Notes(
        user_id=note.user_id,
        notebook_id=note.notebook_id,
        title=note.title,
        content=note.content,
        type=note.type,  # Include type field
        is_shared=note.is_shared,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    return new_note

@router.get("/list/{notebook_id}", response_model=list[NoteOut])
def list_notes(notebook_id: int, db: Session = Depends(db_dependency)):
    return db.query(Notes).filter(Notes.notebook_id == notebook_id).all()

@router.get("/{note_id}", response_model=NoteOut)
def get_note(note_id: int, db: Session = Depends(db_dependency)):
    note = db.query(Notes).filter(Notes.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note

@router.put("/{note_id}", response_model=NoteOut)
def update_note(note_id: int, note_update: NoteCreate, db: Session = Depends(db_dependency)):
    note = db.query(Notes).filter(Notes.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    note.title = note_update.title
    note.content = note_update.content
    note.type = note_update.type
    note.is_shared = note_update.is_shared
    note.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(note)
    return note

@router.delete("/{note_id}")
def delete_note(note_id: int, db: Session = Depends(db_dependency)):
    note = db.query(Notes).filter(Notes.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    db.delete(note)
    db.commit()
    return {"message": "Note deleted successfully"}