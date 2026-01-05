from datetime import timedelta, datetime, timezone
from typing import Annotated
from click import argument
from fastapi import APIRouter, Depends, HTTPException, Request, Form # type: ignore
from pydantic import BaseModel # type: ignore
from sqlalchemy.orm import Session # type: ignore
from starlette import status # type: ignore
from database import SessionLocal
from models import Users
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

router = APIRouter(
    prefix='/auth',
    tags=['auth']
)

SECRET_KEY = '197b2c37c391bed93fe80344fe73b806947a65e36206e05a1a23c2fa12702fe3'
ALGORITHM = 'HS256'

bcrypt_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
oauth2_bearer = OAuth2PasswordBearer(tokenUrl='auth/token')

load_dotenv()
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
    token = secrets.token_urlsafe(32)
    base_url = str(request.base_url)
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

    await send_verification_email(thisEmail, token, base_url)


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
async def verify_email(request: Request, token: str, db: Session = Depends(get_db)):
    user = db.query(Users).filter(Users.verification_token == token).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token"
        )

    user.is_verified = True
    user.verification_token = None
    db.commit()

    current_url = str(request.base_url)
    if "localhost" in current_url:
        frontend_url = "http://localhost:5173"
    else:
        frontend_url = "https://zdaito.pl"

    html_content = f"""
    <!DOCTYPE html>
    <html lang="pl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Zweryfikowany - zdAI to!</title>
        <style>
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                color: #2d3436;
            }}
            .card {{
                background: white;
                padding: 40px;
                border-radius: 20px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 400px;
                width: 90%;
            }}
            .icon {{
                font-size: 60px;
                color: #00b894;
                margin-bottom: 20px;
            }}
            h1 {{
                margin: 0 0 10px 0;
                font-size: 24px;
                color: #2d3436;
            }}
            p {{
                color: #636e72;
                line-height: 1.6;
                margin-bottom: 30px;
            }}
            .btn {{
                display: inline-block;
                background: #0984e3;
                color: white;
                text-decoration: none;
                padding: 12px 30px;
                border-radius: 10px;
                font-weight: bold;
                transition: transform 0.2s, background 0.2s;
            }}
            .btn:hover {{
                background: #9771F8;
                transform: translateY(-2px);
            }}
            .logo {{
                font-weight: bold;
                color: #9771F8;
                font-weight:800;
                font-size: 2rem;
                margin-bottom: 10px;
                display: block;
            }}
        </style>
    </head>
    <body>
        <div class="card">
            <span class="logo">zdAI to!</span>
            <div class="icon">✓</div>
            <h1>Email zweryfikowany!</h1>
            <p>Twoje konto zostało pomyślnie aktywowane. Możesz teraz wrócić do aplikacji i zacząć naukę.</p>
            <a href="{frontend_url}/login" class="btn">Przejdź do logowania</a>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content, status_code=200)


class ResetPasswordRequest(BaseModel):
    email: EmailStr


@router.post("/forgot-password")
async def forgot_password(
    request: Request,
    email: str = Form(...),
    db: Session = Depends(get_db)
):
    user = db.query(Users).filter(Users.email == email).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="Email not found"
        )

    token = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(hours=1)

    user.reset_password_token = token
    user.reset_password_token_expires = expires
    db.commit()

    origin = request.headers.get('origin') 
    if not origin:
        origin = "https://zdaito.pl"

    reset_link = f"{origin}/reset-password/{token}"

    message = MessageSchema(
        subject="Password Reset Request",
        recipients=[email],
        body=f"Click to reset password: {reset_link}",
        subtype="plain"
    )

    fm = FastMail(conf)
    await fm.send_message(message)

    return {"message": "Password reset link sent to email"}


class ResetPassword(BaseModel):
    token: str
    new_password: str


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