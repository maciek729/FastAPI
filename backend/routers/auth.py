from datetime import timedelta, datetime, timezone
from typing import Annotated
from click import argument
from fastapi import APIRouter, Depends, HTTPException, Request, Form # type: ignore
from pydantic import BaseModel # type: ignore
from sqlalchemy.orm import Session # type: ignore
from starlette import status # type: ignore
from database import SessionLocal
from models import Users, Notebooks
from passlib.context import CryptContext # type: ignore
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer    # type: ignore
from jose import jwt, JWTError # type: ignore
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig # type: ignore
import secrets
from pydantic import EmailStr, SecretStr # type: ignore
from dotenv import load_dotenv
import os
from fastapi.responses import HTMLResponse # type: ignore
import re

load_dotenv()

router = APIRouter(
    prefix='/auth',
    tags=['auth']
)

SECRET_KEY = '197b2c37c391bed93fe80344fe73b806947a65e36206e05a1a23c2fa12702fe3'
ALGORITHM = 'HS256'

bcrypt_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
oauth2_bearer = OAuth2PasswordBearer(tokenUrl='auth/token')

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=SecretStr(os.getenv("MAIL_PASSWORD")),
    MAIL_FROM=os.getenv("MAIL_FROM"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 465)),
    MAIL_SERVER=os.getenv("MAIL_SERVER"),
    MAIL_STARTTLS=False,
    MAIL_SSL_TLS=True,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=False
)


class CreateUserRequest(BaseModel):
    username: str
    email: str
    password: str
    role: str


class Token(BaseModel):
    access_token: str
    token_type: str

class ResetPassword(BaseModel):
    token: str
    new_password: str

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]


### Endpoints ##
def authenticate_user(identifier: str, password: str, db):
    if re.match(r"[^@]+@[^@]+\.[^@]+", identifier):
        user = db.query(Users).filter(Users.email == identifier).first()
    else:
        user = db.query(Users).filter(Users.username == identifier).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    if not bcrypt_context.verify(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in"
        )
    
    if getattr(user, 'is_archived', False) is True:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="To konto zostało zarchiwizowane. Skontaktuj się z administratorem."
        )

    return user


def create_access_token(username: str, user_id: int, role: str, expires_delta: timedelta):
    encode = {'sub': username, 'id': user_id, 'role': role}
    expires = datetime.now(timezone.utc) + expires_delta
    encode.update({'exp': expires})
    return jwt.encode(encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(token: Annotated[str, Depends(oauth2_bearer)]):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get('sub')
        user_id: int = payload.get('id')
        user_role: str = payload.get('role')
        if username is None or user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail='Could not validate user.')
        return {'username': username, 'id': user_id, 'user_role': user_role}
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail='Could not validate user.')

async def send_verification_email(email: EmailStr, token: str, base_url:str):
    # verify_link = f"http://localhost:8000/auth/verify?token={token}"
    verify_link = f"{base_url}auth/verify?token={token}"
    message = MessageSchema(
        subject="Email Verification",
        recipients=[email],
        body=f"Click to verify: {verify_link}",
        subtype="plain"
    )
    fm = FastMail(conf)
    await fm.send_message(message)


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_user(db: db_dependency,
                      create_user_request: CreateUserRequest, request: Request):
    frontend_url = request.headers.get('origin')

    if not frontend_url:
        backend_url = str(request.base_url)
        if "localhost" in backend_url or "127.0.0.1" in backend_url:
            frontend_url = "http://localhost:5173"
        else:
            frontend_url = "https://zdaito.pl"

    if not frontend_url.endswith('/'):
        frontend_url += "/"

    token = secrets.token_urlsafe(32)
    # base_url = str(request.base_url)
    thisEmail = create_user_request.email
    create_user_model = Users(
        email=thisEmail,
        username=create_user_request.username,
        role=create_user_request.role,
        hashed_password=bcrypt_context.hash(create_user_request.password),
        is_active=True,
        is_verified=False,
        verification_token = token
    )

    db.add(create_user_model)
    db.commit()
    db.refresh(create_user_model)

    # Create two demo notebooks: one personal and one shared
    personal_notebook = Notebooks(
        name="Let's start",
        created_by=create_user_model.id,
        created_at=datetime.now(timezone.utc),
        space_type="personal",
        is_shared=False
    )

    shared_notebook = Notebooks(
        name="Let's start",
        created_by=create_user_model.id,
        created_at=datetime.now(timezone.utc),
        space_type="shared",
        is_shared=True
    )

    db.add(personal_notebook)
    db.add(shared_notebook)
    db.commit()

    await send_verification_email(thisEmail, token, frontend_url)


