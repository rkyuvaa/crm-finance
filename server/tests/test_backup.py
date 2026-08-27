import json
import pytest
from app.models import CrmTab, CrmTabField, UserRole
from app.services.backup_service import create_system_backup, get_system_summary, restore_system_backup
from tests.conftest import auth_headers, login


def test_create_and_restore_backup_service(db):
    # Add a CrmTab and CrmTabField
    tab = CrmTab(name="Custom Info", code="custom_info", display_order=1)
    db.add(tab)
    db.flush()

    field = CrmTabField(
        tab_id=tab.id,
        name="vehicle_color",
        label="Vehicle Color",
        field_type="text",
        is_required=True,
    )
    db.add(field)
    db.commit()

    # Create backup
    backup = create_system_backup(db)
    assert "metadata" in backup
    assert "data" in backup
    assert len(backup["data"]["crm_tabs"]) == 1
    assert backup["data"]["crm_tabs"][0]["code"] == "custom_info"
    assert len(backup["data"]["crm_tab_fields"]) == 1
    assert backup["data"]["crm_tab_fields"][0]["name"] == "vehicle_color"

    # Modify record in DB
    field.label = "Modified Vehicle Color"
    db.commit()

    # Restore backup in overwrite mode
    result = restore_system_backup(db, backup, mode="overwrite")
    assert result["status"] == "success"

    # Check restored value
    refreshed_field = db.query(CrmTabField).filter_by(name="vehicle_color").first()
    assert refreshed_field is not None
    assert refreshed_field.label == "Vehicle Color"


def test_backup_endpoints(seeded_client, db):
    admin_token = login(seeded_client, "admin@kim.com")
    headers = auth_headers(admin_token)

    # 1. Summary endpoint
    res = seeded_client.get("/api/v1/admin/backup/summary", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "users" in data
    assert data["users"] >= 3

    # 2. Export endpoint
    export_res = seeded_client.get("/api/v1/admin/backup/export", headers=headers)
    assert export_res.status_code == 200
    assert "attachment; filename=crm_finance_backup_" in export_res.headers["content-disposition"]
    
    backup_payload = export_res.json()
    assert "metadata" in backup_payload
    assert "data" in backup_payload

    # 3. Restore endpoint
    backup_file_bytes = json.dumps(backup_payload).encode("utf-8")
    restore_res = seeded_client.post(
        "/api/v1/admin/backup/restore?mode=overwrite",
        headers=headers,
        files={"file": ("test_backup.json", backup_file_bytes, "application/json")},
    )
    assert restore_res.status_code == 200
    assert restore_res.json()["status"] == "success"


def test_backup_restore_unauthorized(seeded_client):
    sales_token = login(seeded_client, "sales@kim.com")
    headers = auth_headers(sales_token)

    res = seeded_client.get("/api/v1/admin/backup/summary", headers=headers)
    assert res.status_code == 403
