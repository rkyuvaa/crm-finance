"""Seed script for initializing RBAC default modules, resources, actions, permissions, roles, and departments."""

from sqlalchemy.orm import Session
from app.models.rbac import (
    Action,
    AuditActionType,
    Department,
    DepartmentUser,
    FieldPermissionType,
    Module,
    Permission,
    PermissionStatus,
    Resource,
    Role,
    RoleDataScope,
    RolePermission,
    UserRole as RbacUserRole,
    DataScopeType,
)
from app.models.user import User
from app.models.enums import UserRole


def seed_rbac_data(db: Session) -> None:
    """Populate default RBAC structure if not present."""
    # 1. Modules
    modules_data = [
        {"name": "CRM Management", "code": "crm", "display_order": 1, "icon": "Users"},
        {"name": "Administration", "code": "administration", "display_order": 2, "icon": "ShieldCheck"},
        {"name": "Reports & Analytics", "code": "reports", "display_order": 3, "icon": "BarChart3"},
        {"name": "System Configuration", "code": "configuration", "display_order": 4, "icon": "Settings2"},
    ]

    modules_map = {}
    for m in modules_data:
        mod = db.query(Module).filter(Module.code == m["code"]).first()
        if not mod:
            mod = Module(
                name=m["name"],
                code=m["code"],
                display_order=m["display_order"],
                icon=m["icon"],
                status=PermissionStatus.ACTIVE,
            )
            db.add(mod)
            db.flush()
        modules_map[m["code"]] = mod

    # 2. Resources
    resources_data = [
        {"module_code": "crm", "name": "Leads", "code": "leads", "display_order": 1},
        {"module_code": "crm", "name": "Customers", "code": "customers", "display_order": 2},
        {"module_code": "crm", "name": "Opportunities", "code": "opportunities", "display_order": 3},
        {"module_code": "crm", "name": "Activities", "code": "activities", "display_order": 4},
        {"module_code": "administration", "name": "Users", "code": "users", "display_order": 1},
        {"module_code": "administration", "name": "Roles", "code": "roles", "display_order": 2},
        {"module_code": "administration", "name": "Departments", "code": "departments", "display_order": 3},
        {"module_code": "administration", "name": "Permissions", "code": "permissions", "display_order": 4},
        {"module_code": "administration", "name": "Access Audit Log", "code": "audit_logs", "display_order": 5},
        {"module_code": "reports", "name": "Reports Summary", "code": "summary_reports", "display_order": 1},
        {"module_code": "configuration", "name": "System Masters", "code": "masters", "display_order": 1},
        {"module_code": "configuration", "name": "Automove Rules", "code": "automove_rules", "display_order": 2},
    ]

    resources_map = {}
    for r in resources_data:
        mod = modules_map.get(r["module_code"])
        if not mod:
            continue
        res = db.query(Resource).filter(Resource.module_id == mod.id, Resource.code == r["code"]).first()
        if not res:
            res = Resource(
                module_id=mod.id,
                name=r["name"],
                code=r["code"],
                display_order=r["display_order"],
                status=PermissionStatus.ACTIVE,
            )
            db.add(res)
            db.flush()
        resources_map[r["code"]] = res

    # 3. Actions
    standard_actions = [
        {"name": "View", "code": "view", "display_order": 1},
        {"name": "Create", "code": "create", "display_order": 2},
        {"name": "Edit", "code": "edit", "display_order": 3},
        {"name": "Delete", "code": "delete", "display_order": 4},
        {"name": "Export", "code": "export", "display_order": 5},
        {"name": "Import", "code": "import", "display_order": 6},
        {"name": "Approve", "code": "approve", "display_order": 7},
    ]

    actions_map = {}
    for res_code, res in resources_map.items():
        actions_map[res_code] = {}
        for a in standard_actions:
            act = db.query(Action).filter(Action.resource_id == res.id, Action.code == a["code"]).first()
            if not act:
                act = Action(
                    resource_id=res.id,
                    name=a["name"],
                    code=a["code"],
                    display_order=a["display_order"],
                    status=PermissionStatus.ACTIVE,
                )
                db.add(act)
                db.flush()
            actions_map[res_code][a["code"]] = act

    # 4. Permissions (module:resource:action)
    permissions_map = {}
    for res_code, res in resources_map.items():
        for act_code, act in actions_map[res_code].items():
            perm_code = f"{res.module.code}:{res_code}:{act_code}"
            perm = db.query(Permission).filter(Permission.code == perm_code).first()
            if not perm:
                perm = Permission(
                    module_id=res.module_id,
                    resource_id=res.id,
                    action_id=act.id,
                    code=perm_code,
                    description=f"{act.name} permission on {res.name}",
                    status=PermissionStatus.ACTIVE,
                )
                db.add(perm)
                db.flush()
            permissions_map[perm_code] = perm

    # 5. Departments
    root_dept = db.query(Department).filter(Department.code == "COMPANY").first()
    if not root_dept:
        root_dept = Department(name="KIM Finance HQ", code="COMPANY", description="Headquarters", status=PermissionStatus.ACTIVE)
        db.add(root_dept)
        db.flush()

    depts_data = [
        {"name": "Sales", "code": "SALES", "parent_id": root_dept.id},
        {"name": "Domestic Sales", "code": "DOM_SALES", "parent_id": None}, # will set after sales
        {"name": "International Sales", "code": "INT_SALES", "parent_id": None},
        {"name": "Finance", "code": "FINANCE", "parent_id": root_dept.id},
        {"name": "HR & Admin", "code": "HR", "parent_id": root_dept.id},
        {"name": "Operations", "code": "OPERATIONS", "parent_id": root_dept.id},
        {"name": "IT & Systems", "code": "IT", "parent_id": root_dept.id},
    ]

    sales_dept = db.query(Department).filter(Department.code == "SALES").first()
    if not sales_dept:
        sales_dept = Department(name="Sales", code="SALES", description="Sales & Business Development", parent_id=root_dept.id, status=PermissionStatus.ACTIVE)
        db.add(sales_dept)
        db.flush()

    for d in depts_data:
        dept = db.query(Department).filter(Department.code == d["code"]).first()
        if not dept:
            parent_id = d["parent_id"]
            if d["code"] in ["DOM_SALES", "INT_SALES"]:
                parent_id = sales_dept.id
            dept = Department(name=d["name"], code=d["code"], parent_id=parent_id, status=PermissionStatus.ACTIVE)
            db.add(dept)
            db.flush()

    # 6. Roles
    default_roles = [
        {"name": "Super Admin", "code": "super_admin", "is_system": True, "description": "Full system access & administration"},
        {"name": "Admin", "code": "admin", "is_system": True, "description": "Administrative control and user management"},
        {"name": "Sales Manager", "code": "sales_manager", "is_system": False, "description": "Departmental sales overview and approvals"},
        {"name": "Sales Executive", "code": "sales_executive", "is_system": False, "description": "Lead creation and assigned application processing"},
        {"name": "Finance Officer", "code": "finance_officer", "is_system": False, "description": "Sanction and loan disbursement processing"},
        {"name": "Delivery Team", "code": "delivery_team", "is_system": False, "description": "Vehicle delivery and document verification"},
        {"name": "HR Manager", "code": "hr_manager", "is_system": False, "description": "Employee and user status management"},
        {"name": "Employee", "code": "employee", "is_system": False, "description": "Base employee role"},
    ]

    roles_map = {}
    for r in default_roles:
        role = db.query(Role).filter(Role.code == r["code"]).first()
        if not role:
            role = Role(
                name=r["name"],
                code=r["code"],
                is_system=r["is_system"],
                description=r["description"],
                status=PermissionStatus.ACTIVE,
            )
            db.add(role)
            db.flush()
        roles_map[r["code"]] = role

    # Assign all permissions to Super Admin & Admin
    all_perms = db.query(Permission).all()
    super_admin_role = roles_map.get("super_admin")
    admin_role = roles_map.get("admin")

    for p in all_perms:
        if super_admin_role:
            rp = db.query(RolePermission).filter(RolePermission.role_id == super_admin_role.id, RolePermission.permission_id == p.id).first()
            if not rp:
                db.add(RolePermission(role_id=super_admin_role.id, permission_id=p.id, granted=True))
        if admin_role:
            rp = db.query(RolePermission).filter(RolePermission.role_id == admin_role.id, RolePermission.permission_id == p.id).first()
            if not rp:
                db.add(RolePermission(role_id=admin_role.id, permission_id=p.id, granted=True))

    # Link Super Admin role to default admin user
    admin_user = db.query(User).filter(User.email == "admin@kim.com").first()
    if admin_user and super_admin_role:
        ur = db.query(RbacUserRole).filter(RbacUserRole.user_id == admin_user.id, RbacUserRole.role_id == super_admin_role.id).first()
        if not ur:
            db.add(RbacUserRole(user_id=admin_user.id, role_id=super_admin_role.id, is_primary=True))

    db.commit()
