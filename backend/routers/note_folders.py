from datetime import datetime
from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import SessionLocal
from models import NoteFolders, Notes

router = APIRouter(
    prefix="/note-folders",
    tags=["note_folders"]
)

# --- DB dependency ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]

# --- PYDANTIC MODELS ---

class FolderCreate(BaseModel):
    notebook_id: int
    user_id: int
    name: str
    parent_folder_id: Optional[int] = None

class FolderUpdate(BaseModel):
    name: str

class FolderOut(BaseModel):
    id: int
    notebook_id: int
    user_id: int
    name: str
    parent_folder_id: Optional[int]
    grid_position: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True

class MoveNoteToFolderRequest(BaseModel):
    note_id: int
    folder_id: Optional[int]  # None means move to root

class MoveFolderRequest(BaseModel):
    parent_folder_id: Optional[int]  # None means move to root

# --- ENDPOINTS ---

@router.post("/create", response_model=FolderOut, status_code=status.HTTP_201_CREATED)
async def create_folder(folder: FolderCreate, db: db_dependency):
    """Create a new note folder"""
    new_folder = NoteFolders(
        notebook_id=folder.notebook_id,
        user_id=folder.user_id,
        name=folder.name,
        parent_folder_id=folder.parent_folder_id,
        created_at=datetime.now()
    )
    db.add(new_folder)
    db.commit()
    db.refresh(new_folder)
    return new_folder

@router.get("/list", response_model=List[FolderOut])
async def list_folders(notebook_id: int, user_id: int, db: db_dependency):
    """Get all folders for a specific notebook"""
    folders = db.query(NoteFolders).filter(
        NoteFolders.notebook_id == notebook_id,
        NoteFolders.user_id == user_id
    ).order_by(NoteFolders.grid_position.asc().nullsfirst(), NoteFolders.created_at.desc()).all()
    return folders

@router.patch("/{folder_id}/rename")
async def rename_folder(folder_id: int, request: FolderUpdate, db: db_dependency):
    """Rename a folder"""
    folder = db.query(NoteFolders).filter(NoteFolders.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    folder.name = request.name
    db.commit()
    db.refresh(folder)

    return {"message": "Folder renamed successfully", "folder": folder}

@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_folder(folder_id: int, db: db_dependency):
    """Delete a folder and move its contents to root"""
    folder = db.query(NoteFolders).filter(NoteFolders.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    # Move all notes in this folder to root (folder_id = None)
    db.query(Notes).filter(Notes.folder_id == folder_id).update({"folder_id": None})

    # Move all subfolders to root
    db.query(NoteFolders).filter(NoteFolders.parent_folder_id == folder_id).update({"parent_folder_id": None})

    # Delete the folder
    db.delete(folder)
    db.commit()

    return {"message": "Folder deleted successfully"}

@router.post("/move-note")
async def move_note_to_folder(request: MoveNoteToFolderRequest, db: db_dependency):
    """Move a note into or out of a folder"""
    note = db.query(Notes).filter(Notes.id == request.note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    note.folder_id = request.folder_id
    db.commit()
    db.refresh(note)

    return {"message": "Note moved successfully", "note": note}

@router.patch("/{folder_id}/move")
async def move_folder(folder_id: int, request: MoveFolderRequest, db: db_dependency):
    """Move a folder to a different parent folder or to root"""
    folder = db.query(NoteFolders).filter(NoteFolders.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    # Prevent moving a folder into itself or its own descendants
    if request.parent_folder_id is not None:
        current_parent = db.query(NoteFolders).filter(NoteFolders.id == request.parent_folder_id).first()
        if not current_parent:
            raise HTTPException(status_code=404, detail="Parent folder not found")

        # Check if trying to move into itself
        if request.parent_folder_id == folder_id:
            raise HTTPException(status_code=400, detail="Cannot move folder into itself")

        # Check if trying to move into a descendant
        def is_descendant(potential_parent_id, ancestor_id):
            parent = db.query(NoteFolders).filter(NoteFolders.id == potential_parent_id).first()
            if not parent:
                return False
            if parent.parent_folder_id == ancestor_id:
                return True
            if parent.parent_folder_id is not None:
                return is_descendant(parent.parent_folder_id, ancestor_id)
            return False

        if is_descendant(request.parent_folder_id, folder_id):
            raise HTTPException(status_code=400, detail="Cannot move folder into its own descendant")

    folder.parent_folder_id = request.parent_folder_id
    db.commit()
    db.refresh(folder)

    return {"message": "Folder moved successfully", "folder": folder}

class UpdatePositionRequest(BaseModel):
    grid_position: int

@router.patch("/{folder_id}/position")
async def update_folder_position(folder_id: int, request: UpdatePositionRequest, db: db_dependency):
    """Update the grid position of a folder for drag-and-drop ordering"""
    folder = db.query(NoteFolders).filter(NoteFolders.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    folder.grid_position = request.grid_position
    db.commit()
    db.refresh(folder)

    return {"message": "Position updated successfully", "grid_position": folder.grid_position}

class CopyFolderRequest(BaseModel):
    target_notebook_id: int
    user_id: int

def copy_folder_recursive(source_folder_id: int, target_notebook_id: int, user_id: int,
                          parent_folder_id: Optional[int], db: Session) -> NoteFolders:
    """Recursively copy a folder with all its subfolders and notes"""
    # Get the source folder
    source_folder = db.query(NoteFolders).filter(NoteFolders.id == source_folder_id).first()
    if not source_folder:
        return None

    # Create new folder in target notebook
    new_folder = NoteFolders(
        notebook_id=target_notebook_id,
        user_id=user_id,
        name=source_folder.name,
        parent_folder_id=parent_folder_id,
        created_at=datetime.now()
    )
    db.add(new_folder)
    db.commit()
    db.refresh(new_folder)

    # Copy all notes directly in this folder
    notes_in_folder = db.query(Notes).filter(Notes.folder_id == source_folder_id).all()
    for note in notes_in_folder:
        # Create a copy of each note
        new_note = Notes(
            user_id=user_id,
            notebook_id=target_notebook_id,
            folder_id=new_folder.id,
            title=note.title,
            content=note.content,
            type=note.type,
            is_shared=False,  # New copy starts as not shared
            grid_position=None,
            is_pinned=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(new_note)
        db.commit()

    # Recursively copy all subfolders
    subfolders = db.query(NoteFolders).filter(NoteFolders.parent_folder_id == source_folder_id).all()
    for subfolder in subfolders:
        copy_folder_recursive(subfolder.id, target_notebook_id, user_id, new_folder.id, db)

    return new_folder

@router.post("/{folder_id}/copy", response_model=FolderOut)
async def copy_folder(folder_id: int, request: CopyFolderRequest, db: db_dependency):
    """Copy a folder and all its notes and subfolders to another notebook"""
    try:
        new_folder = copy_folder_recursive(
            folder_id,
            request.target_notebook_id,
            request.user_id,
            None,  # Copy to root level
            db
        )

        if not new_folder:
            raise HTTPException(status_code=404, detail="Folder not found")

        return new_folder
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error copying folder: {str(e)}")
