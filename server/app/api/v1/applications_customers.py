from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.deps import require_application_access
from app.db.session import get_db
from app.models import Application
from app.schemas.application import ApplicationOut

router = APIRouter(prefix="/customers", tags=["customers"])

@router.get("", response_model=list[ApplicationOut])
def list_customer_applications(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    scope: str = Query("all", pattern="^(all|recent)$"),
    tab: str = Query("all", pattern="^(all|mine|pending)$"),
    q: str | None = None,
    status: ApplicationStatus | None = None,
    finance_company_id: int | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from app.api.v1 import applications
    return applications.list_applications(
        page=page,
        page_size=page_size,
        scope=scope,
        tab="mine" if tab == "mine" else tab,
        q=q,
        status=status,
        finance_company_id=finance_company_id,
        date_from=date_from,
        date_to=date_to,
        db=db,
        user=user
    )

# Additional customer-specific routes can be added here