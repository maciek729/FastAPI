from datetime import datetime
from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import SessionLocal
from models import TestFolders, Tests, TestQuestions

router = APIRouter(
    prefix="/test-folders",
    tags=["test_folders"]
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

class MoveTestToFolderRequest(BaseModel):
    test_id: int
    folder_id: Optional[int]  # None means move to root

# --- ENDPOINTS ---

@router.post("/create", response_model=FolderOut, status_code=status.HTTP_201_CREATED)
async def create_folder(folder: FolderCreate, db: db_dependency):
    """Create a new test folder"""
    new_folder = TestFolders(
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
    folders = db.query(TestFolders).filter(
        TestFolders.notebook_id == notebook_id,
        TestFolders.user_id == user_id
    ).order_by(TestFolders.grid_position.asc().nullsfirst(), TestFolders.created_at.desc()).all()
    return folders

@router.patch("/{folder_id}/rename")
async def rename_folder(folder_id: int, request: FolderUpdate, db: db_dependency):
    """Rename a folder"""
    folder = db.query(TestFolders).filter(TestFolders.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    folder.name = request.name
    db.commit()
    db.refresh(folder)

    return {"message": "Folder renamed successfully", "folder": folder}

@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_folder(folder_id: int, db: db_dependency):
    """Delete a folder and move its contents to root"""
    folder = db.query(TestFolders).filter(TestFolders.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    # Move all tests in this folder to root (folder_id = None)
    db.query(Tests).filter(Tests.folder_id == folder_id).update({"folder_id": None})

    # Move all subfolders to root
    db.query(TestFolders).filter(TestFolders.parent_folder_id == folder_id).update({"parent_folder_id": None})

    # Delete the folder
    db.delete(folder)
    db.commit()

    return {"message": "Folder deleted successfully"}

@router.post("/move-test")
async def move_test_to_folder(request: MoveTestToFolderRequest, db: db_dependency):
    """Move a test into or out of a folder"""
    test = db.query(Tests).filter(Tests.id == request.test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    test.folder_id = request.folder_id
    db.commit()
    db.refresh(test)

    return {"message": "Test moved successfully", "test": test}

class UpdatePositionRequest(BaseModel):
    grid_position: int

@router.patch("/{folder_id}/position")
async def update_folder_position(folder_id: int, request: UpdatePositionRequest, db: db_dependency):
    """Update the grid position of a folder for drag-and-drop ordering"""
    folder = db.query(TestFolders).filter(TestFolders.id == folder_id).first()
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
                          parent_folder_id: Optional[int], db: Session) -> TestFolders:
    """Recursively copy a folder with all its subfolders and tests"""
    # Get the source folder
    source_folder = db.query(TestFolders).filter(TestFolders.id == source_folder_id).first()
    if not source_folder:
        return None

    # Create new folder in target notebook
    new_folder = TestFolders(
        notebook_id=target_notebook_id,
        user_id=user_id,
        name=source_folder.name,
        parent_folder_id=parent_folder_id,
        created_at=datetime.now()
    )
    db.add(new_folder)
    db.commit()
    db.refresh(new_folder)

    # Copy all tests directly in this folder
    tests_in_folder = db.query(Tests).filter(Tests.folder_id == source_folder_id).all()
    for test in tests_in_folder:
        # Create a copy of each test
        new_test = Tests(
            user_id=user_id,
            notebook_id=target_notebook_id,
            folder_id=new_folder.id,
            title=test.title,
            topic=test.topic,
            source_type=test.source_type,
            note_id=None,  # Don't link to original note
            created_at=datetime.now()
        )
        db.add(new_test)
        db.commit()
        db.refresh(new_test)

        # Copy all questions for this test
        questions = db.query(TestQuestions).filter(TestQuestions.test_id == test.id).all()
        for question in questions:
            new_question = TestQuestions(
                test_id=new_test.id,
                question=question.question,
                correct_answer=question.correct_answer,
                other_options=question.other_options,
                question_type=question.question_type
            )
            db.add(new_question)

        db.commit()

    # Recursively copy all subfolders
    subfolders = db.query(TestFolders).filter(TestFolders.parent_folder_id == source_folder_id).all()
    for subfolder in subfolders:
        copy_folder_recursive(subfolder.id, target_notebook_id, user_id, new_folder.id, db)

    return new_folder

@router.post("/{folder_id}/copy", response_model=FolderOut)
async def copy_folder(folder_id: int, request: CopyFolderRequest, db: db_dependency):
    """Copy a folder and all its tests and subfolders to another notebook"""
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
