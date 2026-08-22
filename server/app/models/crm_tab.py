from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.pipeline_stage import PipelineStage


class CrmTab(Base):
    __tablename__ = "crm_tabs"

    id: Mapped[int] = mapped_column(primary_key=True)
    module_id: Mapped[str] = mapped_column(String(40), default="crm", index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(60), nullable=False)
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    icon: Mapped[str | None] = mapped_column(String(40), default="Layers")
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    visibility_type: Mapped[str] = mapped_column(String(20), default="EVERYONE")  # EVERYONE, ROLES, USERS
    allowed_roles: Mapped[str | None] = mapped_column(String(255), nullable=True)  # Comma-separated enum values e.g. ADMIN,SALES_EXECUTIVE
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    stage_mappings: Mapped[list["CrmTabStageMapping"]] = relationship(
        back_populates="tab", cascade="all, delete-orphan", lazy="joined"
    )
    filter_rules: Mapped[list["CrmTabFilter"]] = relationship(
        back_populates="tab", cascade="all, delete-orphan", lazy="joined"
    )
    fields: Mapped[list["CrmTabField"]] = relationship(
        back_populates="tab", cascade="all, delete-orphan", order_by="CrmTabField.display_order"
    )


class CrmTabStageMapping(Base):
    __tablename__ = "crm_tab_stage_mappings"

    id: Mapped[int] = mapped_column(primary_key=True)
    tab_id: Mapped[int] = mapped_column(ForeignKey("crm_tabs.id", ondelete="CASCADE"), nullable=False)
    stage_id: Mapped[int] = mapped_column(ForeignKey("pipeline_stages.id", ondelete="CASCADE"), nullable=False)

    tab: Mapped["CrmTab"] = relationship(back_populates="stage_mappings")
    stage: Mapped["PipelineStage"] = relationship(lazy="joined")


class CrmTabFilter(Base):
    __tablename__ = "crm_tab_filters"

    id: Mapped[int] = mapped_column(primary_key=True)
    tab_id: Mapped[int] = mapped_column(ForeignKey("crm_tabs.id", ondelete="CASCADE"), nullable=False)
    field: Mapped[str] = mapped_column(String(60), nullable=False)  # e.g., 'amount', 'priority', 'status'
    operator: Mapped[str] = mapped_column(String(20), nullable=False)  # eq, ne, gt, gte, lt, lte, contains, in
    value: Mapped[str] = mapped_column(Text, nullable=False)
    logical_operator: Mapped[str] = mapped_column(String(10), default="AND")

    tab: Mapped["CrmTab"] = relationship(back_populates="filter_rules")
