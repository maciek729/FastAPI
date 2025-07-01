from datetime import datetime, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Notebooks
from dotenv import load_dotenv

router = APIRouter(
    prefix='/notebooks',
    tags=['notebooks']
)

load_dotenv()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class CreateNotebookRequest(BaseModel):
    name: str
    created_by: int
    created_at: datetime = datetime.now(timezone.utc)
    space_id: int  

db_dependency = Annotated[Session, Depends(get_db)]

@router.post("/create", status_code=status.HTTP_201_CREATED)
def create_notebook(request: CreateNotebookRequest, db: db_dependency):
    existing_notebook = db.query(Notebooks).filter(Notebooks.name == request.name, Notebooks.space_id == request.space_id).first()
    if existing_notebook:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notebook with this name already exists in this space."
        )
    new_notebook = Notebooks(
        name=request.name,
        created_by=request.created_by,
        created_at=request.created_at,
        space_id=request.space_id  
    )
    db.add(new_notebook)
    db.commit()
    db.refresh(new_notebook)
    return {"message": "Notebook created successfully", "notebook_id": new_notebook.id}

@router.get("/list", response_model=list[CreateNotebookRequest])
def list_notebooks(space_id: int, db: db_dependency):
    notebooks = db.query(Notebooks).filter(Notebooks.space_id == space_id)
    return notebooks.all()

@router.get("/{notebook_id}", response_model=CreateNotebookRequest)
def get_notebook(notebook_id: int, db: db_dependency):
    notebook = db.query(Notebooks).filter(Notebooks.id == notebook_id).first()
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found"
        )
    return notebook

@router.delete("/{notebook_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notebook(notebook_id: int, db: db_dependency):
    notebook = db.query(Notebooks).filter(Notebooks.id == notebook_id).first()
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found"
        )
    db.delete(notebook)
    db.commit()
    return {"message": "Notebook deleted successfully"}

@router.put("/{notebook_id}", response_model=CreateNotebookRequest)
def update_notebook(notebook_id: int, request: CreateNotebookRequest, db: db_dependency):
    notebook = db.query(Notebooks).filter(Notebooks.id == notebook_id).first()
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found"
        )
    existing_notebook = db.query(Notebooks).filter(Notebooks.name == request.name, Notebooks.id != notebook_id).first()
    if existing_notebook:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notebook with this name already exists."
        )
    notebook.name = request.name
    notebook.created_by = request.created_by
    notebook.created_at = request.created_at
    db.commit()
    db.refresh(notebook)
    return notebook