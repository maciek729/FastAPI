from datetime import datetime
from typing import Annotated, List, Optional, Type
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import SessionLocal
from models import NoteFolders, TestFolders, FlashcardSetFolders, Notes, Tests, FlashcardSets, TestQuestions, Flashcards

router = APIRouter(
    prefix="/folders",
    tags=["folders"]
)

# --- DB dependency ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]

# --- FOLDER TYPE MAPPING ---
FOLDER_MODELS = {
    "notes": NoteFolders,
    "tests": TestFolders,
    "flashcards": FlashcardSetFolders
}

ITEM_MODELS = {
    "notes": Notes,
    "tests": Tests,
    "flashcards": FlashcardSets
}

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

class MoveItemToFolderRequest(BaseModel):
    item_id: Optional[int] = None
    note_id: Optional[int] = None  # For backwards compatibility
    test_id: Optional[int] = None  # For backwards compatibility
    set_id: Optional[int] = None   # For backwards compatibility
    folder_id: Optional[int] = None

    def get_item_id(self) -> Optional[int]:
        """Get the item ID from any of the possible fields"""
        return self.item_id or self.note_id or self.test_id or self.set_id

class MoveFolderRequest(BaseModel):
    parent_folder_id: Optional[int]

class UpdatePositionRequest(BaseModel):
    grid_position: int

class CopyFolderRequest(BaseModel):
    target_notebook_id: int
    user_id: int

# --- HELPER FUNCTIONS ---

def get_folder_model(folder_type: str) -> Type:
    """Get the folder model class based on type"""
    if folder_type not in FOLDER_MODELS:
        raise HTTPException(status_code=400, detail=f"Invalid folder type. Must be one of: {', '.join(FOLDER_MODELS.keys())}")
    return FOLDER_MODELS[folder_type]

def get_item_model(folder_type: str) -> Type:
    """Get the item model class based on type"""
    if folder_type not in ITEM_MODELS:
        raise HTTPException(status_code=400, detail=f"Invalid folder type. Must be one of: {', '.join(ITEM_MODELS.keys())}")
    return ITEM_MODELS[folder_type]

def is_descendant(db: Session, folder_model: Type, potential_parent_id: int, ancestor_id: int) -> bool:
    """Check if potential_parent_id is a descendant of ancestor_id"""
    parent = db.query(folder_model).filter(folder_model.id == potential_parent_id).first()
    if not parent:
        return False
    if parent.parent_folder_id == ancestor_id:
        return True
    if parent.parent_folder_id is not None:
        return is_descendant(db, folder_model, parent.parent_folder_id, ancestor_id)
    return False

# --- ENDPOINTS ---

