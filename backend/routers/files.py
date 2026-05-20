import os
import uuid
from datetime import datetime
from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import SessionLocal
from models import StudyFiles, Notebooks
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

router = APIRouter(
    prefix="/files",
    tags=["files"]
)

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
    folder_id: Optional[int] = None
    grid_position: Optional[int] = None
    is_pinned: Optional[bool] = False
    created_at: datetime

    class Config:
        from_attributes = True

class UpdateFilePinRequest(BaseModel):
    is_pinned: bool

class UpdateFilePositionRequest(BaseModel):
    grid_position: int

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
        
        notebook_folder = f"uploads/study-files/{notebook_id}"
        os.makedirs(notebook_folder, exist_ok=True)
        
        unique_filename = f"{uuid.uuid4()}.{file_ext}"
        storage_path = f"{notebook_folder}/{unique_filename}"
        
        with open(storage_path, "wb") as buffer:
            buffer.write(file_content)
        
        base_url = os.getenv("API_BASE_URL", "http://localhost:8000")
        file_url = f"{base_url}/{storage_path}"

        new_file = StudyFiles(
            notebook_id=notebook_id,
            user_id=user_id,
            file_name=file.filename,
            file_path=storage_path,
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
    try:
        files = db.query(StudyFiles).filter(StudyFiles.notebook_id == notebook_id).order_by(StudyFiles.created_at.desc()).all()
        print(f"Found {len(files)} files for notebook {notebook_id}")
        return files
    except Exception as e:
        print(f"Error listing files: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")

@router.delete("/{file_id}")
def delete_file(file_id: int, db: db_dependency):
    file_record = db.query(StudyFiles).filter(StudyFiles.id == file_id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")

    try:
        if file_record.file_path and os.path.exists(file_record.file_path):
            os.remove(file_record.file_path)
        
        db.delete(file_record)
        db.commit()
        
        return {"message": "File deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")

@router.patch("/{file_id}/pin")
def toggle_pin_file(file_id: int, request: UpdateFilePinRequest, db: db_dependency):
    file_record = db.query(StudyFiles).filter(StudyFiles.id == file_id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        file_record.is_pinned = request.is_pinned
        db.commit()
        db.refresh(file_record)
        return {"message": "File pin status updated", "is_pinned": file_record.is_pinned}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")

@router.patch("/{file_id}/position")
def update_file_position(file_id: int, request: UpdateFilePositionRequest, db: db_dependency):
    file_record = db.query(StudyFiles).filter(StudyFiles.id == file_id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        file_record.grid_position = request.grid_position
        db.commit()
        db.refresh(file_record)
        return {"message": "File position updated", "grid_position": file_record.grid_position}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")

class MoveFileToFolderRequest(BaseModel):
    file_id: int
    folder_id: Optional[int] = None

@router.post("/move-to-folder")
def move_file_to_folder(request: MoveFileToFolderRequest, db: db_dependency):
    """Move a file into or out of a folder"""
    file_record = db.query(StudyFiles).filter(StudyFiles.id == request.file_id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        file_record.folder_id = request.folder_id
        db.commit()
        db.refresh(file_record)
        return {"message": "File moved successfully", "file": file_record}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Move failed: {str(e)}")