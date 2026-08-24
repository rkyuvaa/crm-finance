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
    customer_name: str
    customer_phone: str
    vehicle: str
    amount: float
    status: ApplicationStatus
    aging_label: str
    aging_tone: str


class AttentionItem(BaseModel):
    id: int
    app_no: str
    customer_name: str
    issue: str
    wait_label: str
    urgent: bool
    action: str


class WaitingItem(BaseModel):
    id: int
    app_no: str
    customer_name: str
    who: str
    wait_label: str
    hot: bool


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
