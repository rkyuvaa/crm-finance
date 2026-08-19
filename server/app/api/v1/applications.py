from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import (
    Activity,
    ActivityLog,
    Application,
    ApplicationStatus,
    Disbursement,
    DisbursementStatus,
    FinanceStatus,
    FinanceSubmission,
    User,
)
from app.schemas.application import (
    ApplicationCreate,
    ApplicationListResponse,
    ApplicationOut,
    ApplicationUpdate,
    TabCounts,
)
from app.schemas.notifications import ActivityLogOut
from app.services.aging import aging_tone, duration_between, format_aging
from app.services.auth import next_app_no, touch_application

router = APIRouter(prefix="/applications", tags=["applications"])

RECENT_WINDOW = 50


def _to_out(app: Application) -> ApplicationOut:
    return ApplicationOut(
        id=app.id,
        app_no=app.app_no,
        customer_name=app.customer_name,
        customer_phone=app.customer_phone,
        vehicle=app.vehicle,
        amount=float(app.amount),
        status=app.status,
        finance_company_id=app.finance_company_id,
        finance_company_name=app.finance_company.name if app.finance_company else None,
        vehicle_model_id=app.vehicle_model_id,
        vehicle_price=float(app.vehicle_price) if app.vehicle_price is not None else None,
        down_payment=float(app.down_payment) if app.down_payment is not None else None,
        assigned_to=app.assigned_to,
        assigned_to_name=app.assigned_user.full_name if app.assigned_user else None,
        created_at=app.created_at,
        updated_at=app.updated_at,
        aging_label=format_aging(duration_between(app.updated_at)),
        aging_tone=aging_tone(duration_between(app.updated_at)),
    )


def _pending_action_app_ids(db: Session) -> list[int]:
    q1 = (
        db.query(Application.id)
        .join(FinanceSubmission, FinanceSubmission.application_id == Application.id)
        .filter(
            Application.status == ApplicationStatus.QUERY,
            FinanceSubmission.status == FinanceStatus.QUERY,
            FinanceSubmission.query_note.isnot(None),
        )
        .all()
    )
    q2 = (
        db.query(Application.id)
        .join(Disbursement, Disbursement.application_id == Application.id)
        .filter(
            Application.status == ApplicationStatus.DISBURSEMENT,
            Disbursement.status == DisbursementStatus.PENDING_UTR,
        )
        .all()
    )
    return [r[0] for r in q1] + [r[0] for r in q2]


def _recent_ids(db: Session) -> list[int]:
    return [
        r[0]
        for r in db.query(Application.id)
        .filter(Application.status != ApplicationStatus.LEAD)
        .order_by(Application.created_at.desc())
        .limit(RECENT_WINDOW)
        .all()
    ]


def _tab_counts(db: Session, user: User, scope: str) -> TabCounts:
    base = db.query(Application)
    if scope == "recent":
        recent_ids = _recent_ids(db)
        if recent_ids:
            base = base.filter(Application.id.in_(recent_ids))
    all_count = base.count()
    mine = base.filter(Application.assigned_to == user.id).count()
    pending_ids = _pending_action_app_ids(db)
    pending = (
        base.filter(Application.id.in_(pending_ids)).count() if pending_ids else 0
    )
    return TabCounts(all=all_count, mine=mine, pending=pending)


def _filtered_query(
    db: Session,
    user: User,
    scope: str,
    tab: str,
    q: str | None,
    status_filter: ApplicationStatus | None,
    finance_company_id: int | None,
    date_from: datetime | None,
    date_to: datetime | None,
    stage_key: str | None = None,
):
    query = db.query(Application)
    if scope == "recent":
        recent_ids = _recent_ids(db)
        query = query.filter(Application.id.in_(recent_ids)) if recent_ids else query.filter(False)
    if tab == "mine":
        query = query.filter(Application.assigned_to == user.id)
    elif tab == "pending":
        pending_ids = _pending_action_app_ids(db)
        query = query.filter(Application.id.in_(pending_ids)) if pending_ids else query.filter(False)
    if status_filter:
        query = query.filter(Application.status == status_filter)
    if finance_company_id:
        query = query.filter(Application.finance_company_id == finance_company_id)
    if date_from:
        query = query.filter(Application.created_at >= date_from)
    if date_to:
        query = query.filter(Application.created_at <= date_to)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            func.lower(Application.app_no).like(like.lower())
            | func.lower(Application.customer_name).like(like.lower())
            | Application.customer_phone.like(like)
            | func.lower(Application.vehicle).like(like.lower())
        )
    if stage_key:
        from app.models.pipeline_stage import PipelineStage as PipelineStageModel
        stage = db.query(PipelineStageModel).filter(PipelineStageModel.key == stage_key).first()
        if stage and stage.status:
            query = query.filter(Application.status == stage.status)
    return query


