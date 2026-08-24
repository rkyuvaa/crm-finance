import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models import SmtpSetting, User, UserRole
from app.services.email_service import dispatch_email_smtp

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/smtp-settings", tags=["smtp"])


# --- Schemas ---

class SmtpSettingOut(BaseModel):
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_security: str = "TLS"  # TLS, SSL, NONE
    smtp_user: str | None = None
    has_password: bool = False
    smtp_from_email: str | None = None
    smtp_from_name: str = "CRMFinance"
    is_enabled: bool = True


class SmtpSettingInput(BaseModel):
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_security: str = "TLS"
    smtp_user: str | None = None
    smtp_password: str | None = None  # None/empty string preserves existing password
    smtp_from_email: str | None = None
    smtp_from_name: str = "CRMFinance"
    is_enabled: bool = True


class SmtpTestInput(BaseModel):
    test_email: EmailStr
    smtp_host: str | None = None
    smtp_port: int | None = None
    smtp_security: str | None = None
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str | None = None
    smtp_from_name: str | None = None


class SmtpTestResponse(BaseModel):
    success: bool
    message: str


# --- Endpoints ---

@router.get("", response_model=SmtpSettingOut)
def get_smtp_settings(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN)),
):
    rec = db.query(SmtpSetting).first()
    if not rec:
        rec = SmtpSetting(id=1)
        db.add(rec)
        db.commit()
        db.refresh(rec)

    return SmtpSettingOut(
        smtp_host=rec.smtp_host,
        smtp_port=rec.smtp_port,
        smtp_security=rec.smtp_security,
        smtp_user=rec.smtp_user,
        has_password=bool(rec.smtp_password),
        smtp_from_email=rec.smtp_from_email,
        smtp_from_name=rec.smtp_from_name,
        is_enabled=rec.is_enabled,
    )


@router.post("", response_model=SmtpSettingOut)
def update_smtp_settings(
    payload: SmtpSettingInput,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN)),
):
    rec = db.query(SmtpSetting).first()
    if not rec:
        rec = SmtpSetting(id=1)
        db.add(rec)

    rec.smtp_host = payload.smtp_host
    rec.smtp_port = payload.smtp_port
    rec.smtp_security = payload.smtp_security
    rec.smtp_user = payload.smtp_user
    rec.smtp_from_email = payload.smtp_from_email
    rec.smtp_from_name = payload.smtp_from_name
    rec.is_enabled = payload.is_enabled

    # Only update password if non-empty string provided
    if payload.smtp_password is not None and payload.smtp_password.strip() != "":
        rec.smtp_password = payload.smtp_password.strip()

    db.commit()
    db.refresh(rec)

    return SmtpSettingOut(
        smtp_host=rec.smtp_host,
        smtp_port=rec.smtp_port,
        smtp_security=rec.smtp_security,
        smtp_user=rec.smtp_user,
        has_password=bool(rec.smtp_password),
        smtp_from_email=rec.smtp_from_email,
        smtp_from_name=rec.smtp_from_name,
        is_enabled=rec.is_enabled,
    )


@router.post("/test", response_model=SmtpTestResponse)
def test_smtp_configuration(
    payload: SmtpTestInput,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN)),
):
    subject = "CRMFinance Mail Server Connection Test"
    plain_text = "Hello,\n\nThis is a test email from CRMFinance to verify your SMTP mail server configuration.\n\nRegards,\nCRMFinance Team"
    html_content = """<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f7f9f5; padding: 20px;">
  <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border: 1px solid #e4ebe1; padding: 24px; border-radius: 12px;">
    <h3 style="color: #023020; margin-top: 0;">Mail Server Test Successful ✅</h3>
    <p style="color: #44584c;">This email confirms that your SMTP mail server configuration is working correctly.</p>
    <p style="font-size: 12px; color: #7a8b80; border-top: 1px solid #e4ebe1; pt: 12px;">Sent from CRMFinance Settings</p>
  </div>
</body>
</html>"""

    override_data = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()

    success, err_msg = dispatch_email_smtp(
        to_email=payload.test_email,
        subject=subject,
        plain_text=plain_text,
        html_content=html_content,
        db=db,
        smtp_override=override_data,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg,
        )

    return SmtpTestResponse(
        success=True,
        message=f"Test email sent successfully to {payload.test_email}",
    )
