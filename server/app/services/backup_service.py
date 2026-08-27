import io
import json
import os
import shutil
import zipfile
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional
from sqlalchemy import inspect, select, text
from sqlalchemy.orm import Session

from app.models import (
    Action,
    Activity,
    ActivityLog,
    Application,
    ApplicationSequence,
    AuditLog,
    CrmLeadCustomFieldValue,
    CrmTab,
    CrmTabField,
    CrmTabFilter,
    CrmTabStageMapping,
    Delivery,
    Department,
    DepartmentUser,
    Disbursement,
    Document,
    FinanceCompany,
    FinanceSubmission,
    FinancierDocumentAccessLog,
    FinancierDocumentAccessToken,
    FinancierDocumentSendItem,
    Module,
    Notification,
    Permission,
    PipelineStage,
    PlannedActivity,
    RbacUserRole,
    Resource,
    Role,
    RoleDataScope,
    RoleFieldPermission,
    RolePermission,
    Sanction,
    SmtpSetting,
    StageAutomoveRule,
    User,
    UserPermission,
    VehicleModel,
    Verification,
)

UPLOAD_DIR_PATH = Path("uploads")

# Topological model list for export and import
TABLE_MODELS = [
    ("pipeline_stages", PipelineStage),
    ("finance_companies", FinanceCompany),
    ("vehicle_models", VehicleModel),
    ("departments", Department),
    ("roles", Role),
    ("modules", Module),
    ("resources", Resource),
    ("actions", Action),
    ("permissions", Permission),
    ("role_permissions", RolePermission),
    ("role_data_scopes", RoleDataScope),
    ("role_field_permissions", RoleFieldPermission),
    ("users", User),
    ("department_users", DepartmentUser),
    ("user_roles", RbacUserRole),
    ("user_permissions", UserPermission),
    ("smtp_settings", SmtpSetting),
    ("stage_automove_rules", StageAutomoveRule),
    ("crm_tabs", CrmTab),
    ("crm_tab_fields", CrmTabField),
    ("crm_tab_stage_mappings", CrmTabStageMapping),
    ("crm_tab_filters", CrmTabFilter),
    ("application_sequences", ApplicationSequence),
    ("applications", Application),
    ("crm_lead_custom_field_values", CrmLeadCustomFieldValue),
    ("documents", Document),
    ("verifications", Verification),
    ("finance_submissions", FinanceSubmission),
    ("sanctions", Sanction),
    ("deliveries", Delivery),
    ("disbursements", Disbursement),
    ("activities", Activity),
    ("activity_logs", ActivityLog),
    ("planned_activities", PlannedActivity),
    ("notifications", Notification),
    ("financier_document_access_tokens", FinancierDocumentAccessToken),
    ("financier_document_send_items", FinancierDocumentSendItem),
    ("financier_document_access_logs", FinancierDocumentAccessLog),
]


def serialize_value(val: Any) -> Any:
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if isinstance(val, Enum):
        return val.value
    if isinstance(val, Decimal):
        return float(val)
    return val


def sql_format_value(val: Any) -> str:
    if val is None:
        return "NULL"
    if isinstance(val, bool):
        return "TRUE" if val else "FALSE"
    if isinstance(val, (int, float, Decimal)):
        return str(val)
    if isinstance(val, (datetime, date)):
        return f"'{val.isoformat()}'"
    if isinstance(val, Enum):
        escaped = str(val.value).replace("'", "''")
        return f"'{escaped}'"
    if isinstance(val, (dict, list)):
        escaped = json.dumps(val).replace("'", "''")
        return f"'{escaped}'"
    
    escaped = str(val).replace("'", "''")
    return f"'{escaped}'"


def deserialize_value(val: Any, col_type: Any) -> Any:
    if val is None:
        return None
    type_str = str(col_type).upper()
    if "DATETIME" in type_str or "TIMESTAMP" in type_str:
        if isinstance(val, str):
            return datetime.fromisoformat(val)
    elif "DATE" in type_str:
        if isinstance(val, str):
            return date.fromisoformat(val)
    return val


