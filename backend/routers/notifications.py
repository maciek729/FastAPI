from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import SessionLocal
from models import Notifications, Users
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(
    prefix="/notifications",
    tags=["notifications"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class NotificationOut(BaseModel):
    id: int
    content: str
    type: str
    redirect_type: str
    notebook_id: int | None
    tab_target: str | None
    item_id: int | None
    is_read: bool
    created_at: datetime
    sender_name: str | None

    class Config:
        from_attributes = True


@router.get("/{user_id}", response_model=List[NotificationOut])
def get_user_notifications(user_id: int, db: Session = Depends(get_db)):
    """Pobiera listę powiadomień dla danego użytkownika"""
    notifications = db.query(Notifications).filter(
        Notifications.user_id == user_id
    ).order_by(Notifications.created_at.desc()).all()
    
    result = []
    for n in notifications:
        n_dict = n.__dict__
        n_dict["sender_name"] = n.sender.username if n.sender else "System"
        result.append(n_dict)
        
    return result

@router.patch("/{notification_id}/read")
def mark_as_read(notification_id: int, db: Session = Depends(get_db)):
    """Oznacza powiadomienie jako przeczytane"""
    notif = db.query(Notifications).filter(Notifications.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Powiadomienie nie istnieje")
    notif.is_read = True
    db.commit()
    return {"status": "success"}

@router.delete("/{notification_id}")
def delete_notification(notification_id: int, db: Session = Depends(get_db)):
    """Usuwa pojedyncze powiadomienie (użytkownik klika X)"""
    notif = db.query(Notifications).filter(Notifications.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Powiadomienie nie istnieje")
    db.delete(notif)
    db.commit()
    return {"status": "success"}

@router.delete("/user/{user_id}/all")
def clear_all_notifications(user_id: int, db: Session = Depends(get_db)):
    """Usuwa wszystkie powiadomienia użytkownika"""
    db.query(Notifications).filter(Notifications.user_id == user_id).delete()
    db.commit()
    return {"status": "success"}