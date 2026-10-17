import pytest
from tests.conftest import DEFAULT_PASSWORD, auth_headers, login

def test_project_task_list_hierarchy_and_rollups(seeded_client, db):
    # 1. Login as admin
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)

    # 2. Create Project
    prj_resp = seeded_client.post(
        "/api/v1/projects",
        json={"name": "Hierarchy Test Project", "code": "PRJ-TASKLIST-01"},
        headers=headers,
    )
    assert prj_resp.status_code == 201
    prj_id = prj_resp.json()["id"]

    # 3. Create Milestone (Level 1)
    m_resp = seeded_client.post(
        f"/api/v1/projects/{prj_id}/milestones",
        json={"title": "Sprint 1 Milestone"},
        headers=headers,
    )
    assert m_resp.status_code == 201
    milestone_id = m_resp.json()["id"]

    # 4. Create Task List under Milestone (Level 2)
    # Milestone -> Task List
    tl_resp = seeded_client.post(
        f"/api/v1/projects/milestones/{milestone_id}/task-lists",
        json={"name": "API & Backend Modules"},
        headers=headers,
    )
    assert tl_resp.status_code == 201, tl_resp.text
    tl_data = tl_resp.json()
    task_list_id = tl_data["id"]
    assert tl_data["name"] == "API & Backend Modules"
    assert tl_data["milestone_id"] == milestone_id
    assert tl_data["project_id"] == prj_id
    # Initially no child tasks, so dates and duration are null/0
    assert tl_data["start_date"] is None
    assert tl_data["end_date"] is None

    # Verify task list has NO status, cost, dependencies, or assigned_to fields
    assert "status" not in tl_data
    assert "cost" not in tl_data
    assert "dependencies" not in tl_data
    assert "assigned_to" not in tl_data
    assert "assignee_id" not in tl_data

    # Update Task List Name (the only editable field)
    update_tl_resp = seeded_client.patch(
        f"/api/v1/projects/task-lists/{task_list_id}",
        json={"name": "Backend Core"},
        headers=headers,
    )
    assert update_tl_resp.status_code == 200
    assert update_tl_resp.json()["name"] == "Backend Core"

    # 5. Add Tasks inside Task List (Level 3: Task List -> Task)
    # Task A: Start 2026-10-20 09:00 AM, End 2026-10-22 05:00 PM
    task_a_resp = seeded_client.post(
        "/api/v1/tasks",
        json={
            "title": "Database Schema Setup",
            "project_id": prj_id,
            "milestone_id": milestone_id,
            "task_list_id": task_list_id,
            "start_date": "2026-10-20",
            "start_time": "09:00 AM",
            "due_date": "2026-10-22",
            "due_time": "05:00 PM",
            "estimated_cost": 4000.0,
            "actual_cost": 3500.0,
        },
        headers=headers,
    )
    assert task_a_resp.status_code == 201, task_a_resp.text
    task_a = task_a_resp.json()
    assert task_a["task_list_id"] == task_list_id
    assert task_a["task_list_name"] == "Backend Core"

    # Check Task List automatic calculation from Task A
    get_tl_resp = seeded_client.get(f"/api/v1/projects/milestones/{milestone_id}/task-lists", headers=headers)
    assert get_tl_resp.status_code == 200
    tl_list = get_tl_resp.json()
    assert len(tl_list) == 1
    tl_updated = tl_list[0]
    assert tl_updated["start_date"].startswith("2026-10-20")
    assert tl_updated["end_date"].startswith("2026-10-22")
    assert tl_updated["duration_working_days"] >= 1

    # Task B: Earlier start (2026-10-18) and later due (2026-10-25)
    task_b_resp = seeded_client.post(
        "/api/v1/tasks",
        json={
            "title": "Auth & Permissions",
            "project_id": prj_id,
            "task_list_id": task_list_id,
            "start_date": "2026-10-18",
            "start_time": "09:00 AM",
            "due_date": "2026-10-25",
            "due_time": "05:00 PM",
            "estimated_cost": 6000.0,
            "actual_cost": 5500.0,
        },
        headers=headers,
    )
    assert task_b_resp.status_code == 201, task_b_resp.text
    task_b_id = task_b_resp.json()["id"]

    # Verify Task List MIN start and MAX end recalculation
    get_tl_resp2 = seeded_client.get(f"/api/v1/projects/{prj_id}/task-lists", headers=headers)
    assert get_tl_resp2.status_code == 200
    tl_updated2 = next(t for t in get_tl_resp2.json() if t["id"] == task_list_id)
    assert tl_updated2["start_date"].startswith("2026-10-18")  # MIN
    assert tl_updated2["end_date"].startswith("2026-10-25")    # MAX
    assert tl_updated2["duration_working_days"] > tl_updated["duration_working_days"]

    # 6. Update Task B date and verify automatic Task List recalculation
    seeded_client.put(
        f"/api/v1/tasks/{task_b_id}",
        json={"due_date": "2026-10-28", "due_time": "05:00 PM"},
        headers=headers,
    )
    get_tl_resp3 = seeded_client.get(f"/api/v1/projects/{prj_id}/task-lists", headers=headers)
    tl_updated3 = next(t for t in get_tl_resp3.json() if t["id"] == task_list_id)
    assert tl_updated3["end_date"].startswith("2026-10-28")

    # 7. Verify Milestone Cost Rollup includes tasks inside task lists without duplicating
    m_get = seeded_client.get(f"/api/v1/projects/{prj_id}/milestones", headers=headers)
    assert m_get.status_code == 200
    milestone_data = next(m for m in m_get.json() if m["id"] == milestone_id)
    # Total estimated: 4000 + 6000 = 10000; total actual: 3500 + 5500 = 9000
    assert milestone_data["cost"] == 9000.0 or milestone_data.get("cost_estimated") == 10000.0

    # 8. Delete Task List dissociates tasks cleanly
    del_tl_resp = seeded_client.delete(f"/api/v1/projects/task-lists/{task_list_id}", headers=headers)
    assert del_tl_resp.status_code == 204

    # Verify tasks still exist under milestone with task_list_id = None
    t_get = seeded_client.get(f"/api/v1/tasks/{task_b_id}", headers=headers)
    assert t_get.status_code == 200
    assert t_get.json()["task_list_id"] is None
    assert t_get.json()["milestone_id"] == milestone_id
