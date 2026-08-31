from collections.abc import Callable

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models import Application, ApplicationStatus, User, UserRole

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )
    try:
        payload = decode_token(credentials.credentials, expected_type="access")
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token"
        ) from None
    user = db.get(User, int(payload["sub"]))
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_roles(*roles: UserRole) -> Callable:
    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles and user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )
        return user

    return dependency


def require_permission(action: str, resource: str) -> Callable:
    """Dependency that evaluates dynamic RBAC permission."""
    from app.services.rbac_service import can_user

    def dependency(
        db: Session = Depends(get_db),
        user: User = Depends(get_current_user),
    ) -> User:
        if not can_user(db, user, action, resource):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: require {resource}:{action}",
            )
        return user

    return dependency


def can_access_application(user: User, app: Application) -> bool:
    """Check if user can access a specific application based on role and assignment."""
    if user.role == UserRole.ADMIN:
        return True

    # Sales executives can access their assigned applications
    if user.role == UserRole.SALES_EXECUTIVE:
        return app.assigned_to == user.id

    # Finance officers can access applications in finance-related stages
    if user.role == UserRole.FINANCE_OFFICER:
        finance_stages = {
            ApplicationStatus.FINANCE,
            ApplicationStatus.QUERY,
            ApplicationStatus.SANCTIONED,
        }
        return app.status in finance_stages

    # Delivery team can access applications in delivery/disbursement stages
    if user.role == UserRole.DELIVERY_TEAM:
        delivery_stages = {
            ApplicationStatus.DELIVERY,
            ApplicationStatus.DISBURSEMENT,
            ApplicationStatus.COMPLETED,
        }
        return app.status in delivery_stages

    return False


def require_application_access(
    app_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Application:
    """Load an application from the route path and enforce object-level access."""
    app = db.get(Application, app_id)
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
        )
    if not can_access_application(user, app):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this application",
        )
    return app
