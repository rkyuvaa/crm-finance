from datetime import datetime

from pydantic import BaseModel, Field


class VehicleModelCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    vehicle_price: float = Field(gt=0)
    down_payment: float = Field(ge=0)
    loan_amount: float = Field(gt=0)
    finance_company_id: int | None = None


class VehicleModelUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    vehicle_price: float | None = Field(default=None, gt=0)
    down_payment: float | None = Field(default=None, ge=0)
    loan_amount: float | None = Field(default=None, gt=0)
    finance_company_id: int | None = None


class VehicleModelOut(BaseModel):
    id: int
    name: str
    vehicle_price: float
    down_payment: float
    loan_amount: float
    finance_company_id: int | None
    finance_company_name: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FinanceCompanyBrief(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}
