import json
from datetime import datetime
from typing import Any, Dict

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_roles
from app.models.enums import UserRole
from app.models.user import User
from app.services.backup_service import create_system_backup, get_system_summary, restore_system_backup

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
    include_audit_logs: bool = Query(False, description="Include audit log entries"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
):
    """Exports full database as downloadable JSON backup file."""
    backup_data = create_system_backup(db, include_audit_logs=include_audit_logs)
    
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
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
    """Restores database from an uploaded JSON backup file."""
    if not file.filename.endswith(".json"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only .json backup files are supported.",
        )

    try:
        content = await file.read()
        backup_payload = json.loads(content.decode("utf-8"))
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not parse backup file: {str(err)}",
        )

    try:
        result = restore_system_backup(db, backup_payload, mode=mode)
        return result
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Restoration failed: {str(err)}",
        )
