import json
from datetime import datetime
from typing import Any, Dict

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_roles
from app.models.enums import UserRole
from app.models.user import User
from app.services.backup_service import (
    create_system_backup,
    create_system_zip_backup,
    generate_sql_dump,
    get_system_summary,
    restore_system_backup,
    restore_system_zip_backup,
)

router = APIRouter()


@router.get("/summary", response_model=Dict[str, Any])
def get_backup_summary_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
):
    """Returns database record counts summary for backup inspection."""
    return get_system_summary(db)


@router.get("/export")
def export_backup_endpoint(
    format: str = Query("zip", pattern="^(zip|sql|json)$"),
    include_audit_logs: bool = Query(True, description="Include audit log entries"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
):
    """Exports full database (SQL/JSON) and uploaded files/images as downloadable package."""
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

    if format == "zip":
        zip_bytes = create_system_zip_backup(db)
        filename = f"crm_finance_full_backup_{timestamp}.zip"
        return Response(
            content=zip_bytes,
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    elif format == "sql":
        sql_str = generate_sql_dump(db, include_audit_logs=include_audit_logs)
        filename = f"crm_finance_db_dump_{timestamp}.sql"
        return Response(
            content=sql_str.encode("utf-8"),
            media_type="application/sql",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    else:
        backup_data = create_system_backup(db, include_audit_logs=include_audit_logs)
        filename = f"crm_finance_backup_{timestamp}.json"
        json_bytes = json.dumps(backup_data, indent=2, ensure_ascii=False).encode("utf-8")
        return Response(
            content=json_bytes,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )


@router.post("/restore")
async def restore_backup_endpoint(
    file: UploadFile = File(...),
    mode: str = Query("overwrite", pattern="^(overwrite|merge)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
):
    """Restores system database AND uploaded images/files from uploaded ZIP, SQL, or JSON backup."""
    filename = file.filename.lower()
    
    if not (filename.endswith(".zip") or filename.endswith(".json") or filename.endswith(".sql")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only .zip, .sql, or .json backup files are supported.",
        )

    try:
        content = await file.read()
        
        if filename.endswith(".zip"):
            result = restore_system_zip_backup(db, content, mode=mode)
            return result
        elif filename.endswith(".json"):
            backup_payload = json.loads(content.decode("utf-8"))
            result = restore_system_backup(db, backup_payload, mode=mode)
            return result
        else:
            # Simple SQL string fallback if uploaded plain SQL
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="For database & image restoration, please upload the complete backup .zip package.",
            )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Restoration failed: {str(err)}",
        )
