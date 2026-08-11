from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import ApplicationStatus


class ApplicationBase(BaseModel):
    customer_name: str = Field(min_length=2, max_length=120)
    customer_phone: str = Field(min_length=8, max_length=20)
    vehicle: str = Field(min_length=2, max_length=120)
    amount: float = Field(gt=0)
    status: ApplicationStatus = ApplicationStatus.LEAD
    finance_company_id: int | None = None


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(BaseModel):
    customer_name: str | None = None
    customer_phone: str | None = None
    vehicle: str | None = None
    amount: float | None = Field(default=None, gt=0)
    status: ApplicationStatus | None = None
    finance_company_id: int | None = None


class ApplicationOut(BaseModel):
    id: int
    app_no: str
    customer_name: str
    customer_phone: str
    vehicle: str
    amount: float
    status: ApplicationStatus
    finance_company_id: int | None
    finance_company_name: str | None
    assigned_to: int | None
    assigned_to_name: str | None
    created_at: datetime
    updated_at: datetime
    aging_label: str
    aging_tone: str

    model_config = {"from_attributes": True}


class TabCounts(BaseModel):
    all: int
    mine: int
    pending: int


class ApplicationListResponse(BaseModel):
    items: list[ApplicationOut]
    total: int
    page: int
    page_size: int
    tab_counts: TabCounts
