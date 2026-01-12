from datetime import datetime, timezone
from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Notebooks, Notifications
from dotenv import load_dotenv
from routers.notes import NoteOut 

router = APIRouter(
    prefix="/notebooks",
    tags=["notebooks"]
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

class CreateNotebookRequest(BaseModel):
    name: str
    created_by: int
    created_at: datetime = datetime.now(timezone.utc)
    space_type: str = "personal"
    is_shared: bool = False


class UpdateNotebookRequest(BaseModel):
    name: str


class NotebookOut(BaseModel):
    id: int
    name: str
    created_by: int
    created_at: datetime
    space_type: str
    is_shared: bool
    notes: Optional[List[NoteOut]] = [] 

    model_config = {
        "from_attributes": True
    }

class AddCollaboratorRequest(BaseModel):
    username: str

# --- ENDPOINTY ---

@router.post("/create", status_code=status.HTTP_201_CREATED, response_model=NotebookOut)
def create_notebook(request: CreateNotebookRequest, db: db_dependency):
    existing_notebook = db.query(Notebooks).filter(
        Notebooks.name == request.name,
        Notebooks.created_by == request.created_by,
        Notebooks.space_type == request.space_type
    ).first()

    if existing_notebook:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notebook with this name already exists in this space."
        )

    new_notebook = Notebooks(
        name=request.name,
        created_by=request.created_by,
        created_at=request.created_at,
        space_type=request.space_type,
        is_shared=request.is_shared
    )
    db.add(new_notebook)
    db.commit()
    db.refresh(new_notebook)
    return new_notebook


@router.get("/list", response_model=list[NotebookOut])
def list_notebooks(created_by: int, space_type: str, db: db_dependency):
    from models import NotebookCollaborator
    from sqlalchemy import or_
    
    if space_type == "shared":
        # Get notebooks shared with this user (as collaborator)
        collaborations = db.query(NotebookCollaborator).filter(
            NotebookCollaborator.user_id == created_by
        ).all()
        
        notebook_ids = [collab.notebook_id for collab in collaborations]
        
        # Get both: notebooks created by user AND notebooks shared with user
        notebooks = db.query(Notebooks).filter(
            Notebooks.space_type == "shared",
            or_(
                Notebooks.created_by == created_by,  # Created by this user
                Notebooks.id.in_(notebook_ids) if notebook_ids else False  # Shared with this user
            )
        ).all()
    else:
        # Get personal notebooks created by this user
        notebooks = db.query(Notebooks).filter(
            Notebooks.created_by == created_by,
            Notebooks.space_type == space_type
        ).all()
    
    return notebooks


@router.get("/{notebook_id}", response_model=NotebookOut)
def get_notebook(notebook_id: int, db: db_dependency):
    print("=" * 50)
    print("=" * 50)
    
    notebook = db.query(Notebooks).filter(Notebooks.id == notebook_id).first()
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found"
        )
        
    return NotebookOut(
        id=notebook.id,
        name=notebook.name,
        created_by=notebook.created_by,
        created_at=notebook.created_at,
        space_type=notebook.space_type,
        is_shared=notebook.is_shared,
        notes=notebook.notes
    )


@router.delete("/{notebook_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notebook(notebook_id: int, db: db_dependency):
    notebook = db.query(Notebooks).filter(Notebooks.id == notebook_id).first()
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found"
        )
    # Clean up dependent records in other tables to avoid FK constraint errors
    from models import (
        NoteFolders, TestFolders, FlashcardSets, Flashcards, FlashcardReviews,
        FlashcardSetFolders, PodcastFolders, Podcasts, NotebookMessages, Notifications, Tests, NotebookCollaborator, Notes
    )

    try:
        # Delete notifications and messages referencing the notebook
        db.query(Notifications).filter(Notifications.notebook_id == notebook_id).delete(synchronize_session=False)
        db.query(NotebookMessages).filter(NotebookMessages.notebook_id == notebook_id).delete(synchronize_session=False)

        # Delete podcasts and their folders
        db.query(Podcasts).filter(Podcasts.notebook_id == notebook_id).delete(synchronize_session=False)
        db.query(PodcastFolders).filter(PodcastFolders.notebook_id == notebook_id).delete(synchronize_session=False)

        # Delete tests and folders
        db.query(Tests).filter(Tests.notebook_id == notebook_id).delete(synchronize_session=False)
        db.query(TestFolders).filter(TestFolders.notebook_id == notebook_id).delete(synchronize_session=False)

        # Delete flashcard reviews, flashcards and sets
        db.query(FlashcardReviews).join(Flashcards, FlashcardReviews.flashcard_id == Flashcards.id).filter(Flashcards.flashcard_set_id.in_(
            db.query(FlashcardSets.id).filter(FlashcardSets.notebook_id == notebook_id)
        )).delete(synchronize_session=False)
        db.query(Flashcards).filter(Flashcards.flashcard_set_id.in_(
            db.query(FlashcardSets.id).filter(FlashcardSets.notebook_id == notebook_id)
        )).delete(synchronize_session=False)
        db.query(FlashcardSets).filter(FlashcardSets.notebook_id == notebook_id).delete(synchronize_session=False)
        db.query(FlashcardSetFolders).filter(FlashcardSetFolders.notebook_id == notebook_id).delete(synchronize_session=False)

        # Delete note folders
        db.query(NoteFolders).filter(NoteFolders.notebook_id == notebook_id).delete(synchronize_session=False)

        # Delete collaborators (if any)
        db.query(NotebookCollaborator).filter(NotebookCollaborator.notebook_id == notebook_id).delete(synchronize_session=False)

        # Notes should be removed by the relationship cascade, but ensure no orphaned notes remain
        db.query(Notes).filter(Notes.notebook_id == notebook_id).delete(synchronize_session=False)

        # Finally delete the notebook
        db.delete(notebook)
        db.commit()
        return {"message": "Notebook deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete notebook: {str(e)}")


