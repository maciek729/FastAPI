import os
import uuid
from datetime import datetime
from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import SessionLocal
from models import StudyFiles, Notebooks
from dotenv import load_dotenv
from supabase import create_client, Client
from pydantic import BaseModel

load_dotenv()

router = APIRouter(
    prefix="/files",
    tags=["files"]
)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_BUCKET = "study-files"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- DB Dependency ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]

# --- Modele Pydantic ---
class FileOut(BaseModel):
    id: int
    file_name: str
    file_url: str
    file_type: str
    file_size: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Endpointy ---

@router.post("/upload", response_model=FileOut)
async def upload_file(
    db: db_dependency,
    notebook_id: int = Form(...),
    user_id: int = Form(...),
    file: UploadFile = File(...)
):
    notebook = db.query(Notebooks).filter(Notebooks.id == notebook_id).first()
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")

    try:
        file_content = await file.read()
        file_ext = file.filename.split(".")[-1]
        unique_filename = f"{user_id}/{notebook_id}/{uuid.uuid4()}.{file_ext}"
        
        supabase.storage.from_(SUPABASE_BUCKET).upload(
            path=unique_filename,
            file=file_content,
            file_options={"content-type": file.content_type}
        )
        
        file_url = supabase.storage.from_(SUPABASE_BUCKET).get_public_url(unique_filename)

        new_file = StudyFiles(
            notebook_id=notebook_id,
            user_id=user_id,
            file_name=file.filename,
            file_path=unique_filename,
            file_url=file_url,
            file_type=file.content_type,
            file_size=len(file_content)
        )
        
        db.add(new_file)
        db.commit()
        db.refresh(new_file)
        
        return new_file

    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

@router.get("/list/{notebook_id}", response_model=List[FileOut])
def list_files(notebook_id: int, db: db_dependency):
    files = db.query(StudyFiles).filter(StudyFiles.notebook_id == notebook_id).order_by(StudyFiles.created_at.desc()).all()
    return files

@router.delete("/{file_id}")
def delete_file(file_id: int, db: db_dependency):
    file_record = db.query(StudyFiles).filter(StudyFiles.id == file_id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")

    try:
        supabase.storage.from_(SUPABASE_BUCKET).remove([file_record.file_path])
        
        db.delete(file_record)
        db.commit()
        
        return {"message": "File deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")