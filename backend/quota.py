from __future__ import annotations

from datetime import datetime, timezone
import json
import os
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from models import AIUsageLog, Users


MAX_USERS = int(os.getenv("MAX_USERS", "15"))
MONTHLY_CREDITS_PER_USER = int(os.getenv("MONTHLY_CREDITS_PER_USER", "300"))
WARNING_THRESHOLDS = (80, 95)

ACTION_COSTS = {
    "chat": int(os.getenv("COST_CHAT", "1")),
    "flashcards": int(os.getenv("COST_FLASHCARDS", "4")),
    "tests": int(os.getenv("COST_TESTS", "8")),
    "podcast": int(os.getenv("COST_PODCAST", "10")),
}


def acquire_signup_lock(db: Session) -> None:
    """Acquire a transaction-scoped lock for signup cap checks on PostgreSQL.

    For non-PostgreSQL databases this is a no-op.
    """
    try:
        db.execute(text("SELECT pg_advisory_xact_lock(:lock_key)"), {"lock_key": 150015})
    except Exception:
        # Non-Postgres engines won't support advisory locks; keep best-effort behavior.
        pass


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _month_start(dt: datetime) -> datetime:
    return datetime(dt.year, dt.month, 1, tzinfo=timezone.utc)


def _next_month_start(dt: datetime) -> datetime:
    if dt.month == 12:
        return datetime(dt.year + 1, 1, 1, tzinfo=timezone.utc)
    return datetime(dt.year, dt.month + 1, 1, tzinfo=timezone.utc)


def _normalize_to_utc(dt: Optional[datetime]) -> datetime:
    if dt is None:
        return _month_start(_now_utc())
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _reset_quota_if_new_month(user: Users, now: datetime) -> bool:
    reset_at = _normalize_to_utc(user.quota_reset_at)
    if _month_start(now) > _month_start(reset_at):
        user.monthly_credits_used = 0
        user.monthly_quota_credits = user.monthly_quota_credits or MONTHLY_CREDITS_PER_USER
        user.quota_reset_at = now
        user.last_quota_warning_pct = None
        return True
    return False


def get_action_cost(action: str) -> int:
    if action not in ACTION_COSTS:
        raise ValueError(f"Unknown quota action: {action}")
    return ACTION_COSTS[action]


def get_user_or_404(db: Session, user_id: int) -> Users:
    user = db.query(Users).filter(Users.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _current_warning_level(used: int, quota: int) -> Optional[int]:
    if quota <= 0:
        return 100
    pct = int((used / quota) * 100)
    level = None
    for threshold in WARNING_THRESHOLDS:
        if pct >= threshold:
            level = threshold
    return level


def _log_usage(
    db: Session,
    user_id: int,
    action: str,
    endpoint: str,
    cost_credits: int,
    status: str,
    message: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> None:
    log_row = AIUsageLog(
        user_id=user_id,
        action_type=action,
        endpoint=endpoint,
        cost_credits=cost_credits,
        status=status,
        message=message,
        metadata_json=json.dumps(metadata) if metadata else None,
    )
    db.add(log_row)


def preflight_quota_check(db: Session, user_id: int, action: str, endpoint: str) -> dict:
    now = _now_utc()
    cost = get_action_cost(action)
    user = get_user_or_404(db, user_id)

    _reset_quota_if_new_month(user, now)

    if user.monthly_quota_credits is None:
        user.monthly_quota_credits = MONTHLY_CREDITS_PER_USER
    if user.monthly_credits_used is None:
        user.monthly_credits_used = 0

    remaining = user.monthly_quota_credits - user.monthly_credits_used
    if remaining < cost:
        _log_usage(
            db=db,
            user_id=user_id,
            action=action,
            endpoint=endpoint,
            cost_credits=cost,
            status="blocked",
            message="Insufficient credits",
            metadata={
                "remaining": remaining,
                "quota": user.monthly_quota_credits,
                "used": user.monthly_credits_used,
            },
        )
        db.commit()
        raise HTTPException(
            status_code=429,
            detail={
                "error": "quota_exceeded",
                "message": "Monthly AI credit limit reached. Please wait for next month reset.",
                "remaining": max(remaining, 0),
                "required": cost,
                "quota": user.monthly_quota_credits,
                "used": user.monthly_credits_used,
                "reset_at": _next_month_start(now).isoformat(),
            },
        )

    return {
        "user_id": user_id,
        "action": action,
        "endpoint": endpoint,
        "cost": cost,
        "quota": user.monthly_quota_credits,
        "used_before": user.monthly_credits_used,
    }


def commit_quota_charge(db: Session, quota_context: dict) -> dict:
    now = _now_utc()
    user = get_user_or_404(db, quota_context["user_id"])

    _reset_quota_if_new_month(user, now)

    cost = quota_context["cost"]
    user.monthly_credits_used = (user.monthly_credits_used or 0) + cost
    user.quota_reset_at = now

    warning_level = _current_warning_level(user.monthly_credits_used, user.monthly_quota_credits)
    should_warn = warning_level is not None and warning_level != user.last_quota_warning_pct
    if should_warn:
        user.last_quota_warning_pct = warning_level

    _log_usage(
        db=db,
        user_id=quota_context["user_id"],
        action=quota_context["action"],
        endpoint=quota_context["endpoint"],
        cost_credits=cost,
        status="success",
        metadata={
            "used": user.monthly_credits_used,
            "quota": user.monthly_quota_credits,
            "remaining": user.monthly_quota_credits - user.monthly_credits_used,
            "warning_level": warning_level,
        },
    )
    db.commit()

    return {
        "quota": user.monthly_quota_credits,
        "used": user.monthly_credits_used,
        "remaining": max(user.monthly_quota_credits - user.monthly_credits_used, 0),
        "cost": cost,
        "warning": {
            "triggered": should_warn,
            "threshold": warning_level,
        },
    }


def log_quota_failure(db: Session, quota_context: dict, message: str, commit: bool = False) -> None:
    _log_usage(
        db=db,
        user_id=quota_context["user_id"],
        action=quota_context["action"],
        endpoint=quota_context["endpoint"],
        cost_credits=quota_context["cost"],
        status="failed",
        message=message,
    )
    if commit:
        db.commit()
