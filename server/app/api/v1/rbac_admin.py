from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_roles
from app.core.security import hash_password
from app.models import (
    Action,
    AuditActionType,
    AuditLog,
    Department,
    DepartmentUser,
    Module,
    Permission,
    PermissionStatus,
    Resource,
    Role,
    RoleDataScope,
    RoleFieldPermission,
    RolePermission,
    User,
    UserPermission,
    UserRole as RbacUserRole,
    DataScopeType,
)
from app.models.enums import UserRole
from app.models.user import UserStatus
from app.schemas.rbac import (
    ActionOut,
    AuditLogOut,
    CustomPermissionCreate,
    DepartmentCreate,
    DepartmentOut,
    DepartmentTreeNode,
    DepartmentUpdate,
    EffectiveAccessSummary,
    ModuleOut,
    PaginatedResponse,
    PermissionOut,
    ResourceOut,
    RoleCreate,
    RoleDuplicateInput,
    RoleOut,
    RoleUpdate,
    UserCreateAdmin,
    UserDetailOut,
    UserPermissionOverrideInput,
    UserUpdateAdmin,
)
from app.services.rbac_service import (
    can_user,
    get_user_effective_permissions_data,
    log_audit_event,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# 1. USER MANAGEMENT ENDPOINTS
# ---------------------------------------------------------------------------

@router.get("/users", response_model=PaginatedResponse)
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    department_id: int | None = None,
    role_code: str | None = None,
    user_status: UserStatus | None = None,
    designation: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List users with pagination, multi-field filtering, and search."""
    if not can_user(db, current_user, "view", "users"):
        raise HTTPException(status_code=403, detail="Permission denied to view users")

    query = db.query(User)

    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                User.full_name.ilike(s),
                User.email.ilike(s),
                User.username.ilike(s),
                User.employee_id.ilike(s),
                User.mobile.ilike(s),
            )
        )

    if user_status:
        query = query.filter(User.status == user_status)

    if designation:
        query = query.filter(User.designation.ilike(f"%{designation}%"))

    if role_code:
        query = query.filter(User.role == role_code)

    if department_id:
        query = query.join(User.department_users).filter(DepartmentUser.department_id == department_id)

    total = query.count()
    pages = (total + page_size - 1) // page_size
    items = query.order_by(User.id.desc()).offset((page - 1) * page_size).limit(page_size).all()

    # Format user output
    result_items = []
    for u in items:
        assigned_roles = [ur.role for ur in u.user_roles if ur.role]
        departments = [du.department for du in u.department_users if du.department]
        primary_dept = next((d for d in departments if any(du.is_primary for du in u.department_users if du.department_id == d.id)), departments[0] if departments else None)
        manager_name = u.reporting_manager.full_name if u.reporting_manager else None

        result_items.append(
            UserDetailOut(
                id=u.id,
                email=u.email,
                full_name=u.full_name,
                username=u.username,
                mobile=u.mobile,
                employee_id=u.employee_id,
                designation=u.designation,
                role=u.role,
                status=u.status,
                force_password_change=u.force_password_change,
                last_login_at=u.last_login_at,
                failed_login_attempts=u.failed_login_attempts,
                locked_until=u.locked_until,
                profile_photo=u.profile_photo,
                reporting_manager_id=u.reporting_manager_id,
                reporting_manager_name=manager_name,
                created_at=u.created_at,
                updated_at=u.updated_at,
                assigned_roles=[RoleOut.model_validate(r) for r in assigned_roles],
                departments=[DepartmentOut.model_validate(d) for d in departments],
                primary_department_id=primary_dept.id if primary_dept else None,
                primary_department_name=primary_dept.name if primary_dept else None,
            ).model_dump()
        )

    return PaginatedResponse(items=result_items, total=total, page=page, page_size=page_size, pages=pages)


@router.post("/users", response_model=UserDetailOut, status_code=201)
def create_user_admin(
    payload: UserCreateAdmin,
    req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new user with assigned roles, department, and credentials."""
    if not can_user(db, current_user, "create", "users"):
        raise HTTPException(status_code=403, detail="Permission denied to create users")

    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="User with this email already exists")

    if payload.username and db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username is already taken")

    user = User(
        email=payload.email,
        username=payload.username,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        mobile=payload.mobile,
        employee_id=payload.employee_id,
        designation=payload.designation,
        role=payload.primary_role,
        status=payload.status,
        force_password_change=payload.force_password_change,
        reporting_manager_id=payload.reporting_manager_id,
    )
    db.add(user)
    db.flush()

    # Assign roles
    if payload.role_ids:
        for r_id in payload.role_ids:
            db.add(RbacUserRole(user_id=user.id, role_id=r_id, assigned_by=current_user.id))

    # Assign departments
    if payload.department_ids:
        for d_id in payload.department_ids:
            is_prim = (d_id == payload.primary_department_id) if payload.primary_department_id else False
            db.add(DepartmentUser(user_id=user.id, department_id=d_id, is_primary=is_prim, assigned_by=current_user.id))

    db.commit()
    db.refresh(user)

    log_audit_event(
        db,
        action_type=AuditActionType.USER_CREATED,
        user_id=current_user.id,
        module="administration",
        resource="users",
        record_id=str(user.id),
        new_value={"email": user.email, "full_name": user.full_name, "role": user.role},
        req=req,
    )

    return get_user_detail(user.id, db, current_user)


