import pytest
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import uuid

from tests.conftest import DEFAULT_PASSWORD, auth_headers, login
from app.services.calendar_service import get_working_calendar, add_working_days


def create_project(client, headers, name="Dep Matrix Proj"):
    prefix = f"M{uuid.uuid4().hex[:4]}".upper()
    resp = client.post("/api/v1/projects", json={"name": name, "prefix": prefix}, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


def create_task(client, headers, project_id, title, start_date=None, due_date=None, duration=None):
    payload = {"title": title, "project_id": project_id}
    if start_date:
        payload["start_date"] = str(start_date)
    if due_date:
        payload["due_date"] = str(due_date)
    if duration:
        payload["duration_working_days"] = duration
    resp = client.post("/api/v1/tasks", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


# ==============================================================================
# 1. FINISH-TO-START (FS) TESTS
# ==============================================================================
def test_fs_predecessor_date_change_forward(seeded_client: TestClient, db: Session):
    """FS: Successor cannot start until predecessor finishes. Predecessor delay moves successor forward."""
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)
    proj = create_project(seeded_client, headers)
    cal = get_working_calendar(db)

    tA = create_task(seeded_client, headers, proj["id"], "Task A", "2026-09-01", "2026-09-04")
    tB = create_task(seeded_client, headers, proj["id"], "Task B", "2026-09-07", "2026-09-09", duration=3)

    dep = seeded_client.post(
        f"/api/v1/tasks/{tB['id']}/dependencies",
        json={"predecessor_task_id": tA["id"], "dep_type": "FS", "lag_days": 0},
        headers=headers
    )
    assert dep.status_code == 201

    # Move Task A due date forward to 2026-09-08
    patch_resp = seeded_client.patch(f"/api/v1/tasks/{tA['id']}", json={"due_date": "2026-09-08"}, headers=headers)
    assert patch_resp.status_code == 200

    expected_start = add_working_days(date(2026, 9, 8), 1, cal)
    expected_due = add_working_days(expected_start, 3 - 1, cal)

    tB_updated = seeded_client.get(f"/api/v1/tasks/{tB['id']}", headers=headers).json()
    assert tB_updated["start_date"] == expected_start.isoformat()
    assert tB_updated["due_date"] == expected_due.isoformat()
    assert tB_updated["duration_working_days"] == 3


def test_fs_successor_date_change_preserves_later_schedule(seeded_client: TestClient, db: Session):
    """FS: Moving predecessor earlier does not drag a later manually scheduled task backward."""
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)
    proj = create_project(seeded_client, headers)

    tA = create_task(seeded_client, headers, proj["id"], "Task A", "2026-09-01", "2026-09-05")
    tB = create_task(seeded_client, headers, proj["id"], "Task B", "2026-10-01", "2026-10-05", duration=3)

    seeded_client.post(
        f"/api/v1/tasks/{tB['id']}/dependencies",
        json={"predecessor_task_id": tA["id"], "dep_type": "FS", "lag_days": 0},
        headers=headers
    )

    tB_orig = seeded_client.get(f"/api/v1/tasks/{tB['id']}", headers=headers).json()

    # Move Task A earlier
    seeded_client.patch(f"/api/v1/tasks/{tA['id']}", json={"start_date": "2026-08-20", "due_date": "2026-08-25"}, headers=headers)

    tB_updated = seeded_client.get(f"/api/v1/tasks/{tB['id']}", headers=headers).json()
    assert tB_updated["start_date"] == tB_orig["start_date"]
    assert tB_updated["due_date"] == tB_orig["due_date"]


