from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models import (
    ActivityType,
    Application,
    ApplicationStatus,
    FinanceCompany,
    PipelineStage,
    User,
    UserRole,
    VehicleModel,
)
from app.schemas.master import (
    ActivityTypeCreate,
    ActivityTypeOut,
    ActivityTypeUpdate,
    FinanceCompanyBrief,
    FinanceCompanyCreate,
    FinanceCompanyUpdate,
    StageCreate,
    StageOut,
    StageUpdate,
    VehicleModelCreate,
    VehicleModelOut,
    VehicleModelUpdate,
)

router = APIRouter(prefix="/masters", tags=["masters"])


def _to_out(model: VehicleModel) -> VehicleModelOut:
    return VehicleModelOut(
        id=model.id,
        name=model.name,
        vehicle_price=float(model.vehicle_price),
        down_payment=float(model.down_payment),
        loan_amount=float(model.loan_amount),
        finance_company_id=model.finance_company_id,
        finance_company_name=model.finance_company.name if model.finance_company else None,
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


def _conflict(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)


# ---------------------------------------------------------------------------
# Vehicle models
# ---------------------------------------------------------------------------


@router.get("/vehicle-models", response_model=list[VehicleModelOut])
def list_vehicle_models(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    models = db.query(VehicleModel).order_by(VehicleModel.name.asc()).all()
    return [_to_out(m) for m in models]


@router.post("/vehicle-models", response_model=VehicleModelOut, status_code=status.HTTP_201_CREATED)
def create_vehicle_model(
    payload: VehicleModelCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN)),
):
    _ensure_unique(db, VehicleModel, VehicleModel.name, payload.name)
    model = VehicleModel(
        name=payload.name,
        vehicle_price=payload.vehicle_price,
        down_payment=payload.down_payment,
        loan_amount=payload.loan_amount,
    )
    db.add(model)
    db.commit()
    db.refresh(model)
    return _to_out(model)


@router.patch("/vehicle-models/{model_id}", response_model=VehicleModelOut)
def update_vehicle_model(
    model_id: int,
    payload: VehicleModelUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN)),
):
    model = db.get(VehicleModel, model_id)
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle model not found")
    data = payload.model_dump(exclude_unset=True)
    if data.get("name") is not None:
        _ensure_unique(db, VehicleModel, VehicleModel.name, data["name"], exclude_id=model_id)
    for field, value in data.items():
        setattr(model, field, value)
    db.add(model)
    db.commit()
    db.refresh(model)
    return _to_out(model)


@router.delete("/vehicle-models/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle_model(
    model_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN)),
):
    model = db.get(VehicleModel, model_id)
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle model not found")
    db.delete(model)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Finance companies (financiers)
# ---------------------------------------------------------------------------


