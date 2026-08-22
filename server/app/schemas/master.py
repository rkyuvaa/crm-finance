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


class CrmTabFieldCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    label: str = Field(min_length=1, max_length=120)
    field_type: str = "text"
    is_required: bool = False
    is_visible: bool = True
    is_readonly: bool = False
    is_searchable: bool = True
    is_filterable: bool = True
    is_sortable: bool = True
    display_order: int = 0
    placeholder: str | None = None
    help_text: str | None = None
    default_value: str | None = None
    options: list[dict] | None = None
    file_config: dict | None = None
    field_permissions: dict | None = None
    stage_rules: dict | None = None


class CrmTabFieldUpdate(BaseModel):
    name: str | None = None
    label: str | None = None
    field_type: str | None = None
    is_required: bool | None = None
    is_visible: bool | None = None
    is_readonly: bool | None = None
    is_searchable: bool | None = None
    is_filterable: bool | None = None
    is_sortable: bool | None = None
    is_archived: bool | None = None
    display_order: int | None = None
    placeholder: str | None = None
    help_text: str | None = None
    default_value: str | None = None
    options: list[dict] | None = None
    file_config: dict | None = None
    field_permissions: dict | None = None
    stage_rules: dict | None = None


class CrmTabFieldOut(BaseModel):
    id: int
    tab_id: int
    name: str
    label: str
    field_type: str
    is_required: bool
    is_visible: bool
    is_readonly: bool
    is_searchable: bool
    is_filterable: bool
    is_sortable: bool
    is_archived: bool
    display_order: int
    placeholder: str | None = None
    help_text: str | None = None
    default_value: str | None = None
    options: list[dict] | None = None
    file_config: dict | None = None
    field_permissions: dict | None = None
    stage_rules: dict | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CrmLeadCustomFieldValueSave(BaseModel):
    field_id: int
    value: str | None = None
    file_metadata: dict | None = None


class CrmLeadCustomFieldValueOut(BaseModel):
    id: int
    application_id: int
    field_id: int
    value: str | None = None
    file_metadata: dict | None = None
    quality_score: int | None = None
    quality_analysis: dict | None = None
    is_verified: bool = False
    verified_by_id: int | None = None
    verified_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ToggleVerificationInput(BaseModel):
    is_verified: bool


class VerificationDocumentOut(BaseModel):
    id: int
    application_id: int
    field_id: int
    field_name: str
    field_label: str
    file_name: str
    file_path: str
    file_size: int | None = None
    mime_type: str | None = None
    uploaded_at: datetime
    quality_score: int | None = None
    quality_analysis: dict | None = None
    is_verified: bool = False
    verified_by_id: int | None = None
    verified_by_name: str | None = None
    verified_at: datetime | None = None

    model_config = {"from_attributes": True}

