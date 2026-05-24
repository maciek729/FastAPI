from typing import Annotated
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import APIRouter, Depends, HTTPException, Path
from starlette import status
from database import SessionLocal
from .auth import get_current_user
from models import Users, AIUsageLog

router = APIRouter(
    prefix='/admin',
    tags=['admin']
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]


@router.get("/", status_code=status.HTTP_200_OK)
async def test(user: user_dependency):
    if user is None or user.get('user_role') != 'admin':
        raise HTTPException(status_code=401, detail='Authentication Failed')
    return print("HELLO WOLRD")


def _require_admin(user: dict):
    if user is None or user.get('user_role') != 'admin':
        raise HTTPException(status_code=401, detail='Authentication Failed')


@router.get("/quota/overview", status_code=status.HTTP_200_OK)
async def get_quota_overview(user: user_dependency, db: db_dependency):
    _require_admin(user)

    total_users = db.query(func.count(Users.id)).scalar() or 0
    active_users = db.query(func.count(Users.id)).filter(Users.is_archived.isnot(True)).scalar() or 0
    total_quota = db.query(func.coalesce(func.sum(Users.monthly_quota_credits), 0)).scalar() or 0
    total_used = db.query(func.coalesce(func.sum(Users.monthly_credits_used), 0)).scalar() or 0

    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_quota_credits": total_quota,
        "total_used_credits": total_used,
        "total_remaining_credits": max(total_quota - total_used, 0),
    }


@router.get("/quota/users", status_code=status.HTTP_200_OK)
async def list_user_quota(user: user_dependency, db: db_dependency, limit: int = 100):
    _require_admin(user)

    rows = db.query(Users).order_by(Users.id.asc()).limit(limit).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "is_archived": u.is_archived,
            "monthly_quota_credits": u.monthly_quota_credits,
            "monthly_credits_used": u.monthly_credits_used,
            "remaining_credits": max((u.monthly_quota_credits or 0) - (u.monthly_credits_used or 0), 0),
            "quota_reset_at": u.quota_reset_at,
            "last_quota_warning_pct": u.last_quota_warning_pct,
        }
        for u in rows
    ]


@router.get("/quota/logs", status_code=status.HTTP_200_OK)
async def get_quota_logs(user: user_dependency, db: db_dependency, limit: int = 200, user_id: int | None = None):
    _require_admin(user)

    query = db.query(AIUsageLog).order_by(AIUsageLog.created_at.desc())
    if user_id is not None:
        query = query.filter(AIUsageLog.user_id == user_id)

    rows = query.limit(limit).all()
    return [
        {
            "id": row.id,
            "user_id": row.user_id,
            "action_type": row.action_type,
            "endpoint": row.endpoint,
            "cost_credits": row.cost_credits,
            "status": row.status,
            "message": row.message,
            "metadata_json": row.metadata_json,
            "created_at": row.created_at,
        }
        for row in rows
    ]








