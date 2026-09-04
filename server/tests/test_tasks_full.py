import pytest
from app.models.enums import UserRole
from tests.conftest import DEFAULT_PASSWORD, auth_headers, login

def test_tasks_subtasks_comments_attachments_full_crud(seeded_client, db):
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)

    # 1. First create a Project
    p_resp = seeded_client.post("/api/v1/projects", json={"name": "Task System Test Project"}, headers=headers)
    assert p_resp.status_code == 201
    project_id = p_resp.json()["id"]

    # 2. CREATE Task
    t_payload = {
        "title": "Configure OAuth Authentication",
        "description": "Implement OAuth2 authorization code flow",
        "project_id": project_id,
        "priority": "HIGH",
    }
    t_resp = seeded_client.post("/api/v1/tasks", json=t_payload, headers=headers)
    assert t_resp.status_code == 201, t_resp.text
    task_data = t_resp.json()
    task_id = task_data["id"]
    assert task_data["title"] == "Configure OAuth Authentication"
    assert task_data["priority"] == "HIGH"

    # 3. READ List Tasks
    t_list_resp = seeded_client.get("/api/v1/tasks", headers=headers)
    assert t_list_resp.status_code == 200
    assert any(t["id"] == task_id for t in t_list_resp.json())

    # 4. READ Single Task
    t_get_resp = seeded_client.get(f"/api/v1/tasks/{task_id}", headers=headers)
    assert t_get_resp.status_code == 200
    assert t_get_resp.json()["id"] == task_id

    # 5. UPDATE Task
    t_update_resp = seeded_client.put(
        f"/api/v1/tasks/{task_id}",
        json={"title": "Configure OAuth2 & JWT", "priority": "URGENT"},
        headers=headers,
    )
    assert t_update_resp.status_code == 200
    assert t_update_resp.json()["title"] == "Configure OAuth2 & JWT"
    assert t_update_resp.json()["priority"] == "URGENT"

    # 6. SUBTASK Operations
    # Create Subtask
    st_resp = seeded_client.post(
        f"/api/v1/tasks/{task_id}/subtasks",
        json={"title": "Setup JWT keypair"},
        headers=headers,
    )
    assert st_resp.status_code == 201, st_resp.text
    subtask_id = st_resp.json()["id"]
    assert st_resp.json()["is_completed"] is False

    # Toggle Subtask
    st_toggle_resp = seeded_client.put(f"/api/v1/tasks/subtasks/{subtask_id}/toggle", headers=headers)
    assert st_toggle_resp.status_code == 200
    assert st_toggle_resp.json()["is_completed"] is True

    # 7. COMMENT Operations
    cm_resp = seeded_client.post(
        f"/api/v1/tasks/{task_id}/comments",
        json={"content": "Keys generated and saved securely."},
        headers=headers,
    )
    assert cm_resp.status_code == 201, cm_resp.text
    assert cm_resp.json()["content"] == "Keys generated and saved securely."

    cm_list_resp = seeded_client.get(f"/api/v1/tasks/{task_id}/comments", headers=headers)
    assert cm_list_resp.status_code == 200
    assert len(cm_list_resp.json()) == 1

    # 8. ATTACHMENT Operations
    att_resp = seeded_client.post(
        f"/api/v1/tasks/{task_id}/attachments",
        json={"filename": "architecture_diagram.pdf", "file_size": "1.0 MB", "file_url": "/uploads/architecture_diagram.pdf"},
        headers=headers,
    )
    assert att_resp.status_code == 201, att_resp.text
    attachment_id = att_resp.json()["id"]
    assert att_resp.json()["filename"] == "architecture_diagram.pdf"

    att_list_resp = seeded_client.get(f"/api/v1/tasks/{task_id}/attachments", headers=headers)
    assert att_list_resp.status_code == 200
    assert len(att_list_resp.json()) == 1

    # Delete Attachment
    del_att_resp = seeded_client.delete(f"/api/v1/tasks/attachments/{attachment_id}", headers=headers)
    assert del_att_resp.status_code == 204

    # 9. TIME LOG Operations
    tl_resp = seeded_client.post(
        f"/api/v1/tasks/{task_id}/timelogs",
        json={"hours": 3.5, "log_date": "2026-09-04", "description": "Configured auth endpoints"},
        headers=headers,
    )
    assert tl_resp.status_code == 201, tl_resp.text

    tl_list_resp = seeded_client.get(f"/api/v1/tasks/{task_id}/timelogs", headers=headers)
    assert tl_list_resp.status_code == 200
    assert len(tl_list_resp.json()) == 1
    assert tl_list_resp.json()[0]["hours"] == 3.5

    # 10. CUSTOM FIELDS FOR TASKS
    # Create Definition
    cfd_resp = seeded_client.post(
        "/api/v1/projects/tasks/custom-fields/definitions",
        json={"name": "risk_level", "label": "Risk Level", "field_type": "select", "options": ["Low", "Medium", "High"]},
        headers=headers,
    )
    assert cfd_resp.status_code == 201, cfd_resp.text
    cfd_id = cfd_resp.json()["id"]

    # Save Custom Field Value for Task
    cfv_resp = seeded_client.post(
        f"/api/v1/tasks/{task_id}/custom-fields",
        json={"field_id": cfd_id, "value": "Medium"},
        headers=headers,
    )
    assert cfv_resp.status_code == 200, cfv_resp.text
    assert cfv_resp.json()["value"] == "Medium"

    # Get Custom Fields for Task
    cfv_list = seeded_client.get(f"/api/v1/tasks/{task_id}/custom-fields", headers=headers)
    assert cfv_list.status_code == 200
    assert len(cfv_list.json()) == 1

    # 11. DELETE Task
    del_t_resp = seeded_client.delete(f"/api/v1/tasks/{task_id}", headers=headers)
    assert del_t_resp.status_code == 204

    # Verify Task Deletion
    get_del = seeded_client.get(f"/api/v1/tasks/{task_id}", headers=headers)
    assert get_del.status_code == 404