def test_fs_duration_change(seeded_client: TestClient, db: Session):
    """FS: Changing successor duration recalculates due date while preserving start date."""
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)
    proj = create_project(seeded_client, headers)
    cal = get_working_calendar(db)

    tA = create_task(seeded_client, headers, proj["id"], "Task A", "2026-09-01", "2026-09-04")
    tB = create_task(seeded_client, headers, proj["id"], "Task B", "2026-09-07", "2026-09-09", duration=3)

    seeded_client.post(
        f"/api/v1/tasks/{tB['id']}/dependencies",
        json={"predecessor_task_id": tA["id"], "dep_type": "FS", "lag_days": 0},
        headers=headers
    )

    # Change Task B duration from 3 to 5 days
    seeded_client.patch(f"/api/v1/tasks/{tB['id']}", json={"duration_working_days": 5}, headers=headers)

    expected_due = add_working_days(date(2026, 9, 7), 5 - 1, cal)

    tB_updated = seeded_client.get(f"/api/v1/tasks/{tB['id']}", headers=headers).json()
    assert tB_updated["start_date"] == "2026-09-07"
    assert tB_updated["due_date"] == expected_due.isoformat()
    assert tB_updated["duration_working_days"] == 5


# ==============================================================================
# 2. START-TO-START (SS) TESTS
# ==============================================================================
def test_ss_predecessor_start_change(seeded_client: TestClient, db: Session):
    """SS: Successor cannot start until predecessor starts. Predecessor finish date does NOT control successor."""
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)
    proj = create_project(seeded_client, headers)
    cal = get_working_calendar(db)

    tA = create_task(seeded_client, headers, proj["id"], "Task A", "2026-09-01", "2026-09-15")
    tB = create_task(seeded_client, headers, proj["id"], "Task B", "2026-09-01", "2026-09-04", duration=4)

    seeded_client.post(
        f"/api/v1/tasks/{tB['id']}/dependencies",
        json={"predecessor_task_id": tA["id"], "dep_type": "SS", "lag_days": 0},
        headers=headers
    )

    # Move Task A start date to 2026-09-07
    seeded_client.patch(f"/api/v1/tasks/{tA['id']}", json={"start_date": "2026-09-07"}, headers=headers)

    expected_due = add_working_days(date(2026, 9, 7), 4 - 1, cal)

    tB_updated = seeded_client.get(f"/api/v1/tasks/{tB['id']}", headers=headers).json()
    assert tB_updated["start_date"] == "2026-09-07"
    assert tB_updated["due_date"] == expected_due.isoformat()
    assert tB_updated["duration_working_days"] == 4


# ==============================================================================
# 3. FINISH-TO-FINISH (FF) TESTS
# ==============================================================================
def test_ff_predecessor_finish_change(seeded_client: TestClient, db: Session):
    """FF: Successor cannot finish before predecessor finishes. Duration is strictly preserved."""
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)
    proj = create_project(seeded_client, headers)
    cal = get_working_calendar(db)

    tA = create_task(seeded_client, headers, proj["id"], "Task A", "2026-09-01", "2026-09-04")
    tB = create_task(seeded_client, headers, proj["id"], "Task B", "2026-08-31", "2026-09-04", duration=5)

    seeded_client.post(
        f"/api/v1/tasks/{tB['id']}/dependencies",
        json={"predecessor_task_id": tA["id"], "dep_type": "FF", "lag_days": 0},
        headers=headers
    )

    # Delay Task A finish date to 2026-09-11
    seeded_client.patch(f"/api/v1/tasks/{tA['id']}", json={"due_date": "2026-09-11"}, headers=headers)

    from app.services.calendar_service import subtract_working_days
    expected_due = date(2026, 9, 11)
    expected_start = subtract_working_days(expected_due, 5 - 1, cal)

    tB_updated = seeded_client.get(f"/api/v1/tasks/{tB['id']}", headers=headers).json()
    assert tB_updated["due_date"] == expected_due.isoformat()
    assert tB_updated["start_date"] == expected_start.isoformat()
    assert tB_updated["duration_working_days"] == 5


