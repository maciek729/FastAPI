from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, SecretStr
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig 
from dotenv import load_dotenv
import os
from typing import Annotated
from sqlalchemy.orm import Session
from database import SessionLocal

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

class ContactRequest(BaseModel):
    title: str
    message: str
    user_email: EmailStr

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]

@router.post("/", status_code=status.HTTP_200_OK)
async def submit_contact_form(contact_request: ContactRequest):
    admin_email = os.getenv("MAIL_FROM")
    
    html = f"""
    <h3>Nowa wiadomość ze zdAI to!</h3>
    <p><b>Od:</b> {contact_request.user_email}</p>
    <p><b>Temat:</b> {contact_request.title}</p>
    <p><b>Treść:</b></p>
    <p>{contact_request.message}</p>
    """

    message = MessageSchema(
        subject=f"Formularz Kontaktowy: {contact_request.title}",
        recipients=[admin_email],
        body=html,
        subtype="html"
    )

    fm = FastMail(conf)
    try:
        await fm.send_message(message)
        return {"message": "Wiadomość została wysłana pomyślnie!"}
    except Exception as e:
        print(f"BŁĄD SMTP: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Problem z serwerem pocztowym. Spróbuj ponownie później."
        )