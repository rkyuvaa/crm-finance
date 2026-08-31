from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.rbac import AuditActionType, DataScopeType, FieldPermissionType, PermissionStatus
from app.models.enums import UserRole
from app.models.user import UserStatus


# Department Schemas
class DepartmentBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    code: str = Field(..., min_length=2, max_length=20)
    description: str | None = None
    parent_id: int | None = None
    head_id: int | None = None
    status: PermissionStatus = PermissionStatus.ACTIVE


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    description: str | None = None
    parent_id: int | None = None
    head_id: int | None = None
    status: PermissionStatus | None = None


class DepartmentOut(DepartmentBase):
    id: int
    created_at: datetime
    updated_at: datetime
    employee_count: int = 0
    head_name: str | None = None
    parent_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


class DepartmentTreeNode(DepartmentOut):
    children: list["DepartmentTreeNode"] = []


# Module, Resource, Action, Permission Schemas
class ActionOut(BaseModel):
    id: int
    name: str
    code: str
    description: str | None = None
    display_order: int = 0
    status: PermissionStatus = PermissionStatus.ACTIVE

    model_config = ConfigDict(from_attributes=True)


class ResourceOut(BaseModel):
    id: int
    module_id: int
    name: str
    code: str
    description: str | None = None
    display_order: int = 0
    status: PermissionStatus = PermissionStatus.ACTIVE
    actions: list[ActionOut] = []

    model_config = ConfigDict(from_attributes=True)


class ModuleOut(BaseModel):
    id: int
    name: str
    code: str
    description: str | None = None
    display_order: int = 0
    icon: str | None = None
    status: PermissionStatus = PermissionStatus.ACTIVE
    resources: list[ResourceOut] = []

    model_config = ConfigDict(from_attributes=True)


class PermissionOut(BaseModel):
    id: int
    module_id: int
    resource_id: int
    action_id: int
    code: str
    description: str | None = None
    status: PermissionStatus = PermissionStatus.ACTIVE
    module_code: str | None = None
    resource_code: str | None = None
    action_code: str | None = None

    model_config = ConfigDict(from_attributes=True)


class CustomPermissionCreate(BaseModel):
    resource_id: int
    action_name: str = Field(..., min_length=2, max_length=50)
    action_code: str = Field(..., min_length=2, max_length=30)
    description: str | None = None


# Role Schemas
class RolePermissionInput(BaseModel):
    permission_id: int
    granted: bool = True


class RoleDataScopeInput(BaseModel):
    module_id: int
    resource_id: int
    action_id: int
    scope_type: DataScopeType = DataScopeType.ALL
    custom_department_ids: list[int] | None = None


class RoleFieldPermissionInput(BaseModel):
    module_id: int
    resource_id: int
    field_name: str
    permission_type: FieldPermissionType = FieldPermissionType.VISIBLE


class RoleCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    code: str = Field(..., min_length=2, max_length=50)
    description: str | None = None
    status: PermissionStatus = PermissionStatus.ACTIVE
    permission_ids: list[int] = []
    data_scopes: list[RoleDataScopeInput] = []
    field_permissions: list[RoleFieldPermissionInput] = []


class RoleUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    description: str | None = None
    status: PermissionStatus | None = None
    permission_ids: list[int] | None = None
    data_scopes: list[RoleDataScopeInput] | None = None
    field_permissions: list[RoleFieldPermissionInput] | None = None


class RoleOut(BaseModel):
    id: int
    name: str
    code: str
    description: str | None = None
    status: PermissionStatus
    is_system: bool = False
    created_at: datetime
    updated_at: datetime
    created_by: int | None = None
    creator_name: str | None = None
    user_count: int = 0
    permission_count: int = 0
    permission_ids: list[int] = []

    model_config = ConfigDict(from_attributes=True)


class RoleDuplicateInput(BaseModel):
    new_name: str = Field(..., min_length=2, max_length=100)
    new_code: str = Field(..., min_length=2, max_length=50)
    description: str | None = None


# User Management Schemas
class UserCreateAdmin(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=120)
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    mobile: str | None = None
    employee_id: str | None = None
    designation: str | None = None
    primary_role: UserRole = UserRole.SALES_EXECUTIVE
    role_ids: list[int] = []
    department_ids: list[int] = []
    primary_department_id: int | None = None
    reporting_manager_id: int | None = None
    status: UserStatus = UserStatus.ACTIVE
    force_password_change: bool = False


class UserUpdateAdmin(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = None
    username: str | None = None
    mobile: str | None = None
    employee_id: str | None = None
    designation: str | None = None
    primary_role: UserRole | None = None
    role_ids: list[int] | None = None
    department_ids: list[int] | None = None
    primary_department_id: int | None = None
    reporting_manager_id: int | None = None
    status: UserStatus | None = None
    force_password_change: bool | None = None
    password: str | None = None


class UserPermissionOverrideInput(BaseModel):
    permission_id: int
    granted: bool
    reason: str | None = None


class UserDetailOut(BaseModel):
    id: int
    email: str
    full_name: str
    username: str | None = None
    mobile: str | None = None
    employee_id: str | None = None
    designation: str | None = None
    role: UserRole
    status: UserStatus
    force_password_change: bool
    last_login_at: datetime | None = None
    failed_login_attempts: int = 0
    locked_until: datetime | None = None
    profile_photo: str | None = None
    reporting_manager_id: int | None = None
    reporting_manager_name: str | None = None
    created_at: datetime
    updated_at: datetime
    assigned_roles: list[RoleOut] = []
    departments: list[DepartmentOut] = []
    primary_department_id: int | None = None
    primary_department_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


# Effective Permission Schemas
class EffectivePermissionItem(BaseModel):
    permission_code: str
    module_code: str
    resource_code: str
    action_code: str
    granted: bool
    source_type: str  # 'SUPER_ADMIN', 'ROLE', 'DIRECT_GRANT', 'DIRECT_RESTRICTION'
    source_name: str
    scope_type: DataScopeType = DataScopeType.ALL


class EffectiveAccessSummary(BaseModel):
    user_id: int
    user_name: str
    roles: list[str]
    departments: list[str]
    permissions: list[EffectivePermissionItem]


# Audit Log Schemas
class AuditLogOut(BaseModel):
    id: int
    user_id: int | None = None
    user_name: str | None = None
    action_type: AuditActionType
    module: str | None = None
    resource: str | None = None
    record_id: str | None = None
    previous_value: str | None = None
    new_value: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    success: bool = True
    error_message: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedResponse(BaseModel):
    items: list[Any]
    total: int
    page: int
    page_size: int
    pages: int
