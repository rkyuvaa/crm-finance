import pytest
from app.models.enums import UserRole
from tests.conftest import DEFAULT_PASSWORD, auth_headers, login

def test_full_project_task_lifecycle_workflow(seeded_client, db):
    """
    Complete Multi-step Business Workflow:
    1. Authenticate user
    2. Create Project
    3. Create Task under Project
    4. Add Subtasks to Task & Toggle Completion
    5. Upload File Attachment to Task
    6. Post Discussion Comment on Task
    7. Log Billable Work Hours
    8. Set Custom Field Values
    9. Complete Task & Verify Metrics
    """
    # 1. Login
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)

    # 2. Create Project
    p_resp = seeded_client.post(
        "/api/v1/projects",
        json={
            "name": "Customer Portal Redesign",
            "code": "CPR-2026",
            "description": "NextGen Customer Self-Service Portal",
            "budget": 250000.0,
            "category": "Customer Success",
        },
        headers=headers,
    )
    assert p_resp.status_code == 201
    project_id = p_resp.json()["id"]

    # 3. Create Task
    t_resp = seeded_client.post(
        "/api/v1/tasks",
        json={
            "title": "Design Responsive Dashboard Wireframes",
            "description": "Figma mockups for mobile and desktop screens",
            "project_id": project_id,
            "priority": "HIGH",
            "estimated_hours": 16.0,
        },
        headers=headers,
    )
    assert t_resp.status_code == 201
    task_id = t_resp.json()["id"]

    # 4. Add Subtasks
    st1 = seeded_client.post(f"/api/v1/tasks/{task_id}/subtasks", json={"title": "Mobile Wireframe"}, headers=headers)
    assert st1.status_code == 201
    st1_id = st1.json()["id"]

    st2 = seeded_client.post(f"/api/v1/tasks/{task_id}/subtasks", json={"title": "Desktop Wireframe"}, headers=headers)
    assert st2.status_code == 201

    # Toggle subtask 1
    t_st1 = seeded_client.put(f"/api/v1/tasks/subtasks/{st1_id}/toggle", headers=headers)
    assert t_st1.status_code == 200
    assert t_st1.json()["is_completed"] is True

    # 5. Upload File Attachment
    att_resp = seeded_client.post(
        f"/api/v1/tasks/{task_id}/attachments",
        json={"filename": "dashboard_figma_v1.png", "file_size": "2.0 MB", "file_url": "/uploads/dashboard_figma_v1.png"},
        headers=headers,
    )
    assert att_resp.status_code == 201

    # 6. Post Comment
    cm_resp = seeded_client.post(
        f"/api/v1/tasks/{task_id}/comments",
        json={"content": "Wireframes are ready for stakeholder review."},
        headers=headers,
    )
    assert cm_resp.status_code == 201

    # 7. Log Work Hours
    tl_resp = seeded_client.post(
        f"/api/v1/tasks/{task_id}/timelogs",
        json={"hours": 8.0, "log_date": "2026-09-04", "description": "Drafted mobile screens"},
        headers=headers,
    )
    assert tl_resp.status_code == 201

    # 8. Set Custom Field Value
    cfd = seeded_client.post(
        "/api/v1/projects/tasks/custom-fields/definitions",
        json={"name": "review_status", "label": "Review Status", "field_type": "text"},
        headers=headers,
    )
    assert cfd.status_code == 201
    cfd_id = cfd.json()["id"]

    cfv = seeded_client.post(
        f"/api/v1/tasks/{task_id}/custom-fields",
        json={"field_id": cfd_id, "value": "Approved by Lead"},
        headers=headers,
    )
    assert cfv.status_code == 200
    assert cfv.json()["value"] == "Approved by Lead"

    # 9. Verify Project Details & Metrics
    p_get = seeded_client.get(f"/api/v1/projects/{project_id}", headers=headers)
    assert p_get.status_code == 200
    assert p_get.json()["tasks_count"]["total"] == 1
