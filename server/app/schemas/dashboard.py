from datetime import datetime

from pydantic import BaseModel

from app.models.enums import ApplicationStatus


class KpiValue(BaseModel):
    value: int
    sub: str


class Kpis(BaseModel):
    total_applications: KpiValue
    doc_pending: KpiValue
    verification_pending: KpiValue
    finance_query: KpiValue
    sanctioned: KpiValue
    disbursement: KpiValue


class PipelineStage(BaseModel):
    key: str
    status: ApplicationStatus | None = None
    label: str
    tip: str
    count: int
    color: str | None = None


class RecentApplication(BaseModel):
    id: int
    app_no: str
    customer_name: str | None = ""
    customer_phone: str | None = ""
    vehicle: str | None = ""
    amount: float = 0.0
    status: ApplicationStatus
    aging_label: str = "0h"
    aging_tone: str = "neutral"


class AttentionItem(BaseModel):
    id: int
    app_no: str
    customer_name: str | None = ""
    issue: str
    wait_label: str = "0h"
    urgent: bool = False
    action: str = ""


class WaitingItem(BaseModel):
    id: int
    app_no: str
    customer_name: str | None = ""
    who: str = ""
    wait_label: str = "0h"
    hot: bool = False


class FinanceCompanyOut(BaseModel):
    id: int
    name: str
    total_apps: int
    approved: int
    rejected: int
    avg_time_days: float
    bar_pct: int


class ActivityOut(BaseModel):
    id: int
    app_no: str | None
    actor_name: str
    action: str
    created_at: datetime


class NavCounts(BaseModel):
    leads: int
    applications: int
    documents: int
    verification: int
    finance: int
    delivery: int
    disbursement: int
    notifications: int
    stages: dict[str, int] = {}


class DashboardResponse(BaseModel):
    kpis: Kpis
    pipeline: list[PipelineStage]
    recent_applications: list[RecentApplication]
    recent_total: int
    tab_counts: dict[str, int]
    needs_attention: list[AttentionItem]
    needs_attention_total: int
    waiting_on: list[WaitingItem]
    waiting_on_total: int
    finance_companies: list[FinanceCompanyOut]
    activities: list[ActivityOut]
    nav_counts: NavCounts
