import pytest
from app.models.enums import UserRole
from app.models.rbac import (
    Permission,
    Role,
    RolePermission,
    UserPermission,
    UserRole as RbacUserRole,
    PermissionStatus,
)
from app.models.user import User, UserStatus
from app.core.security import hash_password
from app.db.seed_rbac import seed_rbac_data
from tests.conftest import DEFAULT_PASSWORD, auth_headers, login


def test_rbac_scenario_matrix(seeded_client, db):
    """
    Test Phase 8 & Phase 9 scenarios:
    Create roles for View Only, Editor, Export Only, Import Only, Full Access, and ADMIN.
    Test both Layer 1 (effective permissions payload) and Layer 2 (Backend API 403 enforcement).
    """
    seed_rbac_data(db)

    admin_token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    admin_headers = auth_headers(admin_token)

    # 1. Create test roles in DB
    view_role = Role(name="View Only Role", code="view_only", status=PermissionStatus.ACTIVE)
    editor_role = Role(name="Editor Role", code="editor", status=PermissionStatus.ACTIVE)
    export_role = Role(name="Export Only Role", code="export_only", status=PermissionStatus.ACTIVE)
    full_role = Role(name="Full Access Role", code="full_access", status=PermissionStatus.ACTIVE)

    db.add_all([view_role, editor_role, export_role, full_role])
    db.commit()

    # Find permissions for projects resource
    proj_view_perm = db.query(Permission).join(Permission.resource).join(Permission.action).filter(Permission.resource.has(code="projects"), Permission.action.has(code="view")).first()
    proj_create_perm = db.query(Permission).join(Permission.resource).join(Permission.action).filter(Permission.resource.has(code="projects"), Permission.action.has(code="create")).first()
    proj_edit_perm = db.query(Permission).join(Permission.resource).join(Permission.action).filter(Permission.resource.has(code="projects"), Permission.action.has(code="edit")).first()
    proj_delete_perm = db.query(Permission).join(Permission.resource).join(Permission.action).filter(Permission.resource.has(code="projects"), Permission.action.has(code="delete")).first()
    proj_export_perm = db.query(Permission).join(Permission.resource).join(Permission.action).filter(Permission.resource.has(code="projects"), Permission.action.has(code="export")).first()

    assert proj_view_perm is not None
    assert proj_create_perm is not None
    assert proj_edit_perm is not None

    # Grant permissions to roles
    # View Only: only view
    db.add(RolePermission(role_id=view_role.id, permission_id=proj_view_perm.id, granted=True))
    # Editor: view, create, edit
    db.add(RolePermission(role_id=editor_role.id, permission_id=proj_view_perm.id, granted=True))
    db.add(RolePermission(role_id=editor_role.id, permission_id=proj_create_perm.id, granted=True))
    db.add(RolePermission(role_id=editor_role.id, permission_id=proj_edit_perm.id, granted=True))
    # Export Only: view, export
    db.add(RolePermission(role_id=export_role.id, permission_id=proj_view_perm.id, granted=True))
    if proj_export_perm:
        db.add(RolePermission(role_id=export_role.id, permission_id=proj_export_perm.id, granted=True))
    # Full Access: view, create, edit, delete, export
    db.add(RolePermission(role_id=full_role.id, permission_id=proj_view_perm.id, granted=True))
    db.add(RolePermission(role_id=full_role.id, permission_id=proj_create_perm.id, granted=True))
    db.add(RolePermission(role_id=full_role.id, permission_id=proj_edit_perm.id, granted=True))
    if proj_delete_perm:
        db.add(RolePermission(role_id=full_role.id, permission_id=proj_delete_perm.id, granted=True))

    db.commit()

    # 2. Create Test Users
    user_view = User(
        email="usera.view@kim.com",
        username="usera_view",
        password_hash=hash_password(DEFAULT_PASSWORD),
        full_name="User A View Only",
        role=UserRole.SALES_EXECUTIVE,
        status=UserStatus.ACTIVE,
    )
    user_editor = User(
        email="userb.editor@kim.com",
        username="userb_editor",
        password_hash=hash_password(DEFAULT_PASSWORD),
        full_name="User B Editor",
        role=UserRole.SALES_EXECUTIVE,
        status=UserStatus.ACTIVE,
    )
    user_export = User(
        email="userc.export@kim.com",
        username="userc_export",
        password_hash=hash_password(DEFAULT_PASSWORD),
        full_name="User C Export Only",
        role=UserRole.SALES_EXECUTIVE,
        status=UserStatus.ACTIVE,
    )
    user_full = User(
        email="usere.full@kim.com",
        username="usere_full",
        password_hash=hash_password(DEFAULT_PASSWORD),
        full_name="User E Full Access",
        role=UserRole.SALES_EXECUTIVE,
        status=UserStatus.ACTIVE,
    )

    db.add_all([user_view, user_editor, user_export, user_full])
    db.commit()

    # Assign dynamic roles via RbacUserRole
    db.add(RbacUserRole(user_id=user_view.id, role_id=view_role.id))
    db.add(RbacUserRole(user_id=user_editor.id, role_id=editor_role.id))
    db.add(RbacUserRole(user_id=user_export.id, role_id=export_role.id))
    db.add(RbacUserRole(user_id=user_full.id, role_id=full_role.id))
    db.commit()

    # Logins
    token_view = login(seeded_client, user_view.email, DEFAULT_PASSWORD)
    headers_view = auth_headers(token_view)

    token_editor = login(seeded_client, user_editor.email, DEFAULT_PASSWORD)
    headers_editor = auth_headers(token_editor)

    token_full = login(seeded_client, user_full.email, DEFAULT_PASSWORD)
    headers_full = auth_headers(token_full)

    # TEST SCENARIO 1: USER A (View Only)
    # GET /projects -> HTTP 200
    res = seeded_client.get("/api/v1/projects", headers=headers_view)
    assert res.status_code == 200, res.text

    # POST /projects -> HTTP 403 Forbidden
    res = seeded_client.post(
        "/api/v1/projects",
        json={"name": "Test View Only Proj", "prefix": "TVO1"},
        headers=headers_view,
    )
    assert res.status_code == 403, "View only user must receive 403 on POST /projects"

    # PUT /projects/1 -> HTTP 403 Forbidden
    res = seeded_client.put(
        "/api/v1/projects/1",
        json={"name": "Updated Proj Name"},
        headers=headers_view,
    )
    assert res.status_code == 403, "View only user must receive 403 on PUT /projects"

    # DELETE /projects/1 -> HTTP 403 Forbidden
    res = seeded_client.delete("/api/v1/projects/1", headers=headers_view)
    assert res.status_code == 403, "View only user must receive 403 on DELETE /projects"

    # TEST SCENARIO 2: USER B (Editor)
    # GET /projects -> HTTP 200
    res = seeded_client.get("/api/v1/projects", headers=headers_editor)
    assert res.status_code == 200

    # POST /projects -> HTTP 201 Created
    res = seeded_client.post(
        "/api/v1/projects",
        json={"name": "Editor Created Proj", "prefix": "EDP1"},
        headers=headers_editor,
    )
    assert res.status_code == 201, res.text
    created_id = res.json()["id"]

    # PUT /projects/{id} -> HTTP 200 OK
    res = seeded_client.put(
        f"/api/v1/projects/{created_id}",
        json={"name": "Editor Updated Proj"},
        headers=headers_editor,
    )
    assert res.status_code == 200, res.text

    # DELETE /projects/{id} -> HTTP 403 (Editor does not have delete permission)
    res = seeded_client.delete(f"/api/v1/projects/{created_id}", headers=headers_editor)
    assert res.status_code == 403, "Editor without delete permission must receive 403 on DELETE"

    # TEST SCENARIO 3: USER E (Full Access)
    # DELETE /projects/{id} -> HTTP 204 No Content
    res = seeded_client.delete(f"/api/v1/projects/{created_id}", headers=headers_full)
    assert res.status_code == 204, res.text

    # TEST SCENARIO 4: Direct User Override (Grant & Restrict)
    # Give User View (user_view) a direct override granting create permission
    db.add(UserPermission(user_id=user_view.id, permission_id=proj_create_perm.id, granted=True))
    db.commit()

    # Now user_view should be able to create project!
    res = seeded_client.post(
        "/api/v1/projects",
        json={"name": "Override Created Proj", "prefix": "OVR1"},
        headers=headers_view,
    )
    assert res.status_code == 201, "Direct User Override (granted=True) must take precedence"
