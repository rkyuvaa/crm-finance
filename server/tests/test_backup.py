import io
import json
import zipfile
from pathlib import Path
import pytest
from app.models import CrmTab, CrmTabField, UserRole
from app.services.backup_service import (
    create_system_backup,
    create_system_zip_backup,
    generate_sql_dump,
    get_system_summary,
    restore_system_backup,
    restore_system_zip_backup,
)
from tests.conftest import auth_headers, login


def test_create_and_restore_backup_service(db):
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

    backup = create_system_backup(db)
    assert "metadata" in backup
    assert "data" in backup
    assert len(backup["data"]["crm_tabs"]) == 1
    assert backup["data"]["crm_tabs"][0]["code"] == "custom_info"
    assert len(backup["data"]["crm_tab_fields"]) == 1
    assert backup["data"]["crm_tab_fields"][0]["name"] == "vehicle_color"

    field.label = "Modified Vehicle Color"
    db.commit()

    result = restore_system_backup(db, backup, mode="overwrite")
    assert result["status"] == "success"

    refreshed_field = db.query(CrmTabField).filter_by(name="vehicle_color").first()
    assert refreshed_field is not None
    assert refreshed_field.label == "Vehicle Color"


def test_generate_sql_dump(db):
    tab = CrmTab(name="SQL Test Tab", code="sql_test_tab", display_order=2)
    db.add(tab)
    db.commit()

    sql_dump = generate_sql_dump(db)
    assert 'INSERT INTO "crm_tabs"' in sql_dump
    assert "'sql_test_tab'" in sql_dump


def test_zip_backup_and_restore_with_uploads(db, tmp_path):
    upload_dir = tmp_path / "uploads"
    upload_dir.mkdir()
    sample_file = upload_dir / "kyc_doc.png"
    sample_file.write_bytes(b"PNG_SAMPLE_BYTES")

    zip_bytes = create_system_zip_backup(db, target_upload_dir=upload_dir)
    assert len(zip_bytes) > 0

    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
        names = zf.namelist()
        assert "database_dump.sql" in names
        assert "backup_data.json" in names
        assert "uploads/kyc_doc.png" in names

    restore_upload_dir = tmp_path / "restored_uploads"
    res = restore_system_zip_backup(db, zip_bytes, mode="overwrite", target_upload_dir=restore_upload_dir)
    assert res["status"] == "success"
    assert res["restored_files_count"] == 1
    assert (restore_upload_dir / "kyc_doc.png").exists()
    assert (restore_upload_dir / "kyc_doc.png").read_bytes() == b"PNG_SAMPLE_BYTES"


def test_backup_endpoints(seeded_client, db):
    admin_token = login(seeded_client, "admin@kim.com")
    headers = auth_headers(admin_token)

    # 1. Summary
    res = seeded_client.get("/api/v1/admin/backup/summary", headers=headers)
    assert res.status_code == 200

    # 2. Export ZIP
    export_res = seeded_client.get("/api/v1/admin/backup/export?format=zip", headers=headers)
    assert export_res.status_code == 200
    assert "crm_finance_full_backup_" in export_res.headers["content-disposition"]
    zip_bytes = export_res.content

    # 3. Restore ZIP
    restore_res = seeded_client.post(
        "/api/v1/admin/backup/restore?mode=overwrite",
        headers=headers,
        files={"file": ("backup.zip", zip_bytes, "application/zip")},
    )
    assert restore_res.status_code == 200
    assert restore_res.json()["status"] == "success"
