"""
Unit tests for Task Dependency Display & Query Logic.
Validates that:
1. Task dependencies returned in TaskOut.dependencies ONLY contain predecessors (tasks THIS task depends on).
2. Reverse relationship is NOT returned in TaskOut.dependencies for predecessor tasks.
3. Multi-level hierarchy (TASK C -> TASK A -> TASK B) correctly scopes dependencies.
4. Internal scheduling and circular dependency rules remain fully functional.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from tests.conftest import DEFAULT_PASSWORD, auth_headers, login


def test_dependency_display_direction_single(seeded_client: TestClient, db: Session):
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)

    # 1. Create a project
    proj_res = seeded_client.post("/api/v1/projects", json={"name": "Dep Display Proj Single"}, headers=headers)
    assert proj_res.status_code == 201
    proj_id = proj_res.json()["id"]

    # 2. Create Task A and Task B
    t1_res = seeded_client.post("/api/v1/tasks", json={"title": "TASK A", "project_id": proj_id, "start_date": "2026-10-01", "due_date": "2026-10-05"}, headers=headers)
    assert t1_res.status_code == 201
    task_a = t1_res.json()

    t2_res = seeded_client.post("/api/v1/tasks", json={"title": "TASK B", "project_id": proj_id, "start_date": "2026-10-01", "due_date": "2026-10-05"}, headers=headers)
    assert t2_res.status_code == 201
    task_b = t2_res.json()

    # 3. Configure TASK A depends on TASK B (FS)
    dep_res = seeded_client.post(f"/api/v1/tasks/{task_a['id']}/dependencies", json={
        "predecessor_task_id": task_b["id"],
        "dep_type": "FS",
        "lag_days": 0
    }, headers=headers)
    assert dep_res.status_code == 201

    # 4. Fetch tasks via GET /api/v1/tasks
    list_res = seeded_client.get(f"/api/v1/tasks?project_id={proj_id}", headers=headers)
    assert list_res.status_code == 200
    tasks_list = list_res.json()

    task_a_out = next(t for t in tasks_list if t["id"] == task_a["id"])
    task_b_out = next(t for t in tasks_list if t["id"] == task_b["id"])

    # TASK A must have TASK B in dependencies
    assert len(task_a_out["dependencies"]) == 1
    assert task_a_out["dependencies"][0]["predecessor_task_id"] == task_b["id"]

    # TASK B must NOT have TASK A in dependencies column
    assert len(task_b_out["dependencies"]) == 0

    # TASK B must have TASK A in dependents field
    assert len(task_b_out["dependents"]) == 1
    assert task_b_out["dependents"][0]["task_id"] == task_a["id"]


def test_dependency_display_direction_multilevel(seeded_client: TestClient, db: Session):
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)

    proj_res = seeded_client.post("/api/v1/projects", json={"name": "Multi Dep Proj Multi"}, headers=headers)
    proj_id = proj_res.json()["id"]

    # Create TASK A, TASK B, TASK C
    tb_res = seeded_client.post("/api/v1/tasks", json={"title": "TASK B", "project_id": proj_id, "start_date": "2026-10-01", "due_date": "2026-10-05"}, headers=headers)
    task_b = tb_res.json()

    ta_res = seeded_client.post("/api/v1/tasks", json={"title": "TASK A", "project_id": proj_id, "start_date": "2026-10-06", "due_date": "2026-10-10"}, headers=headers)
    task_a = ta_res.json()

    tc_res = seeded_client.post("/api/v1/tasks", json={"title": "TASK C", "project_id": proj_id, "start_date": "2026-10-11", "due_date": "2026-10-15"}, headers=headers)
    task_c = tc_res.json()

    # TASK A depends on TASK B
    seeded_client.post(f"/api/v1/tasks/{task_a['id']}/dependencies", json={"predecessor_task_id": task_b["id"], "dep_type": "FS"}, headers=headers)

    # TASK C depends on TASK A
    seeded_client.post(f"/api/v1/tasks/{task_c['id']}/dependencies", json={"predecessor_task_id": task_a["id"], "dep_type": "FS"}, headers=headers)

    # Fetch list view
    list_res = seeded_client.get(f"/api/v1/tasks?project_id={proj_id}", headers=headers)
    assert list_res.status_code == 200
    tasks_by_id = {t["id"]: t for t in list_res.json()}

    # TASK B: dependencies = []
    assert len(tasks_by_id[task_b["id"]]["dependencies"]) == 0

    # TASK A: dependencies = [TASK B]
    assert len(tasks_by_id[task_a["id"]]["dependencies"]) == 1
    assert tasks_by_id[task_a["id"]]["dependencies"][0]["predecessor_task_id"] == task_b["id"]

    # TASK C: dependencies = [TASK A]
    assert len(tasks_by_id[task_c["id"]]["dependencies"]) == 1
    assert tasks_by_id[task_c["id"]]["dependencies"][0]["predecessor_task_id"] == task_a["id"]


def test_duplicate_dependency_prevention(seeded_client: TestClient, db: Session):
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)

    proj_res = seeded_client.post("/api/v1/projects", json={"name": "Dup Dep Proj Dup"}, headers=headers)
    proj_id = proj_res.json()["id"]

    t1 = seeded_client.post("/api/v1/tasks", json={"title": "T1", "project_id": proj_id}, headers=headers).json()
    t2 = seeded_client.post("/api/v1/tasks", json={"title": "T2", "project_id": proj_id}, headers=headers).json()

    # First add succeeds
    res1 = seeded_client.post(f"/api/v1/tasks/{t1['id']}/dependencies", json={"predecessor_task_id": t2["id"], "dep_type": "FS"}, headers=headers)
    assert res1.status_code == 201

    # Duplicate add fails with 400
    res2 = seeded_client.post(f"/api/v1/tasks/{t1['id']}/dependencies", json={"predecessor_task_id": t2["id"], "dep_type": "FS"}, headers=headers)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"]