@router.put("/{notebook_id}", response_model=NotebookOut)
def update_notebook(notebook_id: int, request: UpdateNotebookRequest, db: db_dependency):
    notebook = db.query(Notebooks).filter(Notebooks.id == notebook_id).first()
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found"
        )

    existing_notebook = db.query(Notebooks).filter(
        Notebooks.name == request.name,
        Notebooks.id != notebook_id
    ).first()
    if existing_notebook:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notebook with this name already exists."
        )

    # Only update the fields provided for rename
    notebook.name = request.name

    db.commit()
    db.refresh(notebook)
    return notebook


@router.post("/{notebook_id}/add-collaborator")
def add_collaborator(notebook_id: int, request: AddCollaboratorRequest, db: db_dependency):
    from models import Users, NotebookCollaborator

    notebook = db.query(Notebooks).filter(Notebooks.id == notebook_id).first()
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")

    # Check if notebook is in shared space
    if notebook.space_type != "shared":
        raise HTTPException(status_code=400, detail="Only shared notebooks can have collaborators")

    user = db.query(Users).filter(Users.username == request.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent adding the owner as collaborator
    if user.id == notebook.created_by:
        raise HTTPException(status_code=400, detail="Cannot add notebook owner as collaborator")

    existing = db.query(NotebookCollaborator).filter(
        NotebookCollaborator.notebook_id == notebook_id,
        NotebookCollaborator.user_id == user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already has access to this notebook")

    collaborator = NotebookCollaborator(notebook_id=notebook_id, user_id=user.id)
    db.add(collaborator)
    sender_id = notebook.created_by
    new_notif = Notifications(
        user_id=user.id,
        sender_id=sender_id,
        content=f"Dodał Cię do notatnika: {notebook.name}", 
        type="info",                   
        redirect_type="notebook",
        notebook_id=notebook.id,       
        tab_target="files",            
        is_read=False,
        created_at=datetime.utcnow()
    )
    db.add(new_notif)
    db.commit()
    return {"message": f"User {user.username} added successfully"}


@router.delete("/{notebook_id}/collaborator/{user_id}")
def remove_collaborator(notebook_id: int, user_id: int, db: db_dependency):
    from models import NotebookCollaborator

    notebook = db.query(Notebooks).filter(Notebooks.id == notebook_id).first()
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")

    collaborator = db.query(NotebookCollaborator).filter(
        NotebookCollaborator.notebook_id == notebook_id,
        NotebookCollaborator.user_id == user_id
    ).first()
    
    if not collaborator:
        raise HTTPException(status_code=404, detail="Collaborator not found")

    sender_id = notebook.created_by
    new_notif = Notifications(
        user_id=user_id,
        sender_id=sender_id,
        content=f"Usunął Cię z notatnika: {notebook.name}", 
        type="warning",                
        redirect_type="none",
        notebook_id=None,
        tab_target=None,
        is_read=False,
        created_at=datetime.utcnow()
    )
    db.add(new_notif)
    db.delete(collaborator)
    db.commit()
    return {"message": "Collaborator removed successfully"}


@router.get("/{notebook_id}/collaborators")
def get_collaborators(notebook_id: int, db: db_dependency):
    from models import Users, NotebookCollaborator

    notebook = db.query(Notebooks).filter(Notebooks.id == notebook_id).first()
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")

    collaborators = db.query(Users).join(
        NotebookCollaborator,
        Users.id == NotebookCollaborator.user_id
    ).filter(
        NotebookCollaborator.notebook_id == notebook_id
    ).all()

    return [{"id": user.id, "username": user.username} for user in collaborators]