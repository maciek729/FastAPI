from datetime import datetime
from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import SessionLocal
from models import FlashcardSetFolders, FlashcardSets

router = APIRouter(
    prefix="/flashcard-set-folders",
    tags=["flashcard_set_folders"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]


# ============================================
# PYDANTIC MODELS
# ============================================

class FolderCreate(BaseModel):
    notebook_id: int
    user_id: int
    name: str
    parent_folder_id: Optional[int] = None


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


class FolderRename(BaseModel):
    name: str


class FolderPositionUpdate(BaseModel):
    grid_position: int


class MoveSetToFolderRequest(BaseModel):
    set_id: int
    folder_id: Optional[int]


class MoveFolderRequest(BaseModel):
    parent_folder_id: Optional[int]  # None means move to root


class CopyFolderRequest(BaseModel):
    target_notebook_id: int
    user_id: int


# ============================================
# ENDPOINTS
# ============================================

@router.post("/create", response_model=FolderOut, status_code=status.HTTP_201_CREATED)
async def create_folder(folder: FolderCreate, db: db_dependency):
    """Create a new flashcard set folder"""
    new_folder = FlashcardSetFolders(
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
async def get_folders(notebook_id: int, user_id: int, db: db_dependency):
    """Get all flashcard set folders for a notebook"""
    folders = db.query(FlashcardSetFolders).filter(
        FlashcardSetFolders.notebook_id == notebook_id,
        FlashcardSetFolders.user_id == user_id
    ).all()
    return folders


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_folder(folder_id: int, db: db_dependency):
    """Delete a folder and move its sets to parent or root"""
    folder = db.query(FlashcardSetFolders).filter(FlashcardSetFolders.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    # Move all flashcard sets in this folder to null (root level)
    sets_in_folder = db.query(FlashcardSets).filter(FlashcardSets.folder_id == folder_id).all()
    for flashcard_set in sets_in_folder:
        flashcard_set.folder_id = None

    # Move all subfolders to parent folder
    subfolders = db.query(FlashcardSetFolders).filter(FlashcardSetFolders.parent_folder_id == folder_id).all()
    for subfolder in subfolders:
        subfolder.parent_folder_id = folder.parent_folder_id

    db.delete(folder)
    db.commit()
    return {"message": "Folder deleted successfully"}


@router.patch("/{folder_id}/rename")
async def rename_folder(folder_id: int, request: FolderRename, db: db_dependency):
    """Rename a folder"""
    folder = db.query(FlashcardSetFolders).filter(FlashcardSetFolders.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    folder.name = request.name
    db.commit()
    db.refresh(folder)
    return {"message": "Folder renamed successfully", "folder": folder}


@router.patch("/{folder_id}/move")
async def move_folder(folder_id: int, request: MoveFolderRequest, db: db_dependency):
    """Move a folder to a different parent folder or to root"""
    folder = db.query(FlashcardSetFolders).filter(FlashcardSetFolders.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    # Prevent moving a folder into itself or its own descendants
    if request.parent_folder_id is not None:
        current_parent = db.query(FlashcardSetFolders).filter(FlashcardSetFolders.id == request.parent_folder_id).first()
        if not current_parent:
            raise HTTPException(status_code=404, detail="Parent folder not found")

        # Check if trying to move into itself
        if request.parent_folder_id == folder_id:
            raise HTTPException(status_code=400, detail="Cannot move folder into itself")

        # Check if trying to move into a descendant
        def is_descendant(potential_parent_id, ancestor_id):
            parent = db.query(FlashcardSetFolders).filter(FlashcardSetFolders.id == potential_parent_id).first()
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


@router.patch("/{folder_id}/position")
async def update_folder_position(folder_id: int, request: FolderPositionUpdate, db: db_dependency):
    """Update folder grid position"""
    folder = db.query(FlashcardSetFolders).filter(FlashcardSetFolders.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    folder.grid_position = request.grid_position
    db.commit()
    db.refresh(folder)
    return {"message": "Position updated successfully"}


@router.post("/move-set")
async def move_set_to_folder(request: MoveSetToFolderRequest, db: db_dependency):
    """Move a flashcard set into or out of a folder"""
    flashcard_set = db.query(FlashcardSets).filter(FlashcardSets.id == request.set_id).first()
    if not flashcard_set:
        raise HTTPException(status_code=404, detail="Flashcard set not found")

    flashcard_set.folder_id = request.folder_id
    db.commit()
    db.refresh(flashcard_set)
    return {"message": "Flashcard set moved successfully", "set": flashcard_set}


@router.post("/{folder_id}/copy", response_model=FolderOut, status_code=status.HTTP_201_CREATED)
async def copy_folder_to_notebook(folder_id: int, request: CopyFolderRequest, db: db_dependency):
    """Copy a folder and all its flashcard sets to another notebook"""
    original_folder = db.query(FlashcardSetFolders).filter(FlashcardSetFolders.id == folder_id).first()
    if not original_folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    # Create new folder in target notebook
    new_folder = FlashcardSetFolders(
        notebook_id=request.target_notebook_id,
        user_id=request.user_id,
        name=original_folder.name,
        parent_folder_id=None,
        grid_position=None,
        created_at=datetime.now()
    )
    db.add(new_folder)
    db.commit()
    db.refresh(new_folder)

    # Copy all flashcard sets in this folder
    sets_in_folder = db.query(FlashcardSets).filter(FlashcardSets.folder_id == folder_id).all()
    for original_set in sets_in_folder:
        # Copy using the existing copy endpoint logic
        from models import Notes, Flashcards

        # Create new note
        new_note = Notes(
            user_id=request.user_id,
            notebook_id=request.target_notebook_id,
            title=original_set.title,
            content=f"Zestaw {original_set.total_cards} fiszek (kopia)",
            type="Fiszki",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            is_shared=False
        )
        db.add(new_note)
        db.commit()
        db.refresh(new_note)

        # Create new flashcard set
        new_set = FlashcardSets(
            note_id=new_note.id,
            user_id=request.user_id,
            notebook_id=request.target_notebook_id,
            folder_id=new_folder.id,  # Put in the new folder
            title=original_set.title,
            description=original_set.description,
            difficulty=original_set.difficulty,
            total_cards=original_set.total_cards,
            source_notes=original_set.source_notes,
            source_files=original_set.source_files,
            grid_position=None,
            is_pinned=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(new_set)
        db.commit()
        db.refresh(new_set)

        # Copy all flashcards
        original_flashcards = db.query(Flashcards).filter(
            Flashcards.flashcard_set_id == original_set.id
        ).order_by(Flashcards.position).all()

        for flashcard in original_flashcards:
            new_flashcard = Flashcards(
                flashcard_set_id=new_set.id,
                question=flashcard.question,
                answer=flashcard.answer,
                position=flashcard.position,
                created_at=datetime.utcnow()
            )
            db.add(new_flashcard)

    db.commit()
    db.refresh(new_folder)

    return new_folder