# ==============================================================================
# 4. START-TO-FINISH (SF) TESTS
# ==============================================================================
def test_sf_predecessor_start_change(seeded_client: TestClient, db: Session):
    """SF: Successor cannot finish until predecessor starts. Duration strictly preserved."""
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)
    proj = create_project(seeded_client, headers)
    cal = get_working_calendar(db)

    tA = create_task(seeded_client, headers, proj["id"], "Task A", "2026-09-04", "2026-09-15")
    tB = create_task(seeded_client, headers, proj["id"], "Task B", "2026-09-01", "2026-09-04", duration=4)

    seeded_client.post(
        f"/api/v1/tasks/{tB['id']}/dependencies",
        json={"predecessor_task_id": tA["id"], "dep_type": "SF", "lag_days": 0},
        headers=headers
    )

    # Task A start moves forward to 2026-09-10
    seeded_client.patch(f"/api/v1/tasks/{tA['id']}", json={"start_date": "2026-09-10"}, headers=headers)

    from app.services.calendar_service import subtract_working_days
    expected_due = date(2026, 9, 10)
    expected_start = subtract_working_days(expected_due, 4 - 1, cal)

    tB_updated = seeded_client.get(f"/api/v1/tasks/{tB['id']}", headers=headers).json()
    assert tB_updated["due_date"] == expected_due.isoformat()
    assert tB_updated["start_date"] == expected_start.isoformat()
    assert tB_updated["duration_working_days"] == 4


# ==============================================================================
# 5. MULTIPLE PREDECESSORS ON SAME TASK
# ==============================================================================
def test_multiple_predecessors_converge_on_critical_path(seeded_client: TestClient, db: Session):
    """Multiple predecessors: Task C depends on Task A (FS) and Task B (SS). Must satisfy BOTH."""
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)
    proj = create_project(seeded_client, headers)

    tA = create_task(seeded_client, headers, proj["id"], "Task A", "2026-09-01", "2026-09-04")
    tB = create_task(seeded_client, headers, proj["id"], "Task B", "2026-09-09", "2026-09-15")
    tC = create_task(seeded_client, headers, proj["id"], "Task C", "2026-09-01", "2026-09-03", duration=3)

    seeded_client.post(f"/api/v1/tasks/{tC['id']}/dependencies", json={"predecessor_task_id": tA["id"], "dep_type": "FS"}, headers=headers)
    seeded_client.post(f"/api/v1/tasks/{tC['id']}/dependencies", json={"predecessor_task_id": tB["id"], "dep_type": "SS"}, headers=headers)

    seeded_client.patch(f"/api/v1/tasks/{tA['id']}", json={"due_date": "2026-09-07"}, headers=headers)

    tC_updated = seeded_client.get(f"/api/v1/tasks/{tC['id']}", headers=headers).json()
    assert tC_updated["start_date"] >= "2026-09-09"
    assert tC_updated["duration_working_days"] == 3


# ==============================================================================
# 6. CHAINED CASCADE (A -> B -> C -> D)
# ==============================================================================
def test_chained_cascade_four_tasks(seeded_client: TestClient, db: Session):
    """Chained cascade: A -> B -> C -> D. Shifting A cascades through all four tasks."""
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)
    proj = create_project(seeded_client, headers)
    cal = get_working_calendar(db)

    tA = create_task(seeded_client, headers, proj["id"], "Task A", "2026-09-01", "2026-09-03", duration=3)
    tB = create_task(seeded_client, headers, proj["id"], "Task B", "2026-09-04", "2026-09-08", duration=3)
    tC = create_task(seeded_client, headers, proj["id"], "Task C", "2026-09-09", "2026-09-11", duration=3)
    tD = create_task(seeded_client, headers, proj["id"], "Task D", "2026-09-14", "2026-09-16", duration=3)

    seeded_client.post(f"/api/v1/tasks/{tB['id']}/dependencies", json={"predecessor_task_id": tA["id"], "dep_type": "FS"}, headers=headers)
    seeded_client.post(f"/api/v1/tasks/{tC['id']}/dependencies", json={"predecessor_task_id": tB["id"], "dep_type": "FS"}, headers=headers)
    seeded_client.post(f"/api/v1/tasks/{tD['id']}/dependencies", json={"predecessor_task_id": tC["id"], "dep_type": "FS"}, headers=headers)

    # Delay A due date by 5 working days (due 2026-09-10)
    seeded_client.patch(f"/api/v1/tasks/{tA['id']}", json={"due_date": "2026-09-10"}, headers=headers)

    tB_up = seeded_client.get(f"/api/v1/tasks/{tB['id']}", headers=headers).json()
    tC_up = seeded_client.get(f"/api/v1/tasks/{tC['id']}", headers=headers).json()
    tD_up = seeded_client.get(f"/api/v1/tasks/{tD['id']}", headers=headers).json()

    exp_b_start = add_working_days(date(2026, 9, 10), 1, cal)
    exp_b_due = add_working_days(exp_b_start, 3 - 1, cal)
    assert tB_up["start_date"] == exp_b_start.isoformat()
    assert tB_up["due_date"] == exp_b_due.isoformat()

    exp_c_start = add_working_days(exp_b_due, 1, cal)
    exp_c_due = add_working_days(exp_c_start, 3 - 1, cal)
    assert tC_up["start_date"] == exp_c_start.isoformat()
    assert tC_up["due_date"] == exp_c_due.isoformat()

    exp_d_start = add_working_days(exp_c_due, 1, cal)
    exp_d_due = add_working_days(exp_d_start, 3 - 1, cal)
    assert tD_up["start_date"] == exp_d_start.isoformat()
    assert tD_up["due_date"] == exp_d_due.isoformat()


