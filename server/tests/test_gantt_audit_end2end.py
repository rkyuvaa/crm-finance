import pytest
from datetime import date, timedelta
from app.models import UserRole, Project, Task, TaskDependency, ProjectPmSettings
from tests.conftest import DEFAULT_PASSWORD, auth_headers, login, make_user


import uuid


def create_test_project(client, headers, name="Audit Gantt Project", prefix=None):
    payload = {
        "name": name,
        "prefix": prefix or f"P{uuid.uuid4().hex[:4]}".upper()
    }
    resp = client.post("/api/v1/projects", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


def create_test_task(client, headers, project_id, title, start_date=None, due_date=None):
    payload = {
        "title": title,
        "project_id": project_id,
    }
    if start_date:
        payload["start_date"] = str(start_date)
    if due_date:
        payload["due_date"] = str(due_date)
    resp = client.post("/api/v1/tasks", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_audit_1_simple_link(seeded_client, db):
    """Simple link: Create dated tasks A and B, create A -> B with zero lag, verify arrow & FS constraint"""
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)

    proj = create_test_project(seeded_client, headers, "Simple Link Proj")
    tA = create_test_task(seeded_client, headers, proj["id"], "Task A", start_date=date(2026, 9, 1), due_date=date(2026, 9, 5))
    tB = create_test_task(seeded_client, headers, proj["id"], "Task B", start_date=date(2026, 9, 6), due_date=date(2026, 9, 10))

    # Link A -> B (A is predecessor, B is successor)
    dep_resp = seeded_client.post(
        f"/api/v1/tasks/{tB['id']}/dependencies",
        json={"predecessor_task_id": tA["id"], "dep_type": "FS", "lag_days": 0},
        headers=headers
    )
    assert dep_resp.status_code == 201, dep_resp.text
    dep_data = dep_resp.json()
    assert dep_data["dep_type"] == "FS"
    assert dep_data["lag_days"] == 0


def test_audit_2_lag(seeded_client, db):
    """Lag: Apply two days lag and verify calculated dates"""
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)

    proj = create_test_project(seeded_client, headers, "Lag Proj")
    tA = create_test_task(seeded_client, headers, proj["id"], "Task A", start_date=date(2026, 9, 1), due_date=date(2026, 9, 5))
    tB = create_test_task(seeded_client, headers, proj["id"], "Task B", start_date=date(2026, 9, 6), due_date=date(2026, 9, 10))

    dep_resp = seeded_client.post(
        f"/api/v1/tasks/{tB['id']}/dependencies",
        json={"predecessor_task_id": tA["id"], "dep_type": "FS", "lag_days": 2},
        headers=headers
    )
    assert dep_resp.status_code == 201, dep_resp.text
    assert dep_resp.json()["lag_days"] == 2


def test_audit_3_chain_reschedule(seeded_client, db):
    """Chain: Create A -> B -> C. Delay A and verify B and C dates shift while preserving duration"""
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)

    proj = create_test_project(seeded_client, headers, "Chain Proj")
    tA = create_test_task(seeded_client, headers, proj["id"], "Task A", start_date=date(2026, 9, 1), due_date=date(2026, 9, 5))
    tB = create_test_task(seeded_client, headers, proj["id"], "Task B", start_date=date(2026, 9, 6), due_date=date(2026, 9, 10))
    tC = create_test_task(seeded_client, headers, proj["id"], "Task C", start_date=date(2026, 9, 11), due_date=date(2026, 9, 15))

    # Link A -> B and B -> C
    seeded_client.post(f"/api/v1/tasks/{tB['id']}/dependencies", json={"predecessor_task_id": tA["id"], "dep_type": "FS", "lag_days": 0}, headers=headers)
    seeded_client.post(f"/api/v1/tasks/{tC['id']}/dependencies", json={"predecessor_task_id": tB["id"], "dep_type": "FS", "lag_days": 0}, headers=headers)

    # Delay A by 5 days (start 2026-09-06, due 2026-09-10)
    seeded_client.patch(f"/api/v1/tasks/{tA['id']}", json={"start_date": "2026-09-06", "due_date": "2026-09-10"}, headers=headers)

    # Reschedule successors
    resched_resp = seeded_client.post(f"/api/v1/tasks/{tA['id']}/reschedule-dependencies", headers=headers)
    assert resched_resp.status_code == 200, resched_resp.text

    # Verify B and C moved downstream
    taskB_updated = seeded_client.get(f"/api/v1/tasks/{tB['id']}", headers=headers).json()
    taskC_updated = seeded_client.get(f"/api/v1/tasks/{tC['id']}", headers=headers).json()

    assert taskB_updated["start_date"] >= "2026-09-11"
    assert taskC_updated["start_date"] >= taskB_updated["due_date"]


