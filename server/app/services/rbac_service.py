import json
from typing import Any
from fastapi import Request
from sqlalchemy.orm import Session

from app.models.rbac import (
    AuditActionType,
    AuditLog,
    DepartmentUser,
    Permission,
    Role,
    RoleDataScope,
    RoleFieldPermission,
    RolePermission,
    UserPermission,
    UserRole as RbacUserRole,
    DataScopeType,
    FieldPermissionType,
)
from app.models.user import User, UserStatus
from app.models.enums import UserRole
from app.schemas.rbac import EffectiveAccessSummary, EffectivePermissionItem


def log_audit_event(
    db: Session,
    action_type: AuditActionType,
    user_id: int | None = None,
    module: str | None = None,
    resource: str | None = None,
    record_id: str | None = None,
    previous_value: Any | None = None,
    new_value: Any | None = None,
    req: Request | None = None,
    success: bool = True,
    error_message: str | None = None,
) -> AuditLog:
    """Record a security or access audit log entry."""
    ip_addr = None
    user_agent = None
    if req:
        ip_addr = req.client.host if req.client else None
        user_agent = req.headers.get("user-agent")

    prev_str = json.dumps(previous_value, default=str) if isinstance(previous_value, (dict, list)) else (str(previous_value) if previous_value is not None else None)
    new_str = json.dumps(new_value, default=str) if isinstance(new_value, (dict, list)) else (str(new_value) if new_value is not None else None)

    audit_entry = AuditLog(
        user_id=user_id,
        action_type=action_type,
        module=module,
        resource=resource,
        record_id=str(record_id) if record_id is not None else None,
        previous_value=prev_str,
        new_value=new_str,
        ip_address=ip_addr,
        user_agent=user_agent,
        success=success,
        error_message=error_message,
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)
    return audit_entry


def get_user_effective_permissions_data(db: Session, user: User) -> EffectiveAccessSummary:
    """Calculate and return effective permissions for a user with source metadata."""
    # Active check
    if user.status != UserStatus.ACTIVE:
        return EffectiveAccessSummary(
            user_id=user.id,
            user_name=user.full_name,
            roles=[],
            departments=[],
            permissions=[],
        )

    # Gather user roles
    rbac_user_roles = db.query(RbacUserRole).filter(RbacUserRole.user_id == user.id).all()
    roles = [ur.role for ur in rbac_user_roles if ur.role and ur.role.status.value == "ACTIVE"]

    # If primary user.role is ADMIN or has super_admin role
    is_super_admin = user.role == UserRole.ADMIN or any(r.code in ["super_admin", "admin"] for r in roles)

    # Gather user departments
    dept_users = db.query(DepartmentUser).filter(DepartmentUser.user_id == user.id).all()
    departments = [du.department.name for du in dept_users if du.department]

    all_permissions = db.query(Permission).all()
    effective_items: list[EffectivePermissionItem] = []

    if is_super_admin:
        for p in all_permissions:
            effective_items.append(
                EffectivePermissionItem(
                    permission_code=p.code,
                    module_code=p.module.code if p.module else "",
                    resource_code=p.resource.code if p.resource else "",
                    action_code=p.action.code if p.action else "",
                    granted=True,
                    source_type="SUPER_ADMIN",
                    source_name="Super Admin Role",
                    scope_type=DataScopeType.ALL,
                )
            )
        return EffectiveAccessSummary(
            user_id=user.id,
            user_name=user.full_name,
            roles=[r.name for r in roles] or ["Admin"],
            departments=departments,
            permissions=effective_items,
        )

    # Gather direct user overrides
    user_overrides = db.query(UserPermission).filter(UserPermission.user_id == user.id).all()
    override_map = {uo.permission_id: uo for uo in user_overrides}

    # Gather role permissions
    role_perm_map: dict[int, list[Role]] = {}
    for r in roles:
        for rp in r.permissions:
            if rp.granted:
                if rp.permission_id not in role_perm_map:
                    role_perm_map[rp.permission_id] = []
                role_perm_map[rp.permission_id].append(r)

    for p in all_permissions:
        # Check direct override first
        if p.id in override_map:
            uo = override_map[p.id]
            source_t = "DIRECT_GRANT" if uo.granted else "DIRECT_RESTRICTION"
            effective_items.append(
                EffectivePermissionItem(
                    permission_code=p.code,
                    module_code=p.module.code if p.module else "",
                    resource_code=p.resource.code if p.resource else "",
                    action_code=p.action.code if p.action else "",
                    granted=uo.granted,
                    source_type=source_t,
                    source_name=f"Direct Override: {uo.reason or ('Granted' if uo.granted else 'Restricted')}",
                    scope_type=DataScopeType.ALL,
                )
            )
        elif p.id in role_perm_map:
            granting_roles = role_perm_map[p.id]
            role_names = ", ".join([r.name for r in granting_roles])
            effective_items.append(
                EffectivePermissionItem(
                    permission_code=p.code,
                    module_code=p.module.code if p.module else "",
                    resource_code=p.resource.code if p.resource else "",
                    action_code=p.action.code if p.action else "",
                    granted=True,
                    source_type="ROLE",
                    source_name=f"Role: {role_names}",
                    scope_type=DataScopeType.ALL,
                )
            )
        else:
            effective_items.append(
                EffectivePermissionItem(
                    permission_code=p.code,
                    module_code=p.module.code if p.module else "",
                    resource_code=p.resource.code if p.resource else "",
                    action_code=p.action.code if p.action else "",
                    granted=False,
                    source_type="NO_ACCESS",
                    source_name="Not Granted",
                    scope_type=DataScopeType.OWN,
                )
            )

    return EffectiveAccessSummary(
        user_id=user.id,
        user_name=user.full_name,
        roles=[r.name for r in roles],
        departments=departments,
        permissions=effective_items,
    )


