from fastapi import APIRouter, Depends, Form, HTTPException, status
from pydantic import BaseModel, EmailStr
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig 
from dotenv import load_dotenv
import os
from typing import Annotated
from database import SessionLocal
from sqlalchemy.orm import Session
from models import Users

from pydantic import SecretStr 
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


router = APIRouter(
    prefix='/contact',
    tags=['contact']
)

# Klasa dla danych z formularza (opcjonalnie, ale dobra praktyka)
class ContactRequest(BaseModel):
    title: str
    message: str
    user_email: EmailStr # Email zalogowanego użytkownika
    # user_id i user_name są opcjonalne, jeśli chcesz użyć tokenu JWT

# Wymagany do użycia, jeśli używasz bazy danych
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]

# Funkcja do wysyłania wiadomości do Ciebie (administratora)
async def send_contact_email(user_email: EmailStr, title: str, message_content: str):
    admin_email = os.getenv("MAIL_FROM") # Załóżmy, że masz zmienną środowiskową dla administratora
    if not admin_email:
        raise ValueError("MAIL_FROM not configured")

    body = f"Od: {user_email}\nTemat: {title}\n\nWiadomość:\n{message_content}"

    message = MessageSchema(
        subject=f"NOWA WIADOMOŚĆ KONTAKTOWA: {title}",
        recipients=[admin_email],
        body=body,
        subtype="plain"
    )
    fm = FastMail(conf)
    await fm.send_message(message)


@router.post("/", status_code=status.HTTP_200_OK)
async def submit_contact_form(
    contact_request: ContactRequest,
    db: db_dependency
):

    try:
        await send_contact_email(
            contact_request.user_email,
            contact_request.title,
            contact_request.message
        )
        return {"message": "Wiadomość została wysłana pomyślnie!"}
    except ValueError as e:
        # Błąd konfiguracji
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        # Inny błąd wysyłki (np. problem z połączeniem SMTP)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Wystąpił błąd podczas wysyłania wiadomości. Spróbuj ponownie później."
        )