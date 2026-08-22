import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_application_access
from app.db.session import get_db
from app.models import (
    ActivityLog,
    Application,
    CrmLeadCustomFieldValue,
    CrmTabField,
    FinanceCompany,
    FinancierDocumentAccessToken,
    FinancierDocumentSendItem,
    User,
)
from app.services.auth import touch_application
from app.services.email_service import send_financier_documents_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/applications", tags=["final-submission"])


# --- Schemas ---

class FinancierInfo(BaseModel):
    id: int | None = None
    name: str
    email: str | None = None


class DocumentSummaryItem(BaseModel):
    id: int
    name: str
    type: str
    mandatory: bool
    uploadStatus: str  # UPLOADED, PENDING
    fileName: str | None = None
    qualityStatus: str  # GOOD, POOR, NOT_CHECKED
    qualityScore: int | None = None
    verifiedBy: str | None = None
    verifiedOn: str | None = None
    fileMetadata: dict[str, Any] | None = None


class DocumentCounts(BaseModel):
    total: int
    mandatory: int
    uploaded: int
    pendingUpload: int
    qualityApproved: int
    qualityFailed: int
    verified: int
    pendingVerification: int


class LastSendInfo(BaseModel):
    status: str  # SENT, RESENT, FAILED, EXPIRED, REVOKED
    sentToName: str
    sentToEmail: str
    sentBy: str | None = None
    sentOn: str
    expiresAt: str
    accessCount: int = 0


class FinalSubmissionSummaryOut(BaseModel):
    leadId: int
    leadReferenceNumber: str
    financier: FinancierInfo
    overallStatus: str  # Documents Missing, Quality Failed, Pending Verification, Ready to Send, Sent to Financier, Link Expired
    canSend: bool
    blockers: list[str]
    counts: DocumentCounts
    documents: list[DocumentSummaryItem]
    lastSend: LastSendInfo | None = None


class SendToFinancierInput(BaseModel):
    confirm: bool = True


class SendToFinancierResponse(BaseModel):
    success: bool
    message: str
    sentTo: str
    expiresAt: str


# --- Core Helper ---

