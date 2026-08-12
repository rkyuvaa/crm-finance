from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models import FinanceCompany, User, UserRole, VehicleModel
from app.schemas.master import (
    FinanceCompanyBrief,
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


def _ensure_finance_company(db: Session, finance_company_id: int | None) -> None:
    if finance_company_id is None:
        return
    if db.get(FinanceCompany, finance_company_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Finance company not found"
        )


def _ensure_unique_name(db: Session, name: str, exclude_id: int | None = None) -> None:
    query = db.query(VehicleModel).filter(VehicleModel.name == name)
    if exclude_id is not None:
        query = query.filter(VehicleModel.id != exclude_id)
    if query.first() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="A vehicle model with this name already exists"
        )


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
    _ensure_finance_company(db, payload.finance_company_id)
    _ensure_unique_name(db, payload.name)
    model = VehicleModel(
        name=payload.name,
        vehicle_price=payload.vehicle_price,
        down_payment=payload.down_payment,
        loan_amount=payload.loan_amount,
        finance_company_id=payload.finance_company_id,
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
    if "finance_company_id" in data:
        _ensure_finance_company(db, data["finance_company_id"])
    if data.get("name") is not None:
        _ensure_unique_name(db, data["name"], exclude_id=model_id)
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


@router.get("/finance-companies", response_model=list[FinanceCompanyBrief])
def list_finance_companies(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(FinanceCompany).order_by(FinanceCompany.name.asc()).all()
