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
    order_index: int = Field(default=0, ge=0)
    enabled: bool = True


class StageUpdate(BaseModel):
    key: str | None = Field(default=None, min_length=2, max_length=40)
    label: str | None = Field(default=None, min_length=2, max_length=60)
    order_index: int | None = Field(default=None, ge=0)
    enabled: bool | None = None


class StageOut(BaseModel):
    id: int
    key: str
    label: str
    status: ApplicationStatus | None = None
    order_index: int
    enabled: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ActivityTypeCreate(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    description: str | None = Field(default=None, max_length=255)
    icon: str | None = Field(default="Calendar", max_length=40)


class ActivityTypeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=60)
    description: str | None = Field(default=None, max_length=255)
    icon: str | None = Field(default=None, max_length=40)


class ActivityTypeOut(BaseModel):
    id: int
    name: str
    description: str | None = None
    icon: str | None = "Calendar"
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CrmTabFilterCreate(BaseModel):
    field: str
    operator: str
    value: str
    logical_operator: str = "AND"


class CrmTabFilterOut(BaseModel):
    id: int
    field: str
    operator: str
    value: str
    logical_operator: str

    model_config = {"from_attributes": True}


class CrmTabCreate(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    code: str = Field(min_length=2, max_length=40)
    description: str | None = None
    icon: str | None = "Layers"
    display_order: int = 0
    is_active: bool = True
    is_default: bool = False
    visibility_type: str = "EVERYONE"
    allowed_roles: str | None = None
    stage_ids: list[int] = []
    filters: list[CrmTabFilterCreate] = []


class CrmTabUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    description: str | None = None
    icon: str | None = None
    display_order: int | None = None
    is_active: bool | None = None
    is_default: bool | None = None
    visibility_type: str | None = None
    allowed_roles: str | None = None
    stage_ids: list[int] | None = None
    filters: list[CrmTabFilterCreate] | None = None


class CrmTabOut(BaseModel):
    id: int
    module_id: str
    name: str
    code: str
    description: str | None = None
    icon: str | None = "Layers"
    display_order: int
    is_active: bool
    is_default: bool
    visibility_type: str
    allowed_roles: str | None = None
    stage_ids: list[int] = []
    stage_names: list[str] = []
    filters: list[CrmTabFilterOut] = []
    count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
