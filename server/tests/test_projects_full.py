import pytest
from app.models.enums import UserRole
from tests.conftest import DEFAULT_PASSWORD, auth_headers, login, make_user

def test_project_crud_and_milestones(seeded_client, db):
    # 1. Login as admin
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)

    # 2. CREATE Project
    create_payload = {
        "name": "ERP System Migration",
        "code": "PRJ-2026-001",
        "description": "Migrating legacy ERP to Cloud",
        "budget": 500000.0,
        "category": "Technology",
    }
    create_resp = seeded_client.post("/api/v1/projects", json=create_payload, headers=headers)
    assert create_resp.status_code == 201, create_resp.text
    project_data = create_resp.json()
    project_id = project_data["id"]
    assert project_data["name"] == "ERP System Migration"
    assert project_data["code"] == "PRJ-2026-001"
    assert project_data["budget"] == 500000.0

    # 3. READ List Projects
    list_resp = seeded_client.get("/api/v1/projects", headers=headers)
    assert list_resp.status_code == 200
    projects_list = list_resp.json()
    assert any(p["id"] == project_id for p in projects_list)

    # 4. READ Single Project
    get_resp = seeded_client.get(f"/api/v1/projects/{project_id}", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == project_id

    # 5. UPDATE Project
    update_payload = {
        "name": "ERP System Migration Phase 1",
        "budget": 650000.0,
        "progress": 25,
    }
    update_resp = seeded_client.put(f"/api/v1/projects/{project_id}", json=update_payload, headers=headers)
    assert update_resp.status_code == 200
    updated_data = update_resp.json()
    assert updated_data["name"] == "ERP System Migration Phase 1"
    assert updated_data["budget"] == 650000.0
    assert updated_data["progress"] == 25

    # 6. CREATE Milestone for Project
    m_payload = {
        "title": "Phase 1 Requirement Gathering",
        "description": "Finalize SRS document",
        "due_date": "2026-10-15",
    }
    m_resp = seeded_client.post(f"/api/v1/projects/{project_id}/milestones", json=m_payload, headers=headers)
    assert m_resp.status_code == 201, m_resp.text
    m_data = m_resp.json()
    milestone_id = m_data["id"]
    assert m_data["title"] == "Phase 1 Requirement Gathering"

    # 7. READ Milestones
    m_list_resp = seeded_client.get(f"/api/v1/projects/{project_id}/milestones", headers=headers)
    assert m_list_resp.status_code == 200
    assert len(m_list_resp.json()) == 1

    # 8. UPDATE Milestone
    m_update_resp = seeded_client.patch(
        f"/api/v1/projects/milestones/{milestone_id}",
        json={"is_completed": True},
        headers=headers,
    )
    assert m_update_resp.status_code == 200
    assert m_update_resp.json()["is_completed"] is True

    # 9. DELETE Milestone
    del_m_resp = seeded_client.delete(f"/api/v1/projects/milestones/{milestone_id}", headers=headers)
    assert del_m_resp.status_code == 204

    # 10. DELETE Project
    del_p_resp = seeded_client.delete(f"/api/v1/projects/{project_id}", headers=headers)
    assert del_p_resp.status_code == 204

    # 11. Verify Deletion
    get_deleted = seeded_client.get(f"/api/v1/projects/{project_id}", headers=headers)
    assert get_deleted.status_code == 404


def test_project_custom_fields_definitions_crud(seeded_client):
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)

    # Create Custom Field Def for Project
    cf_payload = {
        "name": "cost_center",
        "label": "Cost Center",
        "field_type": "text",
        "is_required": False,
        "display_order": 1,
    }
    cf_resp = seeded_client.post("/api/v1/projects/custom-fields/definitions", json=cf_payload, headers=headers)
    assert cf_resp.status_code == 201, cf_resp.text
    cf_id = cf_resp.json()["id"]

    # List Custom Field Defs
    list_cf = seeded_client.get("/api/v1/projects/custom-fields/definitions", headers=headers)
    assert list_cf.status_code == 200
    assert any(item["id"] == cf_id for item in list_cf.json())