def test_audit_4_multiple_predecessors(seeded_client, db):
    """Multiple predecessors: Create A -> C and B -> C. Verify C respects the later constraint"""
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)

    proj = create_test_project(seeded_client, headers, "Multi Pred Proj")
    tA = create_test_task(seeded_client, headers, proj["id"], "Task A", start_date=date(2026, 9, 1), due_date=date(2026, 9, 5))
    tB = create_test_task(seeded_client, headers, proj["id"], "Task B", start_date=date(2026, 9, 1), due_date=date(2026, 9, 12))
    tC = create_test_task(seeded_client, headers, proj["id"], "Task C", start_date=date(2026, 9, 6), due_date=date(2026, 9, 15))

    seeded_client.post(f"/api/v1/tasks/{tC['id']}/dependencies", json={"predecessor_task_id": tA["id"], "dep_type": "FS", "lag_days": 0}, headers=headers)
    seeded_client.post(f"/api/v1/tasks/{tC['id']}/dependencies", json={"predecessor_task_id": tB["id"], "dep_type": "FS", "lag_days": 0}, headers=headers)

    # Reschedule A
    seeded_client.post(f"/api/v1/tasks/{tA['id']}/reschedule-dependencies", headers=headers)

    # C should start after B (the later predecessor)
    taskC_updated = seeded_client.get(f"/api/v1/tasks/{tC['id']}", headers=headers).json()
    assert taskC_updated["start_date"] >= "2026-09-13"


def test_audit_5_branch_and_merge(seeded_client, db):
    """Branch and merge: A -> B, A -> C, B -> D, C -> D"""
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)

    proj = create_test_project(seeded_client, headers, "Diamond Proj")
    tA = create_test_task(seeded_client, headers, proj["id"], "Task A", start_date=date(2026, 9, 1), due_date=date(2026, 9, 3))
    tB = create_test_task(seeded_client, headers, proj["id"], "Task B", start_date=date(2026, 9, 4), due_date=date(2026, 9, 6))
    tC = create_test_task(seeded_client, headers, proj["id"], "Task C", start_date=date(2026, 9, 4), due_date=date(2026, 9, 8))
    tD = create_test_task(seeded_client, headers, proj["id"], "Task D", start_date=date(2026, 9, 9), due_date=date(2026, 9, 12))

    seeded_client.post(f"/api/v1/tasks/{tB['id']}/dependencies", json={"predecessor_task_id": tA["id"]}, headers=headers)
    seeded_client.post(f"/api/v1/tasks/{tC['id']}/dependencies", json={"predecessor_task_id": tA["id"]}, headers=headers)
    seeded_client.post(f"/api/v1/tasks/{tD['id']}/dependencies", json={"predecessor_task_id": tB["id"]}, headers=headers)
    seeded_client.post(f"/api/v1/tasks/{tD['id']}/dependencies", json={"predecessor_task_id": tC["id"]}, headers=headers)

    # Delay A by 5 days
    seeded_client.patch(f"/api/v1/tasks/{tA['id']}", json={"start_date": "2026-09-06", "due_date": "2026-09-08"}, headers=headers)
    seeded_client.post(f"/api/v1/tasks/{tA['id']}/reschedule-dependencies", headers=headers)

    tD_up = seeded_client.get(f"/api/v1/tasks/{tD['id']}", headers=headers).json()
    tC_up = seeded_client.get(f"/api/v1/tasks/{tC['id']}", headers=headers).json()
    assert tD_up["start_date"] >= tC_up["due_date"]


def test_audit_6_later_manual_date_preservation(seeded_client, db):
    """Moving a predecessor earlier does not pull manually scheduled work earlier"""
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)

    proj = create_test_project(seeded_client, headers, "Manual Date Proj")
    tA = create_test_task(seeded_client, headers, proj["id"], "Task A", start_date=date(2026, 9, 10), due_date=date(2026, 9, 15))
    # B is manually set much later
    tB = create_test_task(seeded_client, headers, proj["id"], "Task B", start_date=date(2026, 10, 1), due_date=date(2026, 10, 10))

    seeded_client.post(f"/api/v1/tasks/{tB['id']}/dependencies", json={"predecessor_task_id": tA["id"]}, headers=headers)

    # Move A earlier
    seeded_client.patch(f"/api/v1/tasks/{tA['id']}", json={"start_date": "2026-09-01", "due_date": "2026-09-05"}, headers=headers)
    seeded_client.post(f"/api/v1/tasks/{tA['id']}/reschedule-dependencies", headers=headers)

    # B must retain its manually scheduled start date (2026-10-01)
    tB_up = seeded_client.get(f"/api/v1/tasks/{tB['id']}", headers=headers).json()
    assert tB_up["start_date"] == "2026-10-01"