def compute_lead_final_submission_state(app: Application, db: Session) -> tuple[dict, list[DocumentSummaryItem], list[str], str, bool]:
    # 1. Financier info
    fc = app.finance_company
    fname = fc.name if fc else "Unassigned Financier"
    femail = fc.contact_email if (fc and fc.contact_email) else None

    financier_info = FinancierInfo(
        id=fc.id if fc else None,
        name=fname,
        email=femail,
    )

    # 2. Get file fields from CrmTabField & CrmLeadCustomFieldValue
    file_fields = (
        db.query(CrmTabField)
        .filter(CrmTabField.field_type == "file", CrmTabField.is_archived == False)
        .order_by(CrmTabField.display_order.asc())
        .all()
    )

    stored_map = {
        v.field_id: v
        for v in db.query(CrmLeadCustomFieldValue)
        .filter(CrmLeadCustomFieldValue.application_id == app.id)
        .all()
    }

    doc_items: list[DocumentSummaryItem] = []
    blockers: list[str] = []

    total_cnt = len(file_fields)
    mandatory_cnt = 0
    uploaded_cnt = 0
    pending_upload_cnt = 0
    quality_approved_cnt = 0
    quality_failed_cnt = 0
    verified_cnt = 0
    pending_verification_cnt = 0

    for f in file_fields:
        is_mand = bool(f.is_required)
        if is_mand:
            mandatory_cnt += 1

        val_rec = stored_map.get(f.id)
        file_meta = val_rec.file_metadata if (val_rec and val_rec.file_metadata) else None

        if file_meta:
            uploaded_cnt += 1
            upload_status = "UPLOADED"
            fname_str = file_meta.get("file_name", "Document")

            q_score = val_rec.quality_score if val_rec else None
            if q_score is not None:
                if q_score >= 50:
                    quality_status = "GOOD"
                    quality_approved_cnt += 1
                else:
                    quality_status = "POOR"
                    quality_failed_cnt += 1
                    if is_mand:
                        blockers.append(f"{f.label} quality status is Poor ({q_score}/100)")
            else:
                quality_status = "NOT_CHECKED"
                if is_mand:
                    blockers.append(f"{f.label} quality is Not Checked")

            is_ver = bool(val_rec.is_verified) if val_rec else False
            if is_ver:
                verified_cnt += 1
                vby = val_rec.verified_by.full_name if (val_rec and val_rec.verified_by) else "Authorized Verifier"
                von = val_rec.verified_at.strftime("%d %b %Y, %I:%M %p") if (val_rec and val_rec.verified_at) else None
            else:
                pending_verification_cnt += 1
                vby = "-"
                von = "-"
                if is_mand:
                    blockers.append(f"{f.label} is not verified")

        else:
            pending_upload_cnt += 1
            upload_status = "PENDING"
            fname_str = "-"
            quality_status = "-"
            q_score = None
            vby = "-"
            von = "-"
            if is_mand:
                blockers.append(f"{f.label} is not uploaded")

        doc_items.append(
            DocumentSummaryItem(
                id=f.id,
                name=f.label,
                type=f.help_text or "KYC Document",
                mandatory=is_mand,
                uploadStatus=upload_status,
                fileName=fname_str,
                qualityStatus=quality_status,
                qualityScore=q_score,
                verifiedBy=vby,
                verifiedOn=von,
                fileMetadata=file_meta,
            )
        )

    if not femail:
        blockers.append("Financier email is missing. Assign a financier with a valid contact email.")

    # 3. Last send token
    last_token = (
        db.query(FinancierDocumentAccessToken)
        .filter(FinancierDocumentAccessToken.application_id == app.id)
        .order_by(FinancierDocumentAccessToken.sent_at.desc())
        .first()
    )

    now = datetime.now(timezone.utc)
    last_send_out: LastSendInfo | None = None

    if last_token:
        sent_by_name = last_token.sent_by.full_name if last_token.sent_by else "System User"
        st = last_token.status
        if st == "ACTIVE" and last_token.expires_at < now:
            st = "EXPIRED"

        last_send_out = LastSendInfo(
            status=st,
            sentToName=last_token.financier_name,
            sentToEmail=last_token.financier_email,
            sentBy=sent_by_name,
            sentOn=last_token.sent_at.strftime("%d %b %Y, %I:%M %p"),
            expiresAt=last_token.expires_at.strftime("%d %b %Y, %I:%M %p"),
            accessCount=last_token.access_count,
        )

    # 4. Compute overall status badge
    if any("is not uploaded" in b for b in blockers):
        overall_status = "Documents Missing"
    elif any("quality" in b for b in blockers):
        overall_status = "Quality Failed"
    elif any("not verified" in b for b in blockers):
        overall_status = "Pending Verification"
    elif last_token and last_token.status == "ACTIVE" and last_token.expires_at >= now:
        overall_status = "Sent to Financier"
    elif last_token and (last_token.status == "EXPIRED" or last_token.expires_at < now):
        overall_status = "Link Expired"
    else:
        overall_status = "Ready to Send"

    can_send = len(blockers) == 0

    counts = DocumentCounts(
        total=total_cnt,
        mandatory=mandatory_cnt,
        uploaded=uploaded_cnt,
        pendingUpload=pending_upload_cnt,
        qualityApproved=quality_approved_cnt,
        qualityFailed=quality_failed_cnt,
        verified=verified_cnt,
        pendingVerification=pending_verification_cnt,
    )

    return (
        {
            "leadId": app.id,
            "leadReferenceNumber": app.app_no,
            "financier": financier_info,
            "overallStatus": overall_status,
            "canSend": can_send,
            "blockers": blockers,
            "counts": counts,
            "lastSend": last_send_out,
        },
        doc_items,
        blockers,
        overall_status,
        can_send,
    )


# --- Endpoints ---

