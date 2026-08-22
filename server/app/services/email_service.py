import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.smtp_setting import SmtpSetting

logger = logging.getLogger(__name__)


def dispatch_email_smtp(
    to_email: str,
    subject: str,
    plain_text: str,
    html_content: str,
    db: Session | None = None,
) -> tuple[bool, str | None]:
    """
    Dispatches email via database SmtpSetting (or config fallback).
    Returns (success, error_message).
    """
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        smtp_rec = db.query(SmtpSetting).first()

        host = smtp_rec.smtp_host if (smtp_rec and smtp_rec.smtp_host) else getattr(settings, "SMTP_HOST", None)
        port = smtp_rec.smtp_port if smtp_rec else getattr(settings, "SMTP_PORT", 587)
        security = (smtp_rec.smtp_security if smtp_rec else "TLS").upper()
        user = smtp_rec.smtp_user if (smtp_rec and smtp_rec.smtp_user) else getattr(settings, "SMTP_USER", None)
        password = smtp_rec.smtp_password if (smtp_rec and smtp_rec.smtp_password) else getattr(settings, "SMTP_PASSWORD", None)
        from_email = (
            smtp_rec.smtp_from_email if (smtp_rec and smtp_rec.smtp_from_email)
            else getattr(settings, "SMTP_FROM", f"noreply@{host or 'crmfinance.com'}")
        )
        from_name = smtp_rec.smtp_from_name if smtp_rec else "CRMFinance"
        is_enabled = smtp_rec.is_enabled if smtp_rec else True

        if not is_enabled:
            logger.info(f"Email service disabled. Simulated dispatch to {to_email}")
            return True, None

        if not host:
            logger.info(f"SMTP Host not configured. Simulated email dispatch to {to_email}")
            return True, None

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{from_name} <{from_email}>" if from_name else from_email
        msg["To"] = to_email

        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        if security == "SSL":
            server = smtplib.SMTP_SSL(host, port, timeout=15)
        else:
            server = smtplib.SMTP(host, port, timeout=15)

        with server:
            if security == "TLS":
                server.starttls()

            if user and password:
                server.login(user, password)

            server.sendmail(from_email, [to_email], msg.as_string())

        logger.info(f"Email sent successfully via SMTP to {to_email}")
        return True, None

    except Exception as e:
        err_msg = str(e)
        logger.error(f"SMTP Email send failed to {to_email}: {err_msg}")
        return False, err_msg
    finally:
        if close_db:
            db.close()


def send_financier_documents_email(
    to_email: str,
    financier_name: str,
    lead_ref: str,
    secure_link: str,
    expiry_datetime_str: str,
    company_name: str = "CRMFinance / KIM Vehicle Finance",
    db: Session | None = None,
) -> bool:
    """
    Sends a secure no-login document link email to the financier.
    """
    subject = f"Documents submitted for review - Lead {lead_ref}"

    plain_text = f"""Hello {financier_name},

The required documents for Lead {lead_ref} have been uploaded and verified.

Please click the secure link below to view the documents:

{secure_link}

This link allows you to view only the uploaded documents related to this lead. No login is required.

Do not share this link. It expires on {expiry_datetime_str}.

Regards,
{company_name}
"""

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: 'Segoe UI', Arial, sans-serif; background-color: #f7f9f5; margin: 0; padding: 20px; color: #16231b; }}
    .card {{ max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e4ebe1; border-radius: 12px; padding: 32px; box-shadow: 0 4px 16px rgba(2,48,32,0.06); }}
    .header {{ font-size: 20px; font-weight: 800; color: #023020; margin-bottom: 16px; border-bottom: 2px solid #eaf6e8; padding-bottom: 12px; }}
    .lead-ref {{ font-family: monospace; background: #eaf6e8; color: #087a3d; padding: 3px 8px; border-radius: 4px; font-weight: 700; }}
    .btn {{ display: inline-block; background-color: #087a3d; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 15px; margin: 20px 0; }}
    .notice {{ font-size: 12.5px; color: #7a8b80; background: #f8faf8; border-left: 3px solid #087a3d; padding: 10px 14px; margin-top: 20px; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">{company_name}</div>
    <p>Hello <strong>{financier_name}</strong>,</p>
    <p>The required documents for Lead <span class="lead-ref">{lead_ref}</span> have been uploaded and verified.</p>
    <p>Please click the secure button below to view the uploaded documents:</p>
    <p style="text-align: center;">
      <a href="{secure_link}" class="btn" target="_blank">View Shared Documents</a>
    </p>
    <p style="font-size: 13px; color: #44584c;">
      Direct link URL:<br>
      <a href="{secure_link}" style="color: #087a3d; word-break: break-all;">{secure_link}</a>
    </p>
    <div class="notice">
      🔒 <strong>Security Notice:</strong> This link grants read-only access to uploaded documents for Lead {lead_ref} only. No login is required. It expires on <strong>{expiry_datetime_str}</strong>.
    </div>
    <p style="margin-top: 28px; font-size: 13px; color: #7a8b80;">Regards,<br><strong>{company_name}</strong></p>
  </div>
</body>
</html>
"""

    ok, _ = dispatch_email_smtp(to_email, subject, plain_text, html_content, db=db)
    return ok
