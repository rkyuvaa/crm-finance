from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import ApplicationStatus


class VehicleModelCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    vehicle_price: float = Field(gt=0)
    down_payment: float = Field(ge=0)
    loan_amount: float = Field(gt=0)


class VehicleModelUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    vehicle_price: float | None = Field(default=None, gt=0)
    down_payment: float | None = Field(default=None, ge=0)
    loan_amount: float | None = Field(default=None, gt=0)


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


class FinanceCompanyCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)


class FinanceCompanyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)


class StageCreate(BaseModel):
    key: str = Field(min_length=2, max_length=40)
    label: str = Field(min_length=2, max_length=60)
    status: ApplicationStatus
    order_index: int = Field(default=0, ge=0)
    enabled: bool = True


class StageUpdate(BaseModel):
    key: str | None = Field(default=None, min_length=2, max_length=40)
    label: str | None = Field(default=None, min_length=2, max_length=60)
    status: ApplicationStatus | None = None
    order_index: int | None = Field(default=None, ge=0)
    enabled: bool | None = None


class StageOut(BaseModel):
    id: int
    key: str
    label: str
    status: ApplicationStatus
    order_index: int
    enabled: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
