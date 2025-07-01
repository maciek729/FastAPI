from datetime import timedelta, datetime, timezone
from typing import Annotated
from click import argument
from fastapi import APIRouter, Depends, HTTPException, Request, Form # type: ignore
from pydantic import BaseModel # type: ignore
from sqlalchemy.orm import Session # type: ignore
from starlette import status # type: ignore
from database import SessionLocal
from models import Spaces
from dotenv import load_dotenv
import os
from fastapi.responses import HTMLResponse # type: ignore
import re

router = APIRouter(
    prefix='/spaces',
    tags=['spaces']
)

load_dotenv()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class SpaceResponse(BaseModel):
    id: int
    name: str
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True

class CreateSpaceRequest(BaseModel):
    name: str
    created_by: int
    created_at: datetime = datetime.now(timezone.utc)

db_dependency = Annotated[Session, Depends(get_db)]
@router.post("/create", status_code=status.HTTP_201_CREATED)
def create_space(request: CreateSpaceRequest, db: db_dependency):
    existing_space = db.query(Spaces).filter(Spaces.name == request.name).first()
    if existing_space:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Space with this name already exists."
        )
    new_space = Spaces(
        name=request.name,
        created_by=request.created_by,
        created_at=request.created_at
    )
    db.add(new_space)
    db.commit()
    db.refresh(new_space)
    return {"message": "Space created successfully", "space_id": new_space.id}

@router.get("/list", response_model=list[SpaceResponse])
def list_spaces(created_by: int, db: db_dependency):
    spaces = db.query(Spaces).filter(Spaces.created_by == created_by).all()
    return spaces

@router.get("/{space_id}", response_model=SpaceResponse)
def get_space(space_id: int, db: db_dependency):
    space = db.query(Spaces).filter(Spaces.id == space_id).first()
    if not space:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Space not found"
        )
    return space

@router.delete("/{space_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_space(space_id: int, db: db_dependency):
    space = db.query(Spaces).filter(Spaces.id == space_id).first()
    if not space:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Space not found"
        )
    
    db.delete(space)
    db.commit()
    
    return {"message": "Space deleted successfully"}

@router.put("/{space_id}", response_model=SpaceResponse)
def update_space(space_id: int, request: SpaceResponse, db: db_dependency):
    space = db.query(Spaces).filter(Spaces.id == space_id).first()
    if not space:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Space not found"
        )
    
    '''if not re.match(r'^[a-zA-Z0-9_]+$', request.name):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Space name can only contain alphanumeric characters and underscores."
        )'''
    
    existing_space = db.query(Spaces).filter(Spaces.name == request.name, Spaces.id != space_id).first()
    if existing_space:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Space with this name already exists."
        )
    
    space.name = request.name
    space.created_by = request.created_by
    space.created_at = request.created_at
    
    db.commit()
    db.refresh(space)
    
    return space

