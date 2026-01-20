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


@router.post("/create", status_code=status.HTTP_201_CREATED, response_model=NotebookOut)
def create_notebook(request: CreateNotebookRequest, db: db_dependency):
    # Allow multiple notebooks with the same name — uniqueness is not enforced.

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
        collaborations = db.query(NotebookCollaborator).filter(
            NotebookCollaborator.user_id == created_by
        ).all()
        
        notebook_ids = [collab.notebook_id for collab in collaborations]
        
        notebooks = db.query(Notebooks).filter(
            Notebooks.space_type == "shared",
            or_(
                Notebooks.created_by == created_by, 
                Notebooks.id.in_(notebook_ids) if notebook_ids else False 
            )
        ).all()
    else:
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
    from models import (
        NoteFolders, TestFolders, FlashcardSets, Flashcards, FlashcardReviews,
        FlashcardSetFolders, PodcastFolders, Podcasts, NotebookMessages, Notifications,
        Tests, TestQuestions, UserAnswers, NotebookCollaborator, Notes, ChatReadStatus, StudyFiles
    )

    try:
        db.query(Notifications).filter(Notifications.notebook_id == notebook_id).delete(synchronize_session=False)
        db.query(NotebookMessages).filter(NotebookMessages.notebook_id == notebook_id).delete(synchronize_session=False)

        # remove any chat read status entries for this notebook
        db.query(ChatReadStatus).filter(ChatReadStatus.notebook_id == notebook_id).delete(synchronize_session=False)

        # remove study files attached to this notebook
        db.query(StudyFiles).filter(StudyFiles.notebook_id == notebook_id).delete(synchronize_session=False)

        db.query(Podcasts).filter(Podcasts.notebook_id == notebook_id).delete(synchronize_session=False)
        db.query(PodcastFolders).filter(PodcastFolders.notebook_id == notebook_id).delete(synchronize_session=False)

        # Delete tests -> test_questions -> user_answers (in correct order to avoid FK violations)
        test_ids_subq = db.query(Tests.id).filter(Tests.notebook_id == notebook_id).subquery()
        test_question_ids_subq = db.query(TestQuestions.id).filter(TestQuestions.test_id.in_(test_ids_subq)).subquery()
        # delete user answers referencing test questions
        db.query(UserAnswers).filter(UserAnswers.test_question_id.in_(test_question_ids_subq)).delete(synchronize_session=False)
        # delete test questions
        db.query(TestQuestions).filter(TestQuestions.test_id.in_(test_ids_subq)).delete(synchronize_session=False)
        # delete tests and test folders
        db.query(Tests).filter(Tests.notebook_id == notebook_id).delete(synchronize_session=False)
        db.query(TestFolders).filter(TestFolders.notebook_id == notebook_id).delete(synchronize_session=False)
        
        flashcard_sets_subquery = db.query(FlashcardSets.id).filter(FlashcardSets.notebook_id == notebook_id)
        
        flashcards_subquery = db.query(Flashcards.id).filter(Flashcards.flashcard_set_id.in_(flashcard_sets_subquery))
        
        db.query(FlashcardReviews).filter(FlashcardReviews.flashcard_id.in_(flashcards_subquery)).delete(synchronize_session=False)
        
        db.query(Flashcards).filter(Flashcards.flashcard_set_id.in_(flashcard_sets_subquery)).delete(synchronize_session=False)
        
        db.query(FlashcardSets).filter(FlashcardSets.notebook_id == notebook_id).delete(synchronize_session=False)
        db.query(FlashcardSetFolders).filter(FlashcardSetFolders.notebook_id == notebook_id).delete(synchronize_session=False)

        db.query(Notes).filter(Notes.notebook_id == notebook_id).delete(synchronize_session=False)
        db.query(NoteFolders).filter(NoteFolders.notebook_id == notebook_id).delete(synchronize_session=False)

        db.query(NotebookCollaborator).filter(NotebookCollaborator.notebook_id == notebook_id).delete(synchronize_session=False)

        db.delete(notebook)
        db.commit()
        return {"message": "Notebook deleted successfully"}
    except Exception as e:
        db.rollback()
        print(f"Error deleting notebook: {e}") # Pomocne logowanie błędu w konsoli serwera
        raise HTTPException(status_code=500, detail=f"Failed to delete notebook: {str(e)}")


@router.put("/{notebook_id}", response_model=NotebookOut)
def update_notebook(notebook_id: int, request: UpdateNotebookRequest, db: db_dependency):
    notebook = db.query(Notebooks).filter(Notebooks.id == notebook_id).first()
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found"
        )

    # Allow renaming to a name that may already exist; do not enforce uniqueness.

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

    return [{"id": user.id, "username": user.username, "avatar_url": user.avatar_url} for user in collaborators]