# ==============================================================================
# 7. COMPLETED TASKS HANDLING
# ==============================================================================
def test_completed_task_dates_protected(seeded_client: TestClient, db: Session):
    """Completed tasks must not have their planned dates auto-shifted into the future."""
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)
    proj = create_project(seeded_client, headers)

    tA = create_task(seeded_client, headers, proj["id"], "Task A", "2026-09-01", "2026-09-04")
    tB = create_task(seeded_client, headers, proj["id"], "Task B", "2026-09-07", "2026-09-09", duration=3)

    seeded_client.post(f"/api/v1/tasks/{tB['id']}/dependencies", json={"predecessor_task_id": tA["id"], "dep_type": "FS"}, headers=headers)

    seeded_client.patch(f"/api/v1/tasks/{tB['id']}", json={"is_completed": True, "override_dependencies": True}, headers=headers)

    seeded_client.patch(f"/api/v1/tasks/{tA['id']}", json={"due_date": "2026-10-15"}, headers=headers)

    tB_up = seeded_client.get(f"/api/v1/tasks/{tB['id']}", headers=headers).json()
    assert tB_up["start_date"] == "2026-09-07"
    assert tB_up["due_date"] == "2026-09-09"
    assert tB_up["is_completed"] is True


# ==============================================================================
# 8. MULTIPLE SUCCESSORS (ONE-TO-MANY)
# ==============================================================================
def test_multiple_successors_both_shift(seeded_client: TestClient, db: Session):
    """One predecessor with multiple successors (A -> B, A -> C). Both shift accordingly."""
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)
    proj = create_project(seeded_client, headers)
    cal = get_working_calendar(db)

    tA = create_task(seeded_client, headers, proj["id"], "Task A", "2026-09-01", "2026-09-04")
    tB = create_task(seeded_client, headers, proj["id"], "Task B", "2026-09-07", "2026-09-09", duration=3)
    tC = create_task(seeded_client, headers, proj["id"], "Task C", "2026-09-07", "2026-09-10", duration=4)

    seeded_client.post(f"/api/v1/tasks/{tB['id']}/dependencies", json={"predecessor_task_id": tA["id"], "dep_type": "FS"}, headers=headers)
    seeded_client.post(f"/api/v1/tasks/{tC['id']}/dependencies", json={"predecessor_task_id": tA["id"], "dep_type": "FS"}, headers=headers)

    seeded_client.patch(f"/api/v1/tasks/{tA['id']}", json={"due_date": "2026-09-08"}, headers=headers)

    tB_up = seeded_client.get(f"/api/v1/tasks/{tB['id']}", headers=headers).json()
    tC_up = seeded_client.get(f"/api/v1/tasks/{tC['id']}", headers=headers).json()

    exp_start = add_working_days(date(2026, 9, 8), 1, cal)
    exp_b_due = add_working_days(exp_start, 3 - 1, cal)
    exp_c_due = add_working_days(exp_start, 4 - 1, cal)

    assert tB_up["start_date"] == exp_start.isoformat()
    assert tB_up["due_date"] == exp_b_due.isoformat()

    assert tC_up["start_date"] == exp_start.isoformat()
    assert tC_up["due_date"] == exp_c_due.isoformat()
