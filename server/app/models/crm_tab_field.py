from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.application import Application
    from app.models.crm_tab import CrmTab


class CrmTabField(Base):
    __tablename__ = "crm_tab_fields"

    id: Mapped[int] = mapped_column(primary_key=True)
    tab_id: Mapped[int] = mapped_column(ForeignKey("crm_tabs.id", ondelete="CASCADE"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    field_type: Mapped[str] = mapped_column(String(30), default="text", nullable=False)  # text, numeric, date, boolean, toggle, dropdown, file
    is_required: Mapped[bool] = mapped_column(Boolean, default=False)
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True)
    is_readonly: Mapped[bool] = mapped_column(Boolean, default=False)
    is_searchable: Mapped[bool] = mapped_column(Boolean, default=True)
    is_filterable: Mapped[bool] = mapped_column(Boolean, default=True)
    is_sortable: Mapped[bool] = mapped_column(Boolean, default=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    
    placeholder: Mapped[str | None] = mapped_column(String(255), nullable=True)
    help_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    default_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    options: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON, nullable=True)  # [{label, value, default}]
    file_config: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)  # {allowed_extensions: [], max_size_mb: 10}
    field_permissions: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)  # {ADMIN: {view: true, edit: true, required: false}}
    stage_rules: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)  # {LEAD: {visible: true, required: true, readonly: false}}
    dependent_rules: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)  # {depends_on_field_id: 12, condition: "equals", value: "YES", action: "show"}
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.current_timestamp(), onupdate=func.current_timestamp()
    )

    tab: Mapped["CrmTab"] = relationship(back_populates="fields")
    values: Mapped[list["CrmLeadCustomFieldValue"]] = relationship(
        back_populates="field", cascade="all, delete-orphan"
    )


class CrmLeadCustomFieldValue(Base):
    __tablename__ = "crm_lead_custom_field_values"

    id: Mapped[int] = mapped_column(primary_key=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id", ondelete="CASCADE"), index=True, nullable=False)
    field_id: Mapped[int] = mapped_column(ForeignKey("crm_tab_fields.id", ondelete="CASCADE"), index=True, nullable=False)
    
    # Textual or JSON payload (handles string, number, date, bool, dropdown value, or file info dict)
    value: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_metadata: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    # Document Verification & Automated OCR Quality Score (0-100)
    quality_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    quality_analysis: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verified_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    application: Mapped["Application"] = relationship()
    field: Mapped["CrmTabField"] = relationship(back_populates="values")
    verified_by: Mapped["User | None"] = relationship(foreign_keys=[verified_by_id])