def create_system_backup(db: Session, include_audit_logs: bool = False) -> Dict[str, Any]:
    """Serializes all database tables into a JSON-compatible dict payload."""
    tables_payload = {}
    record_counts = {}

    models_to_export = list(TABLE_MODELS)
    if include_audit_logs:
        models_to_export.append(("audit_logs", AuditLog))

    for key, model in models_to_export:
        mapper = inspect(model)
        col_names = [col.key for col in mapper.columns]
        
        records = db.scalars(select(model)).unique().all()
        rows = []
        for rec in records:
            row_data = {}
            for col in col_names:
                val = getattr(rec, col)
                row_data[col] = serialize_value(val)
            rows.append(row_data)
        
        tables_payload[key] = rows
        record_counts[key] = len(rows)

    return {
        "metadata": {
            "version": "1.0",
            "app": "CRMFinance",
            "created_at": datetime.utcnow().isoformat(),
            "total_tables": len(tables_payload),
            "record_counts": record_counts,
        },
        "data": tables_payload,
    }


def generate_sql_dump(db: Session, include_audit_logs: bool = False) -> str:
    """Generates standard SQL script containing DDL/INSERT statements for all system tables."""
    sql_lines = [
        "-- ========================================================",
        "-- CRMFinance System SQL Database Dump",
        f"-- Exported at: {datetime.utcnow().isoformat()} UTC",
        "-- ========================================================\n",
        "BEGIN;\n"
    ]

    models_to_export = list(TABLE_MODELS)
    if include_audit_logs:
        models_to_export.append(("audit_logs", AuditLog))

    for key, model in models_to_export:
        table_name = model.__tablename__
        mapper = inspect(model)
        col_names = [col.key for col in mapper.columns]

        records = db.scalars(select(model)).unique().all()
        sql_lines.append(f"-- Table: {table_name}")

        if records:
            for rec in records:
                col_sql = ", ".join([f'"{col}"' for col in col_names])
                val_sql = ", ".join([sql_format_value(getattr(rec, col)) for col in col_names])
                sql_lines.append(f'INSERT INTO "{table_name}" ({col_sql}) VALUES ({val_sql});')
        else:
            sql_lines.append(f"-- (0 records in {table_name})")

        sql_lines.append("")

    sql_lines.append("COMMIT;\n")
    return "\n".join(sql_lines)


def create_system_zip_backup(db: Session, target_upload_dir: Path = UPLOAD_DIR_PATH) -> bytes:
    """Generates a complete system backup ZIP containing SQL dump, JSON metadata, and uploaded images/files."""
    backup_payload = create_system_backup(db, include_audit_logs=True)
    sql_dump_str = generate_sql_dump(db, include_audit_logs=True)

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        # 1. Add SQL Dump
        zip_file.writestr("database_dump.sql", sql_dump_str.encode("utf-8"))

        # 2. Add JSON Backup
        zip_file.writestr("backup_data.json", json.dumps(backup_payload, indent=2, ensure_ascii=False).encode("utf-8"))

        # 3. Add Uploaded images / files directory if it exists
        uploaded_files_count = 0
        if target_upload_dir.exists() and target_upload_dir.is_dir():
            for root, _, files in os.walk(target_upload_dir):
                for file in files:
                    file_path = Path(root) / file
                    arcname = Path("uploads") / file_path.relative_to(target_upload_dir)
                    zip_file.write(file_path, arcname=str(arcname))
                    uploaded_files_count += 1

        # 4. Manifest
        manifest = {
            "app": "CRMFinance",
            "created_at": datetime.utcnow().isoformat(),
            "format": "zip_full_backup",
            "uploaded_files_count": uploaded_files_count,
            "database_tables": backup_payload["metadata"]["total_tables"],
        }
        zip_file.writestr("manifest.json", json.dumps(manifest, indent=2).encode("utf-8"))

    zip_buffer.seek(0)
    return zip_buffer.getvalue()


