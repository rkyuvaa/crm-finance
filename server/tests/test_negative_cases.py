import pytest
from app.models.enums import UserRole
from tests.conftest import DEFAULT_PASSWORD, auth_headers, login

def test_negative_cases_and_validations(seeded_client, db):
    token = login(seeded_client, "sales@kim.com", DEFAULT_PASSWORD)
    sales_headers = auth_headers(token)

    # 1. Unauthorized access (No auth header)
    no_auth_resp = seeded_client.get("/api/v1/projects")
    assert no_auth_resp.status_code == 401

    # 2. Permission Denied (Sales executive trying to access admin endpoint)
    forbidden_resp = seeded_client.post("/api/v1/admin/roles", json={"name": "Fake Role", "code": "FAKE"}, headers=sales_headers)
    assert forbidden_resp.status_code in (401, 403)

    # 3. Invalid ID / 404 Not Found
    not_found_proj = seeded_client.get("/api/v1/projects/999999", headers=sales_headers)
    assert not_found_proj.status_code == 404
    assert "Project not found" in not_found_proj.json()["detail"]

    not_found_task = seeded_client.get("/api/v1/tasks/999999", headers=sales_headers)
    assert not_found_task.status_code == 404
    assert "Task not found" in not_found_task.json()["detail"]

    # 4. Missing required payload fields (422 Unprocessable Entity)
    p_resp = seeded_client.post("/api/v1/projects", json={"name": "Negative Test Project"}, headers=sales_headers)
    assert p_resp.status_code == 201
    p_id = p_resp.json()["id"]

    t_resp = seeded_client.post("/api/v1/tasks", json={"title": "Negative Test Task", "project_id": p_id}, headers=sales_headers)
    assert t_resp.status_code == 201
    t_id = t_resp.json()["id"]

    invalid_subtask = seeded_client.post(f"/api/v1/tasks/{t_id}/subtasks", json={}, headers=sales_headers)
    assert invalid_subtask.status_code == 422

    invalid_comment = seeded_client.post(f"/api/v1/tasks/{t_id}/comments", json={}, headers=sales_headers)
    assert invalid_comment.status_code == 422

    # 5. Invalid Foreign Key reference
    invalid_fk_subtask = seeded_client.post("/api/v1/tasks/999999/subtasks", json={"title": "Orphan Subtask"}, headers=sales_headers)
    assert invalid_fk_subtask.status_code == 404

    invalid_fk_comment = seeded_client.post("/api/v1/tasks/999999/comments", json={"content": "Orphan Comment"}, headers=sales_headers)
    assert invalid_fk_comment.status_code == 404

    invalid_fk_attachment = seeded_client.post("/api/v1/tasks/999999/attachments", json={"filename": "orphan.png"}, headers=sales_headers)
    assert invalid_fk_attachment.status_code == 404