@router.post("/{folder_type}/create", response_model=FolderOut, status_code=status.HTTP_201_CREATED)
async def create_folder(
    folder_type: str,
    folder: FolderCreate,
    db: db_dependency
):
    """Create a new folder (notes, tests, or flashcards)"""
    FolderModel = get_folder_model(folder_type)

    new_folder = FolderModel(
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

@router.get("/{folder_type}/list", response_model=List[FolderOut])
async def list_folders(
    folder_type: str,
    notebook_id: int,
    user_id: int,
    db: db_dependency
):
    """Get all folders for a specific notebook"""
    FolderModel = get_folder_model(folder_type)

    folders = db.query(FolderModel).filter(
        FolderModel.notebook_id == notebook_id,
        FolderModel.user_id == user_id
    ).order_by(FolderModel.grid_position.asc().nullsfirst(), FolderModel.created_at.desc()).all()
    return folders

@router.patch("/{folder_type}/{folder_id}/rename")
async def rename_folder(
    folder_type: str,
    folder_id: int,
    request: FolderUpdate,
    db: db_dependency
):
    """Rename a folder"""
    FolderModel = get_folder_model(folder_type)

    folder = db.query(FolderModel).filter(FolderModel.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    folder.name = request.name
    db.commit()
    db.refresh(folder)

    return {"message": "Folder renamed successfully", "folder": folder}

@router.delete("/{folder_type}/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_folder(
    folder_type: str,
    folder_id: int,
    db: db_dependency
):
    """Delete a folder and move its contents to root"""
    FolderModel = get_folder_model(folder_type)
    ItemModel = get_item_model(folder_type)

    folder = db.query(FolderModel).filter(FolderModel.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    # Move all items in this folder to root (folder_id = None)
    db.query(ItemModel).filter(ItemModel.folder_id == folder_id).update({"folder_id": None})

    # Move all subfolders to root
    db.query(FolderModel).filter(FolderModel.parent_folder_id == folder_id).update({"parent_folder_id": None})

    # Delete the folder
    db.delete(folder)
    db.commit()

    return {"message": "Folder deleted successfully"}

@router.post("/{folder_type}/move-item")
async def move_item_to_folder(
    folder_type: str,
    request: MoveItemToFolderRequest,
    db: db_dependency
):
    """Move an item (note/test/flashcard) into or out of a folder"""
    print(f"[DEBUG] Move item request: folder_type={folder_type}, request={request.dict()}")

    ItemModel = get_item_model(folder_type)

    item_id = request.get_item_id()
    print(f"[DEBUG] Extracted item_id: {item_id}")

    if not item_id:
        raise HTTPException(status_code=400, detail=f"Item ID is required. Received: {request.dict()}")

    item = db.query(ItemModel).filter(ItemModel.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"Item not found with id={item_id}")

    print(f"[DEBUG] Moving item {item_id} to folder {request.folder_id}")
    item.folder_id = request.folder_id
    db.commit()
    db.refresh(item)
    print(f"[DEBUG] Item moved successfully. New folder_id: {item.folder_id}")

    item_name = folder_type.rstrip('s')  # "notes" -> "note"
    return {"message": f"{item_name.capitalize()} moved successfully", f"{item_name}": item}

@router.patch("/{folder_type}/{folder_id}/move")
async def move_folder(
    folder_type: str,
    folder_id: int,
    request: MoveFolderRequest,
    db: db_dependency
):
    """Move a folder to a different parent folder or to root"""
    print(f"[DEBUG] Move folder request: folder_type={folder_type}, folder_id={folder_id}, parent_folder_id={request.parent_folder_id}")

    FolderModel = get_folder_model(folder_type)

    folder = db.query(FolderModel).filter(FolderModel.id == folder_id).first()
    if not folder:
        print(f"[DEBUG] Folder not found: {folder_id}")
        raise HTTPException(status_code=404, detail="Folder not found")

    print(f"[DEBUG] Current folder parent: {folder.parent_folder_id}")

    # Prevent moving a folder into itself or its own descendants
    if request.parent_folder_id is not None:
        current_parent = db.query(FolderModel).filter(FolderModel.id == request.parent_folder_id).first()
        if not current_parent:
            print(f"[DEBUG] Parent folder not found: {request.parent_folder_id}")
            raise HTTPException(status_code=404, detail="Parent folder not found")

        # Check if trying to move into itself
        if request.parent_folder_id == folder_id:
            print(f"[DEBUG] Cannot move folder into itself")
            raise HTTPException(status_code=400, detail="Cannot move folder into itself")

        # Check if trying to move into a descendant
        if is_descendant(db, FolderModel, request.parent_folder_id, folder_id):
            print(f"[DEBUG] Cannot move folder into its own descendant")
            raise HTTPException(status_code=400, detail="Cannot move folder into its own descendant")

    print(f"[DEBUG] Moving folder {folder_id} to parent {request.parent_folder_id}")
    folder.parent_folder_id = request.parent_folder_id
    db.commit()
    db.refresh(folder)
    print(f"[DEBUG] Folder moved successfully. New parent: {folder.parent_folder_id}")

    return {"message": "Folder moved successfully", "folder": folder}

@router.patch("/{folder_type}/{folder_id}/position")
async def update_folder_position(
    folder_type: str,
    folder_id: int,
    request: UpdatePositionRequest,
    db: db_dependency
):
    """Update the grid position of a folder for drag-and-drop ordering"""
    FolderModel = get_folder_model(folder_type)

    folder = db.query(FolderModel).filter(FolderModel.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    folder.grid_position = request.grid_position
    db.commit()
    db.refresh(folder)

    return {"message": "Position updated successfully", "grid_position": folder.grid_position}

# --- COPY FOLDER FUNCTIONS ---

def copy_folder_recursive_notes(
    source_folder_id: int,
    target_notebook_id: int,
    user_id: int,
    parent_folder_id: Optional[int],
    db: Session
) -> NoteFolders:
    """Recursively copy a note folder with all its subfolders and notes"""
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
        new_note = Notes(
            user_id=user_id,
            notebook_id=target_notebook_id,
            folder_id=new_folder.id,
            title=note.title,
            content=note.content,
            type=note.type,
            is_shared=False,
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
        copy_folder_recursive_notes(subfolder.id, target_notebook_id, user_id, new_folder.id, db)

    return new_folder

def copy_folder_recursive_tests(
    source_folder_id: int,
    target_notebook_id: int,
    user_id: int,
    parent_folder_id: Optional[int],
    db: Session
) -> TestFolders:
    """Recursively copy a test folder with all its subfolders and tests"""
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
        new_test = Tests(
            user_id=user_id,
            notebook_id=target_notebook_id,
            folder_id=new_folder.id,
            title=test.title,
            topic=test.topic,
            source_type=test.source_type,
            note_id=None,
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
        copy_folder_recursive_tests(subfolder.id, target_notebook_id, user_id, new_folder.id, db)

    return new_folder

def copy_folder_recursive_flashcards(
    source_folder_id: int,
    target_notebook_id: int,
    user_id: int,
    parent_folder_id: Optional[int],
    db: Session
) -> FlashcardSetFolders:
    """Recursively copy a flashcard folder with all its subfolders and sets"""
    original_folder = db.query(FlashcardSetFolders).filter(FlashcardSetFolders.id == source_folder_id).first()
    if not original_folder:
        return None

    # Create new folder in target notebook
    new_folder = FlashcardSetFolders(
        notebook_id=target_notebook_id,
        user_id=user_id,
        name=original_folder.name,
        parent_folder_id=parent_folder_id,
        grid_position=None,
        created_at=datetime.now()
    )
    db.add(new_folder)
    db.commit()
    db.refresh(new_folder)

    # Copy all flashcard sets in this folder
    sets_in_folder = db.query(FlashcardSets).filter(FlashcardSets.folder_id == source_folder_id).all()
    for original_set in sets_in_folder:
        # Create new note
        new_note = Notes(
            user_id=user_id,
            notebook_id=target_notebook_id,
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
            user_id=user_id,
            notebook_id=target_notebook_id,
            folder_id=new_folder.id,
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

    # Recursively copy all subfolders
    subfolders = db.query(FlashcardSetFolders).filter(FlashcardSetFolders.parent_folder_id == source_folder_id).all()
    for subfolder in subfolders:
        copy_folder_recursive_flashcards(subfolder.id, target_notebook_id, user_id, new_folder.id, db)

    return new_folder

@router.post("/{folder_type}/{folder_id}/copy", response_model=FolderOut)
async def copy_folder(
    folder_type: str,
    folder_id: int,
    request: CopyFolderRequest,
    db: db_dependency
):
    """Copy a folder and all its contents to another notebook"""
    try:
        if folder_type == "notes":
            new_folder = copy_folder_recursive_notes(folder_id, request.target_notebook_id, request.user_id, None, db)
        elif folder_type == "tests":
            new_folder = copy_folder_recursive_tests(folder_id, request.target_notebook_id, request.user_id, None, db)
        elif folder_type == "flashcards":
            new_folder = copy_folder_recursive_flashcards(folder_id, request.target_notebook_id, request.user_id, None, db)
        else:
            raise HTTPException(status_code=400, detail="Invalid folder type")

        if not new_folder:
            raise HTTPException(status_code=404, detail="Folder not found")

        return new_folder
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error copying folder: {str(e)}")
