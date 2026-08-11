from fastapi import HTTPException, status

from app.core.security import verify_password
from app.models import User
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


def next_app_no(db) -> str:
    from app.models import Application

    rows = db.query(Application.app_no).all()
    numbers = []
    for (app_no,) in rows:
        try:
            numbers.append(int(app_no.removeprefix("APP-")))
        except ValueError:
            continue
    return f"APP-{max(numbers, default=0) + 1}"


def touch_application(db, app) -> None:
    app.updated_at = utcnow()
    db.add(app)