@router.get("/{app_id}/final-submission", response_model=FinalSubmissionSummaryOut)
def get_final_submission_summary(
    app: Application = Depends(require_application_access),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    base_data, doc_items, blockers, overall_status, can_send = compute_lead_final_submission_state(app, db)
    base_data["documents"] = doc_items
    return base_data


@router.post("/{app_id}/final-submission/send-to-financier", response_model=SendToFinancierResponse)
def send_documents_to_financier(
    payload: SendToFinancierInput,
    request: Request,
    app: Application = Depends(require_application_access),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    base_data, doc_items, blockers, overall_status, can_send = compute_lead_final_submission_state(app, db)

    if not can_send:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Documents cannot be sent. Please resolve blocking issues.",
                "blockers": blockers,
            },
        )

    fc = app.finance_company
    if not fc or not fc.contact_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Financier contact email is not configured for this lead.",
        )

    now = datetime.now(timezone.utc)

    # 1. Revoke any existing active tokens for this lead
    existing_tokens = (
        db.query(FinancierDocumentAccessToken)
        .filter(
            FinancierDocumentAccessToken.application_id == app.id,
            FinancierDocumentAccessToken.status == "ACTIVE",
        )
        .all()
    )
    for tok in existing_tokens:
        tok.status = "REVOKED"
        tok.revoked_at = now

    # 2. Generate cryptographically secure token & SHA-256 hash
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    expires_at = now + timedelta(days=14)

    token_rec = FinancierDocumentAccessToken(
        token_hash=token_hash,
        application_id=app.id,
        financier_id=fc.id,
        financier_name=fc.name,
        financier_email=fc.contact_email,
        expires_at=expires_at,
        status="ACTIVE",
        sent_by_user_id=user.id,
        sent_at=now,
    )
    db.add(token_rec)
    db.flush()

    # 3. Snapshot current uploaded documents into send items
    for item in doc_items:
        if item.uploadStatus == "UPLOADED" and item.fileMetadata:
            meta = item.fileMetadata
            send_item = FinancierDocumentSendItem(
                token_id=token_rec.id,
                custom_field_value_id=item.id,
                field_name=item.name,
                field_label=item.name,
                file_name=meta.get("file_name", "Document"),
                file_path=meta.get("file_path", ""),
                file_size=meta.get("file_size"),
                mime_type=meta.get("mime_type"),
                is_mandatory=item.mandatory,
                quality_status=item.qualityStatus,
                quality_score=item.qualityScore,
                is_verified=(item.verifiedBy != "-"),
                verified_by_name=item.verifiedBy if item.verifiedBy != "-" else None,
                verified_at=now if (item.verifiedBy != "-") else None,
            )
            db.add(send_item)

    # 4. Write audit trail entry
    audit_entry = ActivityLog(
        application_id=app.id,
        actor_id=user.id,
        field_name="Send Documents to Financier",
        old_value="Pending Send",
        new_value=f"Sent to {fc.name} ({fc.contact_email}) by {user.full_name}",
    )
    db.add(audit_entry)
    touch_application(db, app)
    db.commit()

    # 5. Build public URL and dispatch email
    base_url = str(request.base_url).rstrip("/")
    # If request is from proxy / dev server, construct client origin
    host_header = request.headers.get("host", "localhost:5173")
    scheme = request.url.scheme
    client_base = f"{scheme}://{host_header}" if "5173" in host_header or "8000" in host_header else base_url
    
    secure_link = f"{client_base}/financier/documents-view/{raw_token}"
    expiry_str = expires_at.strftime("%d %b %Y, %I:%M %p UTC")

    email_sent = send_financier_documents_email(
        to_email=fc.contact_email,
        financier_name=fc.name,
        lead_ref=app.app_no,
        secure_link=secure_link,
        expiry_datetime_str=expiry_str,
    )

    if not email_sent:
        token_rec.status = "EMAIL_FAILED"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Documents could not be emailed to financier. Please verify SMTP settings and try again.",
        )

    return SendToFinancierResponse(
        success=True,
        message="Documents sent to financier successfully",
        sentTo=fc.contact_email,
        expiresAt=expires_at.strftime("%d %b %Y, %I:%M %p"),
    )