@router.get("", response_model=ApplicationListResponse)
def list_applications(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    scope: str = Query("all", pattern="^(all|recent)$"),
    tab: str = Query("all", pattern="^(all|mine|pending)$"),
    q: str | None = None,
    status: ApplicationStatus | None = None,
    finance_company_id: int | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    stage_key: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = _filtered_query(
        db, user, scope, tab, q, status, finance_company_id, date_from, date_to, stage_key
    )
    total = query.count()
    items = (
        query.order_by(Application.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return ApplicationListResponse(
        items=[_to_out(a) for a in items],
        total=total,
        page=page,
        page_size=page_size,
        tab_counts=_tab_counts(db, user, scope),
    )


@router.get("/{app_id}", response_model=ApplicationOut)
def get_application(app_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    app = db.get(Application, app_id)
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return _to_out(app)


@router.get("/{app_id}/activity", response_model=list[ActivityLogOut])
def get_application_activity(
    app_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    app = db.get(Application, app_id)
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    logs = (
        db.query(ActivityLog)
        .filter(ActivityLog.application_id == app_id)
        .order_by(ActivityLog.created_at.desc())
        .all()
    )
    return [
        ActivityLogOut(
            id=log.id,
            application_id=log.application_id,
            actor_id=log.actor_id,
            actor_name=log.actor.full_name if log.actor else None,
            field_name=log.field_name,
            old_value=log.old_value,
            new_value=log.new_value,
            created_at=log.created_at,
        )
        for log in logs
    ]


@router.post("", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
def create_application(
    payload: ApplicationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    app = Application(
        app_no=next_app_no(db),
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        vehicle=payload.vehicle,
        amount=payload.amount,
        status=payload.status,
        finance_company_id=payload.finance_company_id,
        vehicle_model_id=payload.vehicle_model_id,
        vehicle_price=payload.vehicle_price,
        down_payment=payload.down_payment,
        assigned_to=user.id,
    )
    db.add(app)
    db.flush()
    db.add(
        Activity(
            application_id=app.id,
            actor_id=user.id,
            action=f"Created application {app.app_no}",
        )
    )
    db.commit()
    db.refresh(app)
    return _to_out(app)


@router.patch("/{app_id}", response_model=ApplicationOut)
def update_application(
    app_id: int,
    payload: ApplicationUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    app = db.get(Application, app_id)
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    data = payload.model_dump(exclude_unset=True)
    
    # Track field changes for activity log
    field_mapping = {
        'customer_name': 'Customer Name',
        'customer_phone': 'Customer Phone',
        'vehicle': 'Vehicle',
        'amount': 'Loan Amount',
        'status': 'Status',
        'finance_company_id': 'Finance Company',
        'vehicle_model_id': 'Vehicle Model',
        'vehicle_price': 'Vehicle Price',
        'down_payment': 'Down Payment',
    }
    
    for field, value in data.items():
        old_value = getattr(app, field)
        if old_value != value:
            # Get display values for relationships
            old_display = str(old_value) if old_value is not None else None
            new_display = str(value) if value is not None else None
            
            # Special handling for IDs to show names
            if field == 'finance_company_id' and value:
                from app.models.finance_company import FinanceCompany
                fc = db.get(FinanceCompany, value)
                new_display = fc.name if fc else str(value)
            if field == 'finance_company_id' and old_value:
                from app.models.finance_company import FinanceCompany
                fc = db.get(FinanceCompany, old_value)
                old_display = fc.name if fc else str(old_value)
            if field == 'vehicle_model_id' and value:
                from app.models.vehicle_model import VehicleModel
                vm = db.get(VehicleModel, value)
                new_display = vm.name if vm else str(value)
            if field == 'vehicle_model_id' and old_value:
                from app.models.vehicle_model import VehicleModel
                vm = db.get(VehicleModel, old_value)
                old_display = vm.name if vm else str(old_value)
            if field == 'status' and value:
                new_display = str(value)
            if field == 'status' and old_value:
                old_display = str(old_value)
            
            db.add(
                ActivityLog(
                    application_id=app.id,
                    actor_id=user.id,
                    field_name=field_mapping.get(field, field),
                    old_value=old_display,
                    new_value=new_display,
                )
            )
        setattr(app, field, value)
    
    touch_application(db, app)
    db.add(
        Activity(
            application_id=app.id,
            actor_id=user.id,
            action=f"Updated application {app.app_no}",
        )
    )
    db.commit()
    db.refresh(app)
    return _to_out(app)


@router.delete("/{app_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(app_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    app = db.get(Application, app_id)
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    db.delete(app)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
