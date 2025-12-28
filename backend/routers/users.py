from typing import Annotated
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from supabase import create_client, Client
from starlette import status
from models import Users
from database import SessionLocal
from .auth import get_current_user
from passlib.context import CryptContext
import os
import uuid

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL else None

router = APIRouter(
    prefix='/user',
    tags=['user']
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]
bcrypt_context = CryptContext(schemes=['bcrypt'], deprecated='auto')


class UserVerification(BaseModel):
    password: str
    new_password: str = Field(min_length=6)


@router.get('/', status_code=status.HTTP_200_OK)
async def get_user(user: user_dependency, db: db_dependency):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    return db.query(Users).filter(Users.id == user.get('id')).first()


@router.put("/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(user: user_dependency, db: db_dependency,
                          user_verification: UserVerification):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    user_model = db.query(Users).filter(Users.id == user.get('id')).first()

    if not bcrypt_context.verify(user_verification.password, user_model.hashed_password):
        raise HTTPException(status_code=401, detail='Error on password change')
    user_model.hashed_password = bcrypt_context.hash(user_verification.new_password)
    db.add(user_model)
    db.commit()


@router.put("/phonenumber/{phone_number}", status_code=status.HTTP_204_NO_CONTENT)
async def change_phonenumber(user: user_dependency, db: db_dependency,
                          phone_number: str):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    user_model = db.query(Users).filter(Users.id == user.get('id')).first()
    user_model.phone_number = phone_number
    db.add(user_model)
    db.commit()

@router.get("/check-availability/{username}", status_code=status.HTTP_200_OK)
async def check_username_availability(username: str, db: db_dependency):
    user_exists = db.query(Users).filter(Users.username == username).first()

    if user_exists:
        return {"available": False, "message": "Nazwa użytkownika jest zajęta."}
    
    return {"available": True, "message": "Nazwa użytkownika jest dostępna."}

@router.put("/username/{username}", status_code=status.HTTP_204_NO_CONTENT)
async def change_username(user: user_dependency, db: db_dependency, username: str):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')

    existing_user = db.query(Users).filter(Users.username == username).first()
    
    if existing_user and existing_user.id != user.get('id'):
        raise HTTPException(status_code=400, detail='Nazwa użytkownika jest już zajęta')

    user_model = db.query(Users).filter(Users.id == user.get('id')).first()
    
    if user_model is None:
        raise HTTPException(status_code=404, detail='User not found')

    user_model.username = username
    db.add(user_model)
    db.commit()


@router.post("/avatar", status_code=status.HTTP_200_OK)
async def upload_avatar(
    user: user_dependency, 
    db: db_dependency, 
    file: UploadFile = File(...)
):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    if not supabase:
        raise HTTPException(status_code=500, detail="Storage service not configured")

    if file.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG/PNG allowed.")

    file_extension = file.filename.split(".")[-1]
    filename = f"{user.get('id')}_{uuid.uuid4()}.{file_extension}"
    storage_path = f"avatars/{filename}"

    try:
        contents = await file.read()
        
        bucket_name = "pictures" 
        
        supabase.storage.from_(bucket_name).upload(
            path=storage_path,
            file=contents,
            file_options={"content-type": file.content_type}
        )

        public_url = supabase.storage.from_(bucket_name).get_public_url(storage_path)

        user_model = db.query(Users).filter(Users.id == user.get('id')).first()
        
        if user_model.avatar_url:
            try:
                old_path = user_model.avatar_url.split(f"{bucket_name}/")[-1]
                supabase.storage.from_(bucket_name).remove([old_path])
            except:
                pass
        user_model.avatar_url = public_url
        db.add(user_model)
        db.commit()

        return {"avatar_url": public_url}

    except Exception as e:
        print(f"Avatar Upload Error: {e}")
        raise HTTPException(status_code=500, detail="Błąd podczas zapisywania zdjęcia")
        
@router.delete("/avatar", status_code=status.HTTP_204_NO_CONTENT)
async def delete_avatar(user: user_dependency, db: db_dependency):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    user_model = db.query(Users).filter(Users.id == user.get('id')).first()
    
    if not user_model.avatar_url:
        raise HTTPException(status_code=404, detail="Użytkownik nie posiada zdjęcia profilowego")

    try:
        bucket_name = "pictures"
        file_path = user_model.avatar_url.split(f"{bucket_name}/")[-1]

        supabase.storage.from_(bucket_name).remove([file_path])

        user_model.avatar_url = None
        db.add(user_model)
        db.commit()

        return None

    except Exception as e:
        print(f"Error deleting avatar: {e}")
        raise HTTPException(status_code=500, detail="Błąd podczas usuwania pliku z magazynu")

@router.delete("/delete-account", status_code=status.HTTP_204_NO_CONTENT)
async def archive_user_account(user: user_dependency, db: db_dependency):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')

    user_model = db.query(Users).filter(Users.id == user.get('id')).first()

    if user_model is None:
        raise HTTPException(status_code=404, detail='User not found')

    user_model.is_archived = True
    user_model.is_active = False

    db.add(user_model)
    db.commit()
    return None