def restore_system_backup(db: Session, backup_payload: Dict[str, Any], mode: str = "overwrite") -> Dict[str, Any]:
    """Restores database tables from a backup payload dict."""
    if "data" not in backup_payload:
        raise ValueError("Invalid backup file format: missing 'data' key.")

    tables_data = backup_payload["data"]
    restored_summary = {}

    try:
        if mode == "overwrite":
            for key, model in reversed(TABLE_MODELS):
                db.query(model).delete(synchronize_session=False)
            db.flush()
            db.expire_all()

        for key, model in TABLE_MODELS:
            if key not in tables_data:
                continue

            mapper = inspect(model)
            col_types = {col.key: col.type for col in mapper.columns}
            rows = tables_data[key]
            inserted_count = 0

            for row_dict in rows:
                processed_row = {}
                for col_name, val in row_dict.items():
                    if col_name in col_types:
                        processed_row[col_name] = deserialize_value(val, col_types[col_name])
                
                if mode == "merge":
                    pk_cols = [pk.key for pk in mapper.primary_key]
                    pk_filter = {pk: processed_row[pk] for pk in pk_cols if pk in processed_row}
                    existing = None
                    if pk_filter and len(pk_filter) == len(pk_cols):
                        existing = db.query(model).filter_by(**pk_filter).first()
                    
                    if existing:
                        for k, v in processed_row.items():
                            setattr(existing, k, v)
                    else:
                        obj = model(**processed_row)
                        db.add(obj)
                else:
                    obj = model(**processed_row)
                    db.add(obj)

                inserted_count += 1

            db.flush()
            restored_summary[key] = inserted_count

        if db.bind and db.bind.dialect.name == "postgresql":
            for key, model in TABLE_MODELS:
                table_name = model.__tablename__
                try:
                    db.execute(text(f"SELECT setval(pg_get_serial_sequence('{table_name}', 'id'), COALESCE(MAX(id), 1)) FROM {table_name};"))
                except Exception:
                    pass

        db.commit()
    except Exception as e:
        db.rollback()
        raise RuntimeError(f"Backup restoration failed: {str(e)}") from e

    return {
        "status": "success",
        "message": "System data successfully restored.",
        "restored_tables": restored_summary,
    }


def restore_system_zip_backup(
    db: Session,
    zip_bytes: bytes,
    mode: str = "overwrite",
    target_upload_dir: Path = UPLOAD_DIR_PATH,
) -> Dict[str, Any]:
    """Restores database AND uploaded images/files from a complete ZIP backup archive."""
    try:
        zip_buffer = io.BytesIO(zip_bytes)
        with zipfile.ZipFile(zip_buffer, "r") as zip_file:
            filenames = zip_file.namelist()

            # 1. Restore Database
            backup_payload = None
            if "backup_data.json" in filenames:
                json_bytes = zip_file.read("backup_data.json")
                backup_payload = json.loads(json_bytes.decode("utf-8"))
            
            if not backup_payload:
                raise ValueError("ZIP package missing 'backup_data.json' database archive.")

            db_result = restore_system_backup(db, backup_payload, mode=mode)

            # 2. Restore Uploaded files/images
            restored_files_count = 0
            target_upload_dir.mkdir(parents=True, exist_ok=True)

            for member in zip_file.infolist():
                if member.filename.startswith("uploads/") and not member.is_dir():
                    rel_path = Path(member.filename).relative_to("uploads")
                    dest_file = target_upload_dir / rel_path
                    dest_file.parent.mkdir(parents=True, exist_ok=True)

                    with zip_file.open(member) as source, open(dest_file, "wb") as target:
                        shutil.copyfileobj(source, target)
                    restored_files_count += 1

            return {
                "status": "success",
                "message": f"Successfully restored database and {restored_files_count} uploaded files/images.",
                "restored_tables": db_result.get("restored_tables", {}),
                "restored_files_count": restored_files_count,
            }
    except Exception as e:
        raise RuntimeError(f"ZIP Backup restoration failed: {str(e)}") from e


def get_system_summary(db: Session) -> Dict[str, Any]:
    """Returns database record counts for summary inspection."""
    summary = {}
    for key, model in TABLE_MODELS:
        count = db.query(model).count()
        summary[key] = count
    return summary