@router.get("/users/{user_id}", response_model=UserDetailOut)
def get_user_detail(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get complete detail of a user including roles and departments."""
    if not can_user(db, current_user, "view", "users"):
        raise HTTPException(status_code=403, detail="Permission denied")

    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=4404, detail="User not found")

    assigned_roles = [ur.role for ur in u.user_roles if ur.role]
    departments = [du.department for du in u.department_users if du.department]
    primary_dept = next((d for d in departments if any(du.is_primary for du in u.department_users if du.department_id == d.id)), departments[0] if departments else None)
    manager_name = u.reporting_manager.full_name if u.reporting_manager else None

    return UserDetailOut(
        id=u.id,
        email=u.email,
        full_name=u.full_name,
        username=u.username,
        mobile=u.mobile,
        employee_id=u.employee_id,
        designation=u.designation,
        role=u.role,
        status=u.status,
        force_password_change=u.force_password_change,
        last_login_at=u.last_login_at,
        failed_login_attempts=u.failed_login_attempts,
        locked_until=u.locked_until,
        profile_photo=u.profile_photo,
        reporting_manager_id=u.reporting_manager_id,
        reporting_manager_name=manager_name,
        created_at=u.created_at,
        updated_at=u.updated_at,
        assigned_roles=[RoleOut.model_validate(r) for r in assigned_roles],
        departments=[DepartmentOut.model_validate(d) for d in departments],
        primary_department_id=primary_dept.id if primary_dept else None,
        primary_department_name=primary_dept.name if primary_dept else None,
    )


@router.patch("/users/{user_id}", response_model=UserDetailOut)
def update_user_admin(
    user_id: int,
    payload: UserUpdateAdmin,
    req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update user information across profile, account, roles, and department tabs."""
    if not can_user(db, current_user, "edit", "users"):
        raise HTTPException(status_code=403, detail="Permission denied to edit users")

    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    old_data = {"email": u.email, "full_name": u.full_name, "status": u.status, "role": u.role}

    if payload.email is not None:
        u.email = payload.email
    if payload.full_name is not None:
        u.full_name = payload.full_name
    if payload.username is not None:
        u.username = payload.username
    if payload.mobile is not None:
        u.mobile = payload.mobile
    if payload.employee_id is not None:
        u.employee_id = payload.employee_id
    if payload.designation is not None:
        u.designation = payload.designation
    if payload.primary_role is not None:
        u.role = payload.primary_role
    if payload.status is not None:
        u.status = payload.status
    if payload.force_password_change is not None:
        u.force_password_change = payload.force_password_change
    if payload.reporting_manager_id is not None:
        u.reporting_manager_id = payload.reporting_manager_id
    if payload.password:
        u.password_hash = hash_password(payload.password)

    # Update role assignments
    if payload.role_ids is not None:
        db.query(RbacUserRole).filter(RbacUserRole.user_id == u.id).delete()
        for r_id in payload.role_ids:
            db.add(RbacUserRole(user_id=u.id, role_id=r_id, assigned_by=current_user.id))

    # Update department assignments
    if payload.department_ids is not None:
        db.query(DepartmentUser).filter(DepartmentUser.user_id == u.id).delete()
        for d_id in payload.department_ids:
            is_prim = (d_id == payload.primary_department_id) if payload.primary_department_id else False
            db.add(DepartmentUser(user_id=u.id, department_id=d_id, is_primary=is_prim, assigned_by=current_user.id))

    db.commit()
    db.refresh(u)

    log_audit_event(
        db,
        action_type=AuditActionType.USER_UPDATED,
        user_id=current_user.id,
        module="administration",
        resource="users",
        record_id=str(u.id),
        previous_value=old_data,
        new_value={"email": u.email, "full_name": u.full_name, "status": u.status, "role": u.role},
        req=req,
    )

    return get_user_detail(u.id, db, current_user)


@router.delete("/users/{user_id}", status_code=204)
def delete_user_admin(
    user_id: int,
    req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft delete user by setting status to INACTIVE."""
    if not can_user(db, current_user, "delete", "users"):
        raise HTTPException(status_code=403, detail="Permission denied to delete users")

    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    if u.email == "admin@kim.com":
        raise HTTPException(status_code=400, detail="Cannot delete default Super Admin account")

    u.status = UserStatus.INACTIVE
    db.commit()

    log_audit_event(
        db,
        action_type=AuditActionType.USER_DELETED,
        user_id=current_user.id,
        module="administration",
        resource="users",
        record_id=str(u.id),
        previous_value={"status": "ACTIVE"},
        new_value={"status": "INACTIVE"},
        req=req,
    )


@router.get("/users/{user_id}/effective-permissions", response_model=EffectiveAccessSummary)
def get_user_effective_permissions_view(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get visual effective permission tree calculation for any user."""
    if not can_user(db, current_user, "view", "users"):
        raise HTTPException(status_code=403, detail="Permission denied")

    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    return get_user_effective_permissions_data(db, u)


@router.post("/users/{user_id}/permissions")
def update_user_direct_permission(
    user_id: int,
    payload: UserPermissionOverrideInput,
    req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Configure direct user-specific permission override (Grant or Restrict)."""
    if not can_user(db, current_user, "edit", "permissions"):
        raise HTTPException(status_code=403, detail="Permission denied")

    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    existing = (
        db.query(UserPermission)
        .filter(UserPermission.user_id == u.id, UserPermission.permission_id == payload.permission_id)
        .first()
    )
    if existing:
        existing.granted = payload.granted
        existing.reason = payload.reason
        existing.assigned_by = current_user.id
    else:
        db.add(
            UserPermission(
                user_id=u.id,
                permission_id=payload.permission_id,
                granted=payload.granted,
                reason=payload.reason,
                assigned_by=current_user.id,
            )
        )

    db.commit()

    log_audit_event(
        db,
        action_type=AuditActionType.PERMISSION_CHANGED,
        user_id=current_user.id,
        module="administration",
        resource="users",
        record_id=str(u.id),
        new_value={"permission_id": payload.permission_id, "granted": payload.granted},
        req=req,
    )
    return {"message": "User permission updated successfully"}


# ---------------------------------------------------------------------------
# 2. ROLE MANAGEMENT ENDPOINTS
# ---------------------------------------------------------------------------

@router.get("/roles", response_model=list[RoleOut])
def list_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all dynamic roles with assigned user count and permission count."""
    if not can_user(db, current_user, "view", "roles"):
        raise HTTPException(status_code=403, detail="Permission denied to view roles")

    roles = db.query(Role).order_by(Role.id.asc()).all()
    result = []

    for r in roles:
        user_cnt = db.query(func.count(RbacUserRole.id)).filter(RbacUserRole.role_id == r.id).scalar() or 0
        perm_cnt = db.query(func.count(RolePermission.id)).filter(RolePermission.role_id == r.id, RolePermission.granted == True).scalar() or 0
        perm_ids = [rp.permission_id for rp in r.permissions if rp.granted]

        result.append(
            RoleOut(
                id=r.id,
                name=r.name,
                code=r.code,
                description=r.description,
                status=r.status,
                is_system=r.is_system,
                created_at=r.created_at,
                updated_at=r.updated_at,
                created_by=r.created_by,
                creator_name=r.creator.full_name if r.creator else None,
                user_count=user_cnt,
                permission_count=perm_cnt,
                permission_ids=perm_ids,
            )
        )

    return result


@router.post("/roles", response_model=RoleOut, status_code=201)
def create_role(
    payload: RoleCreate,
    req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new role with permission matrix."""
    if not can_user(db, current_user, "create", "roles"):
        raise HTTPException(status_code=403, detail="Permission denied to create roles")

    if db.query(Role).filter(or_(Role.code == payload.code, Role.name == payload.name)).first():
        raise HTTPException(status_code=400, detail="Role with this name or code already exists")

    role = Role(
        name=payload.name,
        code=payload.code,
        description=payload.description,
        status=payload.status,
        is_system=False,
        created_by=current_user.id,
    )
    db.add(role)
    db.flush()

    if payload.permission_ids:
        for p_id in payload.permission_ids:
            db.add(RolePermission(role_id=role.id, permission_id=p_id, granted=True))

    db.commit()
    db.refresh(role)

    log_audit_event(
        db,
        action_type=AuditActionType.ROLE_CREATED,
        user_id=current_user.id,
        module="administration",
        resource="roles",
        record_id=str(role.id),
        new_value={"name": role.name, "code": role.code},
        req=req,
    )

    return list_roles(db, current_user)[-1]


@router.patch("/roles/{role_id}", response_model=RoleOut)
def update_role(
    role_id: int,
    payload: RoleUpdate,
    req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update role details and permission matrix."""
    if not can_user(db, current_user, "edit", "roles"):
        raise HTTPException(status_code=403, detail="Permission denied to edit roles")

    role = db.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    if payload.name is not None:
        role.name = payload.name
    if payload.description is not None:
        role.description = payload.description
    if payload.status is not None:
        role.status = payload.status

    if payload.permission_ids is not None:
        db.query(RolePermission).filter(RolePermission.role_id == role.id).delete()
        for p_id in payload.permission_ids:
            db.add(RolePermission(role_id=role.id, permission_id=p_id, granted=True))

    db.commit()
    db.refresh(role)

    log_audit_event(
        db,
        action_type=AuditActionType.ROLE_UPDATED,
        user_id=current_user.id,
        module="administration",
        resource="roles",
        record_id=str(role.id),
        new_value={"name": role.name, "permission_count": len(payload.permission_ids or [])},
        req=req,
    )

    return next((r for r in list_roles(db, current_user) if r.id == role.id), None)


@router.post("/roles/{role_id}/duplicate", response_model=RoleOut, status_code=201)
def duplicate_role(
    role_id: int,
    payload: RoleDuplicateInput,
    req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Duplicate an existing role with all its permissions."""
    if not can_user(db, current_user, "create", "roles"):
        raise HTTPException(status_code=403, detail="Permission denied")

    source_role = db.get(Role, role_id)
    if not source_role:
        raise HTTPException(status_code=404, detail="Source role not found")

    new_role = Role(
        name=payload.new_name,
        code=payload.new_code,
        description=payload.description or f"Copy of {source_role.name}",
        status=PermissionStatus.ACTIVE,
        is_system=False,
        created_by=current_user.id,
    )
    db.add(new_role)
    db.flush()

    # Copy permissions
    for rp in source_role.permissions:
        if rp.granted:
            db.add(RolePermission(role_id=new_role.id, permission_id=rp.permission_id, granted=True))

    db.commit()
    db.refresh(new_role)

    log_audit_event(
        db,
        action_type=AuditActionType.ROLE_DUPLICATED,
        user_id=current_user.id,
        module="administration",
        resource="roles",
        record_id=str(new_role.id),
        previous_value={"source_role_id": role_id},
        new_value={"new_role_id": new_role.id, "name": new_role.name},
        req=req,
    )

    return next((r for r in list_roles(db, current_user) if r.id == new_role.id), None)


@router.delete("/roles/{role_id}", status_code=204)
def delete_role(
    role_id: int,
    req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete role if it is not currently assigned to any active user."""
    if not can_user(db, current_user, "delete", "roles"):
        raise HTTPException(status_code=403, detail="Permission denied")

    role = db.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    if role.is_system:
        raise HTTPException(status_code=400, detail="Cannot delete system role")

    user_count = db.query(RbacUserRole).filter(RbacUserRole.role_id == role.id).count()
    if user_count > 0:
        raise HTTPException(status_code=400, detail=f"Role is assigned to {user_count} users. Reassign users before deleting.")

    db.delete(role)
    db.commit()

    log_audit_event(
        db,
        action_type=AuditActionType.ROLE_DELETED,
        user_id=current_user.id,
        module="administration",
        resource="roles",
        record_id=str(role_id),
        req=req,
    )


# ---------------------------------------------------------------------------
# 3. DEPARTMENT MANAGEMENT ENDPOINTS
# ---------------------------------------------------------------------------

@router.get("/departments", response_model=list[DepartmentOut])
def list_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List departments with employee count and manager names."""
    if not can_user(db, current_user, "view", "departments"):
        raise HTTPException(status_code=403, detail="Permission denied to view departments")

    depts = db.query(Department).order_by(Department.id.asc()).all()
    result = []

    for d in depts:
        emp_cnt = db.query(func.count(DepartmentUser.id)).filter(DepartmentUser.department_id == d.id).scalar() or 0
        head_name = d.head.full_name if d.head else None
        parent_name = d.parent.name if d.parent else None

        result.append(
            DepartmentOut(
                id=d.id,
                name=d.name,
                code=d.code,
                description=d.description,
                parent_id=d.parent_id,
                head_id=d.head_id,
                status=d.status,
                created_at=d.created_at,
                updated_at=d.updated_at,
                employee_count=emp_cnt,
                head_name=head_name,
                parent_name=parent_name,
            )
        )

    return result


@router.get("/departments/tree", response_model=list[DepartmentTreeNode])
def get_department_tree(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get department hierarchy tree."""
    if not can_user(db, current_user, "view", "departments"):
        raise HTTPException(status_code=403, detail="Permission denied")

    all_depts = list_departments(db, current_user)
    dept_map = {d.id: DepartmentTreeNode(**d.model_dump(), children=[]) for d in all_depts}
    root_nodes = []

    for d in all_depts:
        node = dept_map[d.id]
        if d.parent_id and d.parent_id in dept_map:
            dept_map[d.parent_id].children.append(node)
        else:
            root_nodes.append(node)

    return root_nodes


@router.post("/departments", response_model=DepartmentOut, status_code=201)
def create_department(
    payload: DepartmentCreate,
    req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new department."""
    if not can_user(db, current_user, "create", "departments"):
        raise HTTPException(status_code=403, detail="Permission denied to create departments")

    if db.query(Department).filter(or_(Department.code == payload.code, Department.name == payload.name)).first():
        raise HTTPException(status_code=400, detail="Department with this name or code already exists")

    dept = Department(
        name=payload.name,
        code=payload.code,
        description=payload.description,
        parent_id=payload.parent_id,
        head_id=payload.head_id,
        status=payload.status,
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)

    log_audit_event(
        db,
        action_type=AuditActionType.DEPARTMENT_CREATED,
        user_id=current_user.id,
        module="administration",
        resource="departments",
        record_id=str(dept.id),
        new_value={"name": dept.name, "code": dept.code},
        req=req,
    )

    return next((d for d in list_departments(db, current_user) if d.id == dept.id), None)


@router.patch("/departments/{dept_id}", response_model=DepartmentOut)
def update_department(
    dept_id: int,
    payload: DepartmentUpdate,
    req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update department details."""
    if not can_user(db, current_user, "edit", "departments"):
        raise HTTPException(status_code=403, detail="Permission denied to edit departments")

    dept = db.get(Department, dept_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    if payload.name is not None:
        dept.name = payload.name
    if payload.description is not None:
        dept.description = payload.description
    if payload.parent_id is not None:
        dept.parent_id = payload.parent_id
    if payload.head_id is not None:
        dept.head_id = payload.head_id
    if payload.status is not None:
        dept.status = payload.status

    db.commit()
    db.refresh(dept)

    log_audit_event(
        db,
        action_type=AuditActionType.DEPARTMENT_UPDATED,
        user_id=current_user.id,
        module="administration",
        resource="departments",
        record_id=str(dept.id),
        new_value={"name": dept.name},
        req=req,
    )

    return next((d for d in list_departments(db, current_user) if d.id == dept.id), None)


# ---------------------------------------------------------------------------
# 4. PERMISSIONS & AUDIT LOGS ENDPOINTS
# ---------------------------------------------------------------------------

@router.get("/permissions", response_model=list[ModuleOut])
def get_permissions_registry(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get full system permission registry hierarchy (Module -> Resource -> Action)."""
    if not can_user(db, current_user, "view", "permissions"):
        raise HTTPException(status_code=403, detail="Permission denied")

    modules = db.query(Module).order_by(Module.display_order.asc()).all()
    return [ModuleOut.model_validate(m) for m in modules]


@router.post("/permissions/custom-action", response_model=ActionOut, status_code=201)
def create_custom_action(
    payload: CustomPermissionCreate,
    req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create custom action and register corresponding permission."""
    if not can_user(db, current_user, "create", "permissions"):
        raise HTTPException(status_code=403, detail="Permission denied")

    res = db.get(Resource, payload.resource_id)
    if not res:
        raise HTTPException(status_code=404, detail="Resource not found")

    act = Action(
        resource_id=res.id,
        name=payload.action_name,
        code=payload.action_code,
        description=payload.description,
        status=PermissionStatus.ACTIVE,
    )
    db.add(act)
    db.flush()

    perm_code = f"{res.module.code}:{res.code}:{act.code}"
    db.add(
        Permission(
            module_id=res.module_id,
            resource_id=res.id,
            action_id=act.id,
            code=perm_code,
            description=f"{act.name} permission on {res.name}",
            status=PermissionStatus.ACTIVE,
        )
    )

    db.commit()
    db.refresh(act)
    return ActionOut.model_validate(act)


@router.get("/audit-logs", response_model=PaginatedResponse)
def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    action_type: AuditActionType | None = None,
    user_id: int | None = None,
    module: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List access and security audit logs with search and multi-filtering."""
    if not can_user(db, current_user, "view", "audit_logs"):
        raise HTTPException(status_code=403, detail="Permission denied to view audit logs")

    query = db.query(AuditLog)

    if action_type:
        query = query.filter(AuditLog.action_type == action_type)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if module:
        query = query.filter(AuditLog.module == module)
    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                AuditLog.module.ilike(s),
                AuditLog.resource.ilike(s),
                AuditLog.record_id.ilike(s),
                AuditLog.previous_value.ilike(s),
                AuditLog.new_value.ilike(s),
            )
        )

    total = query.count()
    pages = (total + page_size - 1) // page_size
    logs = query.order_by(AuditLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for l in logs:
        items.append(
            AuditLogOut(
                id=l.id,
                user_id=l.user_id,
                user_name=l.user.full_name if l.user else "System",
                action_type=l.action_type,
                module=l.module,
                resource=l.resource,
                record_id=l.record_id,
                previous_value=l.previous_value,
                new_value=l.new_value,
                ip_address=l.ip_address,
                user_agent=l.user_agent,
                success=l.success,
                error_message=l.error_message,
                created_at=l.created_at,
            ).model_dump()
        )

    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size, pages=pages)
