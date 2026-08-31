from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import verify_password
from app.db.session import get_db
from app.models import User, ApplicationSequence
from app.schemas.auth import LoginRequest
from app.services.aging import utcnow


def authenticate_user(db, payload: LoginRequest) -> User:
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    return user


def mark_user_activity(db, user: User) -> None:
    db.add(user)


def next_app_no(db: Session) -> str:
    """
    Generate the next application number using a database sequence table.
    Includes automatic fallback if sequence table is not present.
    """
    from app.models import Application

    try:
        seq = db.query(ApplicationSequence).first()
        if seq is None:
            seq = ApplicationSequence(last_number=0)
            db.add(seq)
            db.flush()

        max_id = db.query(func.max(Application.id)).scalar() or 0
        if seq.last_number < max_id:
            seq.last_number = max_id

        while True:
            seq.last_number += 1
            candidate = f"APP-{seq.last_number}"
            exists = db.query(Application).filter(Application.app_no == candidate).first()
            if not exists:
                db.flush()
                return candidate
    except Exception:
        db.rollback()
        max_id = db.query(func.max(Application.id)).scalar() or 0
        current = max_id
        while True:
            current += 1
            candidate = f"APP-{current}"
            exists = db.query(Application).filter(Application.app_no == candidate).first()
            if not exists:
                return candidate


def touch_application(db, app) -> None:
    app.updated_at = utcnow()
    db.add(app)
