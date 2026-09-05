from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.conftest import DEFAULT_PASSWORD, auth_headers, login


def test_subtask_hierarchy_and_progress(seeded_client: TestClient, db: Session):
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)

    # 1. Create parent task
    resp = seeded_client.post("/api/v1/tasks", json={"title": "Quotation Task"}, headers=headers)
    assert resp.status_code == 201, resp.text
    parent = resp.json()
    parent_id = parent["id"]
    assert parent["progress_percentage"] == 0.0

    # 2. Add two subtasks
    st1_resp = seeded_client.post(f"/api/v1/tasks/{parent_id}/subtasks", json={"title": "Collect Details"}, headers=headers)
    assert st1_resp.status_code == 201, st1_resp.text
    st1 = st1_resp.json()
    assert st1["parent_task_id"] == parent_id

    st2_resp = seeded_client.post(f"/api/v1/tasks/{parent_id}/subtasks", json={"title": "Calculate Pricing"}, headers=headers)
    assert st2_resp.status_code == 201, st2_resp.text
    st2 = st2_resp.json()
    assert st2["parent_task_id"] == parent_id

    # Check parent updated subtask count & progress
    parent_check = seeded_client.get(f"/api/v1/tasks/{parent_id}", headers=headers).json()
    assert parent_check["subtask_count"] == 2
    assert parent_check["completed_subtask_count"] == 0
    assert parent_check["progress_percentage"] == 0.0

    # 3. Complete st1
    seeded_client.patch(f"/api/v1/tasks/{st1['id']}", json={"is_completed": True}, headers=headers)
    parent_check2 = seeded_client.get(f"/api/v1/tasks/{parent_id}", headers=headers).json()
    assert parent_check2["completed_subtask_count"] == 1
    assert parent_check2["progress_percentage"] == 50.0

    # 4. Complete st2
    seeded_client.patch(f"/api/v1/tasks/{st2['id']}", json={"is_completed": True}, headers=headers)
    parent_check3 = seeded_client.get(f"/api/v1/tasks/{parent_id}", headers=headers).json()
    assert parent_check3["completed_subtask_count"] == 2
    assert parent_check3["progress_percentage"] == 100.0

    # 5. Reopen st1
    seeded_client.patch(f"/api/v1/tasks/{st1['id']}", json={"is_completed": False}, headers=headers)
    parent_check4 = seeded_client.get(f"/api/v1/tasks/{parent_id}", headers=headers).json()
    assert parent_check4["completed_subtask_count"] == 1
    assert parent_check4["progress_percentage"] == 50.0


def test_anti_circular_parent_and_conversion(seeded_client: TestClient, db: Session):
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)

    t1 = seeded_client.post("/api/v1/tasks", json={"title": "Task A"}, headers=headers).json()
    t2 = seeded_client.post("/api/v1/tasks", json={"title": "Task B"}, headers=headers).json()

    # Convert t2 to subtask of t1
    conv_resp = seeded_client.post(f"/api/v1/tasks/{t2['id']}/convert-to-subtask", json={"target_parent_id": t1["id"]}, headers=headers)
    assert conv_resp.status_code == 200, conv_resp.text
    assert conv_resp.json()["parent_task_id"] == t1["id"]

    # Attempt setting t1's parent to t2 (circular) -> should fail
    circ_resp = seeded_client.post(f"/api/v1/tasks/{t1['id']}/convert-to-subtask", json={"target_parent_id": t2["id"]}, headers=headers)
    assert circ_resp.status_code == 400
    assert "circular parent" in circ_resp.json()["detail"].lower()

    # Convert t2 back to top level task
    conv_top = seeded_client.post(f"/api/v1/tasks/{t2['id']}/convert-to-task", headers=headers)
    assert conv_top.status_code == 200
    assert conv_top.json()["parent_task_id"] is None


def test_dependencies_bidirectional_and_anti_circular(seeded_client: TestClient, db: Session):
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)

    tA = seeded_client.post("/api/v1/tasks", json={"title": "Approval Task"}, headers=headers).json()
    tB = seeded_client.post("/api/v1/tasks", json={"title": "Submission Task"}, headers=headers).json()

    # tA BLOCKS tB
    dep_resp = seeded_client.post(
        f"/api/v1/tasks/{tA['id']}/dependencies",
        json={"depends_on_task_id": tB["id"], "direction": "BLOCKING"},
        headers=headers
    )
    assert dep_resp.status_code == 201, dep_resp.text

    # View tA -> should show BLOCKING tB
    tA_view = seeded_client.get(f"/api/v1/tasks/{tA['id']}", headers=headers).json()
    assert len(tA_view["dependencies"]) == 1
    assert tA_view["dependencies"][0]["direction"] == "BLOCKING"
    assert tA_view["is_blocked"] is False

    # View tB -> should show BLOCKED_BY tA, and is_blocked = True
    tB_view = seeded_client.get(f"/api/v1/tasks/{tB['id']}", headers=headers).json()
    assert len(tB_view["dependencies"]) == 1
    assert tB_view["dependencies"][0]["direction"] == "BLOCKED_BY"
    assert tB_view["is_blocked"] is True

    # Attempting to complete tB while tA is incomplete should fail without override
    comp_fail = seeded_client.patch(f"/api/v1/tasks/{tB['id']}", json={"is_completed": True}, headers=headers)
    assert comp_fail.status_code == 400
    assert comp_fail.json()["detail"]["code"] == "TASK_BLOCKED"

    # Complete tB with override_dependencies=True
    comp_override = seeded_client.patch(f"/api/v1/tasks/{tB['id']}", json={"is_completed": True, "override_dependencies": True}, headers=headers)
    assert comp_override.status_code == 200
    assert comp_override.json()["is_completed"] is True


def test_dependency_rescheduling(seeded_client: TestClient, db: Session):
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)

    t1 = seeded_client.post("/api/v1/tasks", json={"title": "Phase 1", "start_date": "2026-09-01", "due_date": "2026-09-10"}, headers=headers).json()
    t2 = seeded_client.post("/api/v1/tasks", json={"title": "Phase 2", "start_date": "2026-09-11", "due_date": "2026-09-20"}, headers=headers).json()

    # t1 BLOCKS t2
    seeded_client.post(f"/api/v1/tasks/{t1['id']}/dependencies", json={"depends_on_task_id": t2["id"], "direction": "BLOCKING"}, headers=headers)

    # Shift t1 by 5 days
    resched = seeded_client.post(f"/api/v1/tasks/{t1['id']}/reschedule-dependencies", json={"days_shift": 5}, headers=headers)
    assert resched.status_code == 200

    # t2 should be shifted by 5 days -> 2026-09-16 to 2026-09-25
    t2_check = seeded_client.get(f"/api/v1/tasks/{t2['id']}", headers=headers).json()
    assert t2_check["start_date"] == "2026-09-16"
    assert t2_check["due_date"] == "2026-09-25"
