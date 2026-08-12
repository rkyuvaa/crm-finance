from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.finance_company import FinanceCompany


class VehicleModel(Base):
    __tablename__ = "vehicle_models"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    vehicle_price: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    down_payment: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    loan_amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    finance_company_id: Mapped[int | None] = mapped_column(
        ForeignKey("finance_companies.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    finance_company: Mapped["FinanceCompany | None"] = relationship(lazy="joined")