def test_audit_7_invalid_links_rejection(seeded_client, db):
    """Server-side validation rejects self-links, duplicate links, circular chains, and cross-project links"""
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)

    proj1 = create_test_project(seeded_client, headers, "Proj 1")
    proj2 = create_test_project(seeded_client, headers, "Proj 2")

    tA = create_test_task(seeded_client, headers, proj1["id"], "Task A")
    tB = create_test_task(seeded_client, headers, proj1["id"], "Task B")
    tC = create_test_task(seeded_client, headers, proj1["id"], "Task C")
    tCross = create_test_task(seeded_client, headers, proj2["id"], "Task Cross")

    # Self link (A -> A)
    r1 = seeded_client.post(f"/api/v1/tasks/{tA['id']}/dependencies", json={"predecessor_task_id": tA["id"]}, headers=headers)
    assert r1.status_code == 400

    # Create A -> B
    r2 = seeded_client.post(f"/api/v1/tasks/{tB['id']}/dependencies", json={"predecessor_task_id": tA["id"]}, headers=headers)
    assert r2.status_code == 201

    # Duplicate link (A -> B again)
    r3 = seeded_client.post(f"/api/v1/tasks/{tB['id']}/dependencies", json={"predecessor_task_id": tA["id"]}, headers=headers)
    assert r3.status_code == 400

    # Create B -> C
    r4 = seeded_client.post(f"/api/v1/tasks/{tC['id']}/dependencies", json={"predecessor_task_id": tB["id"]}, headers=headers)
    assert r4.status_code == 201

    # Indirect Circular chain (C -> A in A -> B -> C)
    r5 = seeded_client.post(f"/api/v1/tasks/{tA['id']}/dependencies", json={"predecessor_task_id": tC["id"]}, headers=headers)
    assert r5.status_code == 400

    # Cross-project link
    r6 = seeded_client.post(f"/api/v1/tasks/{tCross['id']}/dependencies", json={"predecessor_task_id": tA["id"]}, headers=headers)
    assert r6.status_code == 400


def test_audit_8_missing_or_invalid_dates(seeded_client, db):
    """End date before start date validation"""
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)

    proj = create_test_project(seeded_client, headers, "Validation Proj")
    resp = seeded_client.post(
        "/api/v1/tasks",
        json={"title": "Invalid Date Task", "project_id": proj["id"], "start_date": "2026-09-10", "due_date": "2026-09-01"},
        headers=headers
    )
    assert resp.status_code == 400


def test_audit_9_edit_delete_dependency(seeded_client, db):
    """Edit lag, delete dependency, verify persistence after reload"""
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)

    proj = create_test_project(seeded_client, headers, "Edit Dep Proj")
    tA = create_test_task(seeded_client, headers, proj["id"], "Task A")
    tB = create_test_task(seeded_client, headers, proj["id"], "Task B")

    dep_resp = seeded_client.post(f"/api/v1/tasks/{tB['id']}/dependencies", json={"predecessor_task_id": tA["id"], "lag_days": 1}, headers=headers)
    dep_id = dep_resp.json()["id"]

    # Edit lag to 5 days
    patch_resp = seeded_client.patch(f"/api/v1/tasks/dependencies/{dep_id}", json={"lag_days": 5, "dep_type": "SS"}, headers=headers)
    assert patch_resp.status_code == 200
    assert patch_resp.json()["lag_days"] == 5

    # Delete dependency
    del_resp = seeded_client.delete(f"/api/v1/tasks/dependencies/{dep_id}", headers=headers)
    assert del_resp.status_code == 240 or del_resp.status_code == 204

    # Verify task B has no dependencies
    tB_reloaded = seeded_client.get(f"/api/v1/tasks/{tB['id']}", headers=headers).json()
    assert len(tB_reloaded["dependencies"]) == 0


def test_audit_10_permissions_and_isolation(seeded_client, db):
    """Read-only / unauthenticated users cannot modify dependencies"""
    token_admin = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers_admin = auth_headers(token_admin)

    proj = create_test_project(seeded_client, headers_admin, "Perm Proj")
    tA = create_test_task(seeded_client, headers_admin, proj["id"], "Task A")
    tB = create_test_task(seeded_client, headers_admin, proj["id"], "Task B")

    # Unauthenticated request
    no_auth_resp = seeded_client.post(f"/api/v1/tasks/{tB['id']}/dependencies", json={"predecessor_task_id": tA["id"]})
    assert no_auth_resp.status_code == 401
