from datetime import datetime
from typing import TYPE_CHECKING
import enum

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class PermissionStatus(enum.StrEnum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True
    )
    head_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[PermissionStatus] = mapped_column(
        Enum(PermissionStatus, name="permission_status"), default=PermissionStatus.ACTIVE, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    parent: Mapped["Department | None"] = relationship(
        "Department", remote_side=[id], back_populates="children", lazy="joined"
    )
    children: Mapped[list["Department"]] = relationship(
        "Department", back_populates="parent", lazy="selectin"
    )
    head: Mapped["User | None"] = relationship("User", foreign_keys=[head_id], lazy="joined")

    members: Mapped[list["DepartmentUser"]] = relationship(
        "DepartmentUser", back_populates="department", cascade="all, delete-orphan", lazy="selectin"
    )

    def get_all_children_ids(self) -> list[int]:
        """Get all descendant department IDs recursively."""
        ids = [self.id]
        for child in self.children:
            ids.extend(child.get_all_children_ids())
        return ids


class Module(Base):
    __tablename__ = "modules"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[PermissionStatus] = mapped_column(
        Enum(PermissionStatus, name="permission_status_module"), default=PermissionStatus.ACTIVE, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    resources: Mapped[list["Resource"]] = relationship(
        "Resource", back_populates="module", cascade="all, delete-orphan", lazy="selectin"
    )


class Resource(Base):
    __tablename__ = "resources"

    id: Mapped[int] = mapped_column(primary_key=True)
    module_id: Mapped[int] = mapped_column(
        ForeignKey("modules.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[PermissionStatus] = mapped_column(
        Enum(PermissionStatus, name="permission_status_resource"), default=PermissionStatus.ACTIVE, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    module: Mapped["Module"] = relationship("Module", back_populates="resources", lazy="joined")
    actions: Mapped[list["Action"]] = relationship(
        "Action", back_populates="resource", cascade="all, delete-orphan", lazy="selectin"
    )

    __table_args__ = (UniqueConstraint("module_id", "code", name="uq_module_resource_code"),)


class Action(Base):
    __tablename__ = "actions"

    id: Mapped[int] = mapped_column(primary_key=True)
    resource_id: Mapped[int] = mapped_column(
        ForeignKey("resources.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    code: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[PermissionStatus] = mapped_column(
        Enum(PermissionStatus, name="permission_status_action"), default=PermissionStatus.ACTIVE, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    resource: Mapped["Resource"] = relationship("Resource", back_populates="actions", lazy="joined")

    __table_args__ = (UniqueConstraint("resource_id", "code", name="uq_resource_action_code"),)


class Permission(Base):
    __tablename__ = "permissions"

    id: Mapped[int] = mapped_column(primary_key=True)
    module_id: Mapped[int] = mapped_column(
        ForeignKey("modules.id", ondelete="CASCADE"), nullable=False, index=True
    )
    resource_id: Mapped[int] = mapped_column(
        ForeignKey("resources.id", ondelete="CASCADE"), nullable=False, index=True
    )
    action_id: Mapped[int] = mapped_column(
        ForeignKey("actions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[PermissionStatus] = mapped_column(
        Enum(PermissionStatus, name="permission_status_perm"), default=PermissionStatus.ACTIVE, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    module: Mapped["Module"] = relationship("Module", lazy="joined")
    resource: Mapped["Resource"] = relationship("Resource", lazy="joined")
    action: Mapped["Action"] = relationship("Action", lazy="joined")

    __table_args__ = (
        UniqueConstraint("module_id", "resource_id", "action_id", name="uq_module_resource_action"),
    )


class DataScopeType(enum.StrEnum):
    ALL = "ALL"
    DEPARTMENT = "DEPARTMENT"
    TEAM = "TEAM"
    OWN = "OWN"
    ASSIGNED = "ASSIGNED"
    CUSTOM = "CUSTOM"


class FieldPermissionType(enum.StrEnum):
    VISIBLE = "VISIBLE"
    HIDDEN = "HIDDEN"
    READ_ONLY = "READ_ONLY"
    EDITABLE = "EDITABLE"
    REQUIRED = "REQUIRED"


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[PermissionStatus] = mapped_column(
        Enum(PermissionStatus, name="permission_status_role"), default=PermissionStatus.ACTIVE, nullable=False
    )
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    permissions: Mapped[list["RolePermission"]] = relationship(
        "RolePermission", back_populates="role", cascade="all, delete-orphan", lazy="selectin"
    )
    data_scopes: Mapped[list["RoleDataScope"]] = relationship(
        "RoleDataScope", back_populates="role", cascade="all, delete-orphan", lazy="selectin"
    )
    field_permissions: Mapped[list["RoleFieldPermission"]] = relationship(
        "RoleFieldPermission", back_populates="role", cascade="all, delete-orphan", lazy="selectin"
    )
    creator: Mapped["User | None"] = relationship("User", foreign_keys=[created_by], lazy="joined")

    user_roles: Mapped[list["UserRole"]] = relationship(
        "UserRole", back_populates="role", cascade="all, delete-orphan", lazy="selectin"
    )


class RolePermission(Base):
    __tablename__ = "role_permissions"

    id: Mapped[int] = mapped_column(primary_key=True)
    role_id: Mapped[int] = mapped_column(
        ForeignKey("roles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    permission_id: Mapped[int] = mapped_column(
        ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    granted: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    role: Mapped["Role"] = relationship("Role", back_populates="permissions", lazy="joined")
    permission: Mapped["Permission"] = relationship("Permission", lazy="joined")

    __table_args__ = (UniqueConstraint("role_id", "permission_id", name="uq_role_permission"),)


class RoleDataScope(Base):
    __tablename__ = "role_data_scopes"

    id: Mapped[int] = mapped_column(primary_key=True)
    role_id: Mapped[int] = mapped_column(
        ForeignKey("roles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    module_id: Mapped[int] = mapped_column(
        ForeignKey("modules.id", ondelete="CASCADE"), nullable=False, index=True
    )
    resource_id: Mapped[int] = mapped_column(
        ForeignKey("resources.id", ondelete="CASCADE"), nullable=False, index=True
    )
    action_id: Mapped[int] = mapped_column(
        ForeignKey("actions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    scope_type: Mapped[DataScopeType] = mapped_column(
        Enum(DataScopeType, name="data_scope_type"), nullable=False
    )
    custom_department_ids: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    role: Mapped["Role"] = relationship("Role", back_populates="data_scopes", lazy="joined")
    module: Mapped["Module"] = relationship("Module", lazy="joined")
    resource: Mapped["Resource"] = relationship("Resource", lazy="joined")
    action: Mapped["Action"] = relationship("Action", lazy="joined")

    __table_args__ = (
        UniqueConstraint("role_id", "module_id", "resource_id", "action_id", name="uq_role_data_scope"),
    )


class RoleFieldPermission(Base):
    __tablename__ = "role_field_permissions"

    id: Mapped[int] = mapped_column(primary_key=True)
    role_id: Mapped[int] = mapped_column(
        ForeignKey("roles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    module_id: Mapped[int] = mapped_column(
        ForeignKey("modules.id", ondelete="CASCADE"), nullable=False, index=True
    )
    resource_id: Mapped[int] = mapped_column(
        ForeignKey("resources.id", ondelete="CASCADE"), nullable=False, index=True
    )
    field_name: Mapped[str] = mapped_column(String(100), nullable=False)
    permission_type: Mapped[FieldPermissionType] = mapped_column(
        Enum(FieldPermissionType, name="field_permission_type"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    role: Mapped["Role"] = relationship("Role", back_populates="field_permissions", lazy="joined")
    module: Mapped["Module"] = relationship("Module", lazy="joined")
    resource: Mapped["Resource"] = relationship("Resource", lazy="joined")

    __table_args__ = (
        UniqueConstraint("role_id", "module_id", "resource_id", "field_name", name="uq_role_field_permission"),
    )


class UserRole(Base):
    __tablename__ = "user_roles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role_id: Mapped[int] = mapped_column(
        ForeignKey("roles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    assigned_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], back_populates="user_roles", lazy="joined")
    role: Mapped["Role"] = relationship("Role", back_populates="user_roles", lazy="joined")
    assigner: Mapped["User | None"] = relationship("User", foreign_keys=[assigned_by], lazy="joined")

    __table_args__ = (UniqueConstraint("user_id", "role_id", name="uq_user_role"),)


class UserPermission(Base):
    __tablename__ = "user_permissions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    permission_id: Mapped[int] = mapped_column(
        ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    granted: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    assigned_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], back_populates="user_permissions", lazy="joined")
    permission: Mapped["Permission"] = relationship("Permission", lazy="joined")
    assigner: Mapped["User | None"] = relationship("User", foreign_keys=[assigned_by], lazy="joined")

    __table_args__ = (UniqueConstraint("user_id", "permission_id", name="uq_user_permission"),)


class DepartmentUser(Base):
    __tablename__ = "department_users"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    department_id: Mapped[int] = mapped_column(
        ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    is_primary: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    assigned_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(
        "User", foreign_keys=[user_id], back_populates="department_users", lazy="joined"
    )
    department: Mapped["Department"] = relationship("Department", back_populates="members", lazy="joined")
    assigner: Mapped["User | None"] = relationship("User", foreign_keys=[assigned_by], lazy="joined")

    __table_args__ = (UniqueConstraint("user_id", "department_id", name="uq_user_department"),)


class AuditActionType(enum.StrEnum):
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    LOGIN_FAILED = "LOGIN_FAILED"
    PASSWORD_CHANGE = "PASSWORD_CHANGE"
    PASSWORD_RESET = "PASSWORD_RESET"
    USER_CREATED = "USER_CREATED"
    USER_UPDATED = "USER_UPDATED"
    USER_DELETED = "USER_DELETED"
    USER_ACTIVATED = "USER_ACTIVATED"
    USER_DEACTIVATED = "USER_DEACTIVATED"
    USER_LOCKED = "USER_LOCKED"
    USER_UNLOCKED = "USER_UNLOCKED"
    ROLE_ASSIGNED = "ROLE_ASSIGNED"
    ROLE_REMOVED = "ROLE_REMOVED"
    ROLE_CREATED = "ROLE_CREATED"
    ROLE_UPDATED = "ROLE_UPDATED"
    ROLE_DELETED = "ROLE_DELETED"
    ROLE_DUPLICATED = "ROLE_DUPLICATED"
    PERMISSION_CHANGED = "PERMISSION_CHANGED"
    PERMISSION_GRANTED = "PERMISSION_GRANTED"
    PERMISSION_REVOKED = "PERMISSION_REVOKED"
    DEPARTMENT_CREATED = "DEPARTMENT_CREATED"
    DEPARTMENT_UPDATED = "DEPARTMENT_UPDATED"
    DEPARTMENT_DELETED = "DEPARTMENT_DELETED"
    DEPARTMENT_ASSIGNED = "DEPARTMENT_ASSIGNED"
    DEPARTMENT_REMOVED = "DEPARTMENT_REMOVED"
    MODULE_CREATED = "MODULE_CREATED"
    MODULE_UPDATED = "MODULE_UPDATED"
    MODULE_DELETED = "MODULE_DELETED"
    RESOURCE_CREATED = "RESOURCE_CREATED"
    RESOURCE_UPDATED = "RESOURCE_UPDATED"
    RESOURCE_DELETED = "RESOURCE_DELETED"
    ACTION_CREATED = "ACTION_CREATED"
    ACTION_UPDATED = "ACTION_UPDATED"
    ACTION_DELETED = "ACTION_DELETED"


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    action_type: Mapped[AuditActionType] = mapped_column(
        Enum(AuditActionType, name="audit_action_type"), nullable=False, index=True
    )
    module: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    resource: Mapped[str | None] = mapped_column(String(100), nullable=True)
    record_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    previous_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    success: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    user: Mapped["User | None"] = relationship("User", foreign_keys=[user_id], lazy="joined")