@router.get("/finance-companies", response_model=list[FinanceCompanyBrief])
def list_finance_companies(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(FinanceCompany).order_by(FinanceCompany.name.asc()).all()


@router.post("/finance-companies", response_model=FinanceCompanyBrief, status_code=status.HTTP_201_CREATED)
def create_finance_company(
    payload: FinanceCompanyCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN)),
):
    _ensure_unique(db, FinanceCompany, FinanceCompany.name, payload.name)
    company = FinanceCompany(
        name=payload.name, total_apps=0, approved=0, rejected=0, avg_time_days=0
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return FinanceCompanyBrief(id=company.id, name=company.name)


@router.patch("/finance-companies/{company_id}", response_model=FinanceCompanyBrief)
def update_finance_company(
    company_id: int,
    payload: FinanceCompanyUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN)),
):
    company = db.get(FinanceCompany, company_id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finance company not found")
    data = payload.model_dump(exclude_unset=True)
    if data.get("name") is not None:
        _ensure_unique(db, FinanceCompany, FinanceCompany.name, data["name"], exclude_id=company_id)
    for field, value in data.items():
        setattr(company, field, value)
    db.add(company)
    db.commit()
    db.refresh(company)
    return FinanceCompanyBrief(id=company.id, name=company.name)


@router.delete("/finance-companies/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_finance_company(
    company_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN)),
):
    company = db.get(FinanceCompany, company_id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finance company not found")
    in_use = (
        db.query(func.count(Application.id))
        .filter(Application.finance_company_id == company_id)
        .scalar()
    ) or 0
    if in_use:
        raise _conflict(
            "This financier is used by applications and cannot be deleted"
        )
    db.delete(company)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Pipeline stages
# ---------------------------------------------------------------------------


@router.get("/stages", response_model=list[StageOut])
def list_stages(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    stages = (
        db.query(PipelineStage)
        .order_by(PipelineStage.order_index.asc(), PipelineStage.id.asc())
        .all()
    )
    status_map = {
        "leads": ApplicationStatus.LEAD,
        "lead": ApplicationStatus.LEAD,
        "applications": ApplicationStatus.APPLICATION,
        "application": ApplicationStatus.APPLICATION,
        "verification": ApplicationStatus.VERIFICATION,
        "finance": ApplicationStatus.FINANCE,
        "query": ApplicationStatus.QUERY,
        "sanctioned": ApplicationStatus.SANCTIONED,
        "delivery": ApplicationStatus.DELIVERY,
        "disburse": ApplicationStatus.DISBURSEMENT,
        "disbursement": ApplicationStatus.DISBURSEMENT,
        "completed": ApplicationStatus.COMPLETED,
    }
    result = []
    for s in stages:
        st = s.status or status_map.get(s.key.lower(), ApplicationStatus.APPLICATION)
        result.append(
            StageOut(
                id=s.id,
                key=s.key,
                label=s.label,
                status=st,
                order_index=s.order_index,
                enabled=s.enabled,
                created_at=s.created_at,
                updated_at=s.updated_at,
            )
        )
    return result


@router.post("/stages", response_model=StageOut, status_code=status.HTTP_201_CREATED)
def create_stage(
    payload: StageCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN)),
):
    _ensure_unique(db, PipelineStage, PipelineStage.key, payload.key)
    stage = PipelineStage(
        key=payload.key,
        label=payload.label,
        order_index=payload.order_index,
        enabled=payload.enabled,
    )
    db.add(stage)
    db.commit()
    db.refresh(stage)
    return stage


@router.patch("/stages/{stage_id}", response_model=StageOut)
def update_stage(
    stage_id: int,
    payload: StageUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN)),
):
    stage = db.get(PipelineStage, stage_id)
    if not stage:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stage not found")
    data = payload.model_dump(exclude_unset=True)
    if data.get("key") is not None:
        _ensure_unique(db, PipelineStage, PipelineStage.key, data["key"], exclude_id=stage_id)
    for field, value in data.items():
        setattr(stage, field, value)
    db.add(stage)
    db.commit()
    db.refresh(stage)
    return stage


@router.delete("/stages/{stage_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_stage(
    stage_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN)),
):
    stage = db.get(PipelineStage, stage_id)
    if not stage:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stage not found")
    db.delete(stage)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Activity types
# ---------------------------------------------------------------------------


@router.get("/activity-types", response_model=list[ActivityTypeOut])
def list_activity_types(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(ActivityType).order_by(ActivityType.name.asc()).all()


@router.post("/activity-types", response_model=ActivityTypeOut, status_code=status.HTTP_201_CREATED)
def create_activity_type(
    payload: ActivityTypeCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN)),
):
    _ensure_unique(db, ActivityType, ActivityType.name, payload.name)
    act_type = ActivityType(
        name=payload.name,
        description=payload.description,
        icon=payload.icon or "Calendar",
    )
    db.add(act_type)
    db.commit()
    db.refresh(act_type)
    return act_type


@router.patch("/activity-types/{type_id}", response_model=ActivityTypeOut)
def update_activity_type(
    type_id: int,
    payload: ActivityTypeUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN)),
):
    act_type = db.get(ActivityType, type_id)
    if not act_type:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity type not found")
    data = payload.model_dump(exclude_unset=True)
    if data.get("name") is not None:
        _ensure_unique(db, ActivityType, ActivityType.name, data["name"], exclude_id=type_id)
    for field, value in data.items():
        setattr(act_type, field, value)
    db.add(act_type)
    db.commit()
    db.refresh(act_type)
    return act_type


@router.delete("/activity-types/{type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity_type(
    type_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN)),
):
    act_type = db.get(ActivityType, type_id)
    if not act_type:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity type not found")
    db.delete(act_type)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _ensure_unique(db: Session, model, column, value: str, exclude_id: int | None = None) -> None:
    query = db.query(model).filter(column == value)
    if exclude_id is not None:
        query = query.filter(model.id != exclude_id)
    if query.first() is not None:
        raise _conflict("An entry with this name already exists")
