from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.crm_tab_field import CrmTabField


class StageAutomoveRule(Base):
    __tablename__ = "stage_automove_rules"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # 'standard_field', 'custom_field', 'document_verification'
    trigger_type: Mapped[str] = mapped_column(String(40), default="standard_field", nullable=False)
    
    # Field identification
    field_name: Mapped[str | None] = mapped_column(String(100), nullable=True)  # e.g. "vehicle_model_id", "finance_company_id", "customer_phone"
    field_id: Mapped[int | None] = mapped_column(ForeignKey("crm_tab_fields.id", ondelete="CASCADE"), nullable=True)
    
    # Condition: 'is_filled', 'is_verified', 'equals', 'greater_than'
    condition_operator: Mapped[str] = mapped_column(String(40), default="is_filled", nullable=False)
    condition_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Optional source stage key filter (e.g., only if currently in 'leads')
    source_stage_key: Mapped[str | None] = mapped_column(String(40), nullable=True)
    
    # Target stage status e.g., 'VERIFICATION', 'FINANCE', 'SANCTIONED', 'DISBURSEMENT', 'COMPLETED'
    target_status: Mapped[str] = mapped_column(String(40), nullable=False)
    
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    field: Mapped["CrmTabField | None"] = relationship(foreign_keys=[field_id])
