import json
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
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


def restore_system_backup(db: Session, backup_payload: Dict[str, Any], mode: str = "overwrite") -> Dict[str, Any]:
    """Restores database tables from a backup payload.
    
    Args:
        db: SQLAlchemy Session
        backup_payload: Dict containing metadata and data
        mode: "overwrite" (deletes dynamic tables first) or "merge"
    """
    if "data" not in backup_payload:
        raise ValueError("Invalid backup file format: missing 'data' key.")

    tables_data = backup_payload["data"]
    restored_summary = {}

    # We perform all deletions and insertions inside a savepoint / nested transaction
    try:
        # Step 1: In overwrite mode, delete existing records in reverse topological order
        if mode == "overwrite":
            for key, model in reversed(TABLE_MODELS):
                db.query(model).delete(synchronize_session=False)
            db.flush()
            db.expire_all()

        # Step 2: Insert rows in topological order
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
                    # Check if primary key exists
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

        # Adjust Postgres auto-increment sequences if on PostgreSQL
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


def get_system_summary(db: Session) -> Dict[str, Any]:
    """Returns database record counts for summary inspection."""
    summary = {}
    for key, model in TABLE_MODELS:
        count = db.query(model).count()
        summary[key] = count
    return summary
