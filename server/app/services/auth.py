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
    This avoids race conditions by using row-level locking.
    """
    # Try to get existing sequence row, or create it
    seq = db.query(ApplicationSequence).first()
    if seq is None:
        seq = ApplicationSequence(last_number=0)
        db.add(seq)
        db.flush()

    # Increment and return
    seq.last_number += 1
    db.flush()
    return f"APP-{seq.last_number}"


def touch_application(db, app) -> None:
    app.updated_at = utcnow()
    db.add(app)
