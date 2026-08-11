from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import (
    Application,
    Delivery,
    Disbursement,
    Document,
    FinanceSubmission,
    Sanction,
    User,
    Verification,
)
from app.services.dashboard import _build_finance_companies, _build_pipeline, _status_counts

router = APIRouter(tags=["stage-stubs"])


def _stage_rows(db, model, app_field, fields) -> list[dict]:
    rows = (
        db.query(model, Application)
        .join(Application, app_field == Application.id)
        .order_by(Application.app_no.desc())
        .all()
    )
    out = []
    for row, app in rows:
        item = {
            "id": row.id,
            "app_no": app.app_no,
            "customer_name": app.customer_name,
            "status": row.status.value if hasattr(row.status, "value") else row.status,
        }
        for f in fields:
            val = getattr(row, f, None)
            item[f] = val.isoformat() if hasattr(val, "isoformat") else val
        out.append(item)
    return out


@router.get("/documents")
def list_documents(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _stage_rows(db, Document, Document.application_id, ["doc_type", "uploaded_at"])


@router.get("/verifications")
def list_verifications(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _stage_rows(db, Verification, Verification.application_id, ["notes", "verified_at"])


@router.get("/finance/submissions")
def list_finance_submissions(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _stage_rows(
        db, FinanceSubmission, FinanceSubmission.application_id, ["submitted_at", "query_note"]
    )


@router.get("/sanctions")
def list_sanctions(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _stage_rows(db, Sanction, Sanction.application_id, ["sanctioned_at"])


@router.get("/deliveries")
def list_deliveries(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _stage_rows(db, Delivery, Delivery.application_id, ["delivered_at"])


@router.get("/disbursements")
def list_disbursements(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _stage_rows(db, Disbursement, Disbursement.application_id, ["utr_no", "disbursed_at"])


@router.get("/reports/summary")
def reports_summary(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    counts = _status_counts(db)
    return {
        "pipeline": _build_pipeline(counts),
        "finance_companies": _build_finance_companies(db),
        "monthly": _monthly_totals(db),
    }


def _monthly_totals(db: Session) -> list[dict]:
    from sqlalchemy import func

    from app.core.config import settings

    if settings.database_url.startswith("sqlite"):
        month_col = func.strftime("%Y-%m", Application.created_at)
    else:
        month_col = func.date_trunc("month", Application.created_at)
    rows = (
        db.query(month_col.label("month"), func.count())
        .group_by("month")
        .order_by("month")
        .all()
    )
    out = []
    for m, c in rows:
        if hasattr(m, "strftime"):
            label = m.strftime("%b %Y")
        elif isinstance(m, str):
            dt = __import__("datetime").datetime.strptime(m, "%Y-%m")
            label = dt.strftime("%b %Y")
        else:
            label = str(m)
        out.append({"month": label, "count": c})
    return out
