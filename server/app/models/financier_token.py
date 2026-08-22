from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class FinancierDocumentAccessToken(Base):
    __tablename__ = "financier_document_access_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id", ondelete="CASCADE"), index=True, nullable=False)
    financier_id: Mapped[int | None] = mapped_column(ForeignKey("finance_companies.id", ondelete="SET NULL"), nullable=True)
    financier_name: Mapped[str] = mapped_column(String(120), nullable=False)
    financier_email: Mapped[str] = mapped_column(String(120), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", index=True, nullable=False)  # ACTIVE, EXPIRED, REVOKED, EMAIL_FAILED
    sent_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_accessed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    access_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    application: Mapped["Application"] = relationship()
    sent_by: Mapped["User | None"] = relationship(foreign_keys=[sent_by_user_id])
    financier: Mapped["FinanceCompany | None"] = relationship(foreign_keys=[financier_id])
    send_items: Mapped[list["FinancierDocumentSendItem"]] = relationship(back_populates="access_token", cascade="all, delete-orphan")


class FinancierDocumentSendItem(Base):
    __tablename__ = "financier_document_send_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    token_id: Mapped[int] = mapped_column(ForeignKey("financier_document_access_tokens.id", ondelete="CASCADE"), index=True, nullable=False)
    custom_field_value_id: Mapped[int | None] = mapped_column(ForeignKey("crm_lead_custom_field_values.id", ondelete="SET NULL"), nullable=True)
    field_name: Mapped[str] = mapped_column(String(120), nullable=False)
    field_label: Mapped[str] = mapped_column(String(120), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    is_mandatory: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    quality_status: Mapped[str] = mapped_column(String(30), default="NOT_CHECKED", nullable=False)  # GOOD, POOR, NOT_CHECKED
    quality_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verified_by_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    access_token: Mapped["FinancierDocumentAccessToken"] = relationship(back_populates="send_items")


class FinancierDocumentAccessLog(Base):
    __tablename__ = "financier_document_access_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    token_id: Mapped[int | None] = mapped_column(ForeignKey("financier_document_access_tokens.id", ondelete="CASCADE"), index=True, nullable=True)
    application_id: Mapped[int | None] = mapped_column(ForeignKey("applications.id", ondelete="CASCADE"), index=True, nullable=True)
    financier_email: Mapped[str | None] = mapped_column(String(120), nullable=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False)  # page_view, file_preview, file_download, rejected
    send_item_id: Mapped[int | None] = mapped_column(ForeignKey("financier_document_send_items.id", ondelete="SET NULL"), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(60), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    accessed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    success: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    failure_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