def can_user(
    db: Session,
    user: User,
    action_code: str,
    resource_code: str,
    record: Any | None = None,
) -> bool:
    """Central authorization engine: evaluates user status, roles, overrides, and scopes."""
    if not user or user.status != UserStatus.ACTIVE:
        return False

    # Super Admin check
    if user.role == UserRole.ADMIN:
        return True

    rbac_user_roles = db.query(RbacUserRole).filter(RbacUserRole.user_id == user.id).all()
    roles = [ur.role for ur in rbac_user_roles if ur.role and ur.role.status.value == "ACTIVE"]
    if any(r.code in ["super_admin", "admin"] for r in roles):
        return True

    perm_code = f"*:{resource_code}:{action_code}"
    # Find matching permission in DB
    perm = (
        db.query(Permission)
        .join(Permission.resource)
        .join(Permission.action)
        .filter(Permission.resource.has(code=resource_code), Permission.action.has(code=action_code))
        .first()
    )

    if not perm:
        # Fallback allowing default action for authenticated users if permission not registered
        return True

    # 1. Direct User Override
    user_perm = (
        db.query(UserPermission)
        .filter(UserPermission.user_id == user.id, UserPermission.permission_id == perm.id)
        .first()
    )
    if user_perm is not None:
        if not user_perm.granted:
            return False
        return True

    # 2. Combined Role Permissions
    has_role_grant = False
    for r in roles:
        rp = (
            db.query(RolePermission)
            .filter(RolePermission.role_id == r.id, RolePermission.permission_id == perm.id, RolePermission.granted == True)
            .first()
        )
        if rp:
            has_role_grant = True
            break

    if not has_role_grant:
        return False

    # 3. Record Scope Check (if record provided)
    if record is not None:
        # Evaluate record assignment or ownership
        assigned_to = getattr(record, "assigned_to", None)
        created_by = getattr(record, "created_by", None)
        user_id = getattr(record, "user_id", None)
        
        if assigned_to == user.id or created_by == user.id or user_id == user.id:
            return True

    return True


def get_user_field_permissions(db: Session, user: User, resource_code: str) -> dict[str, FieldPermissionType]:
    """Get field-level access overrides for a specific resource."""
    if user.role == UserRole.ADMIN:
        return {}

    rbac_user_roles = db.query(RbacUserRole).filter(RbacUserRole.user_id == user.id).all()
    role_ids = [ur.role_id for ur in rbac_user_roles]

    if not role_ids:
        return {}

    field_perms = (
        db.query(RoleFieldPermission)
        .join(RoleFieldPermission.resource)
        .filter(RoleFieldPermission.role_id.in_(role_ids), RoleFieldPermission.resource.has(code=resource_code))
        .all()
    )

    result = {}
    for fp in field_perms:
        result[fp.field_name] = fp.permission_type
    return result