@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
                                 db: db_dependency):
    user = authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail='Could not validate user.')
    token = create_access_token(user.username, user.id, user.role, timedelta(minutes=20))

    return {'access_token': token, 'token_type': 'bearer'}


@router.get("/verify")
async def verify_email(token: str, db: Session = Depends(get_db)):
    user = db.query(Users).filter(Users.verification_token == token).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token"
        )

    user.is_verified = True
    user.verification_token = None
    db.commit()

    return {"message": "Email successfully verified", "success": True}


class ResetPasswordRequest(BaseModel):
    email: EmailStr

async def send_reset_password_email(email: EmailStr, token: str, base_url: str):
    reset_link = f"{base_url}reset-password/{token}"
    message = MessageSchema(
        subject="Reset Hasła - ZdAI to!",
        recipients=[email],
        body=f"Kliknij tutaj, aby zresetować hasło: {reset_link}",
        subtype="plain"
    )
    fm = FastMail(conf)
    await fm.send_message(message)

@router.post("/forgot-password")
async def forgot_password(
    request: Request,
    email: str = Form(...),
    db: Session = Depends(get_db)
):
    user = db.query(Users).filter(Users.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not found")

    frontend_url = request.headers.get('origin')
    if not frontend_url:
        backend_url = str(request.base_url)
        if "localhost" in backend_url or "127.0.0.1" in backend_url:
            frontend_url = "http://localhost:5173"
        else:
            frontend_url = "https://zdaito.pl"
    
    if not frontend_url.endswith('/'):
        frontend_url += "/"

    token = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(hours=1)

    user.reset_password_token = token
    user.reset_password_token_expires = expires
    db.commit()

    try:
        await send_reset_password_email(email, token, frontend_url)
    except Exception as e:
        print(f"Błąd wysyłania maila: {e}") 
        raise HTTPException(status_code=500, detail="Nie udało się wysłać wiadomości.")

    return {"message": "Password reset link sent to email"}

@router.post("/reset-password")
async def reset_password(
    token: str = Form(...),
    new_password: str = Form(...),
    db: Session = Depends(get_db)
):
    user = db.query(Users).filter(
        Users.reset_password_token == token,
        Users.reset_password_token_expires > datetime.utcnow()
    ).first()

    if not user:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired token"
        )

    user.hashed_password = bcrypt_context.hash(new_password)
    user.reset_password_token = None
    user.reset_password_token_expires = None
    db.commit()

    return {"message": "Password updated successfully"}


@router.get("/check-availability/{username}", status_code=status.HTTP_200_OK)
async def check_username_availability(username: str, db: db_dependency):
    """
    Sprawdza, czy podana nazwa użytkownika jest już zajęta.
    Zwraca True, jeśli nazwa jest dostępna (nie istnieje w bazie).
    Zwraca False, jeśli nazwa jest zajęta.
    """
    # Sprawdzamy, czy istnieje użytkownik o takiej nazwie
    user_exists = db.query(Users).filter(Users.username == username).first()

    if user_exists:
        # Jeśli znaleziono użytkownika, to nazwa jest ZAJĘTA (nie jest dostępna)
        return {"available": False, "message": "Nazwa użytkownika jest zajęta."}
    
    # Jeśli nie znaleziono, nazwa jest DOSTĘPNA
    return {"available": True, "message": "Nazwa użytkownika jest dostępna."}