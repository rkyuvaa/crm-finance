import base64
import hashlib
import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import (
    FinancierDocumentAccessLog,
    FinancierDocumentAccessToken,
    FinancierDocumentSendItem,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/public/financier", tags=["public-financier"])


# --- Schemas ---

class PublicDocumentItemOut(BaseModel):
    id: int
    name: str
    type: str
    fileName: str
    uploadStatus: str
    qualityStatus: str
    qualityScore: int | None = None
    verifiedBy: str | None = None
    verifiedOn: str | None = None
    previewUrl: str
    downloadUrl: str


class PublicFinancierDocumentViewOut(BaseModel):
    leadReferenceNumber: str
    financierName: str
    expiresAt: str
    documents: list[PublicDocumentItemOut]


# --- Helpers ---

def _resolve_active_token(token: str, db: Session, request: Request, action: str) -> tuple[FinancierDocumentAccessToken, str]:
    now = datetime.now(timezone.utc)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()

    token_rec = (
        db.query(FinancierDocumentAccessToken)
        .filter(FinancierDocumentAccessToken.token_hash == token_hash)
        .first()
    )

    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    if not token_rec or token_rec.status != "ACTIVE" or token_rec.expires_at < now:
        # Log rejected attempt silently
        log_entry = FinancierDocumentAccessLog(
            token_id=token_rec.id if token_rec else None,
            application_id=token_rec.application_id if token_rec else None,
            financier_email=token_rec.financier_email if token_rec else None,
            action="rejected",
            ip_address=client_ip,
            user_agent=user_agent,
            accessed_at=now,
            success=False,
            failure_reason="Invalid, expired, or revoked token",
        )
        db.add(log_entry)
        db.commit()

        # Generic 404 to prevent lead/token enumeration
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This document link is invalid, expired, or has been revoked. Please contact the sender for a new link.",
        )

    # Log successful access
    token_rec.last_accessed_at = now
    token_rec.access_count += 1

    log_entry = FinancierDocumentAccessLog(
        token_id=token_rec.id,
        application_id=token_rec.application_id,
        financier_email=token_rec.financier_email,
        action=action,
        ip_address=client_ip,
        user_agent=user_agent,
        accessed_at=now,
        success=True,
    )
    db.add(log_entry)
    db.commit()

    return token_rec, token_hash


# --- Endpoints ---

@router.get("/documents/{token}", response_model=PublicFinancierDocumentViewOut)
def get_public_financier_document_view(
    token: str,
    request: Request,
    db: Session = Depends(get_db),
):
    token_rec, _ = _resolve_active_token(token, db, request, action="page_view")

    items = (
        db.query(FinancierDocumentSendItem)
        .filter(FinancierDocumentSendItem.token_id == token_rec.id)
        .order_by(FinancierDocumentSendItem.id.asc())
        .all()
    )

    doc_list: list[PublicDocumentItemOut] = []
    for item in items:
        von_str = item.verified_at.strftime("%d %b %Y, %I:%M %p") if item.verified_at else None
        doc_list.append(
            PublicDocumentItemOut(
                id=item.id,
                name=item.field_label,
                type=item.field_name,
                fileName=item.file_name,
                uploadStatus="UPLOADED",
                qualityStatus=item.quality_status,
                qualityScore=item.quality_score,
                verifiedBy=item.verified_by_name or "-",
                verifiedOn=von_str or "-",
                previewUrl=f"/api/v1/public/financier/documents/{token}/files/{item.id}/preview",
                downloadUrl=f"/api/v1/public/financier/documents/{token}/files/{item.id}/download",
            )
        )

    return PublicFinancierDocumentViewOut(
        leadReferenceNumber=token_rec.application.app_no if token_rec.application else f"APP-{token_rec.application_id}",
        financierName=token_rec.financier_name,
        expiresAt=token_rec.expires_at.strftime("%d %b %Y, %I:%M %p"),
        documents=doc_list,
    )


@router.get("/documents/{token}/files/{item_id}/preview")
def preview_public_financier_file(
    token: str,
    item_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    token_rec, _ = _resolve_active_token(token, db, request, action="file_preview")

    item = (
        db.query(FinancierDocumentSendItem)
        .filter(
            FinancierDocumentSendItem.id == item_id,
            FinancierDocumentSendItem.token_id == token_rec.id,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document file not found")

    file_path = item.file_path
    mime_type = item.mime_type or "application/octet-stream"

    # Handle Base64 Data URL or direct content stream
    if file_path.startswith("data:"):
        try:
            parts = file_path.split(",")
            b64_str = parts[1] if len(parts) > 1 else parts[0]
            raw_bytes = base64.b64decode(b64_str)
            return Response(content=raw_bytes, media_type=mime_type)
        except Exception as e:
            logger.error(f"Failed to decode base64 preview: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not render file preview")

    return Response(content=file_path.encode(), media_type=mime_type)


@router.get("/documents/{token}/files/{item_id}/download")
def download_public_financier_file(
    token: str,
    item_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    token_rec, _ = _resolve_active_token(token, db, request, action="file_download")

    item = (
        db.query(FinancierDocumentSendItem)
        .filter(
            FinancierDocumentSendItem.id == item_id,
            FinancierDocumentSendItem.token_id == token_rec.id,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document file not found")

    file_path = item.file_path
    mime_type = item.mime_type or "application/octet-stream"
    file_name = item.file_name or "document"

    headers = {
        "Content-Disposition": f'attachment; filename="{file_name}"'
    }

    if file_path.startswith("data:"):
        try:
            parts = file_path.split(",")
            b64_str = parts[1] if len(parts) > 1 else parts[0]
            raw_bytes = base64.b64decode(b64_str)
            return Response(content=raw_bytes, media_type=mime_type, headers=headers)
        except Exception as e:
            logger.error(f"Failed to decode base64 download: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not process file download")

    return Response(content=file_path.encode(), media_type=mime_type, headers=headers)
