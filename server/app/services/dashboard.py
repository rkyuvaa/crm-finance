from datetime import timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import (
    Activity,
    Application,
    ApplicationStatus,
    Delivery,
    DeliveryStatus,
    Disbursement,
    DisbursementStatus,
    DocStatus,
    Document,
    FinanceCompany,
    FinanceStatus,
    FinanceSubmission,
    Notification,
    User,
    Verification,
    VerificationStatus,
)
from app.schemas.dashboard import (
    ActivityOut,
    AttentionItem,
    FinanceCompanyOut,
    KpiValue,
    NavCounts,
    PipelineStage,
    RecentApplication,
    WaitingItem,
)
from app.services.aging import (
    aging_tone,
    db_now,
    duration_between,
    format_aging,
    format_attention,
    format_wait,
    utcnow,
)

PIPELINE = [
    (ApplicationStatus.LEAD, "leads", "Leads", "{n} new leads captured this month"),
    (ApplicationStatus.APPLICATION, "applications", "Applications", "{n} converted to applications"),
    (ApplicationStatus.VERIFICATION, "verification", "Verification", "{n} awaiting document verification"),
    (ApplicationStatus.FINANCE, "finance", "Finance", "{n} with finance companies"),
    (ApplicationStatus.QUERY, "query", "Query", "{n} need customer action on queries"),
    (ApplicationStatus.SANCTIONED, "sanctioned", "Sanctioned", "{n} sanctioned & ready for delivery"),
    (ApplicationStatus.DELIVERY, "delivery", "Delivery", "{n} deliveries in progress"),
    (ApplicationStatus.DISBURSEMENT, "disburse", "Disburse", "{n} awaiting UTR after delivery"),
    (ApplicationStatus.COMPLETED, "completed", "Completed", "{n} fully completed this quarter"),
]

RECENT_WINDOW = 50
RECENT_PAGE_SIZE = 6


def _status_counts(db: Session) -> dict[ApplicationStatus, int]:
    rows = (
        db.query(Application.status, func.count(Application.id))
        .group_by(Application.status)
        .all()
    )
    return {status: count for status, count in rows}


def _build_kpis(db: Session, counts: dict[ApplicationStatus, int]) -> dict:
    total = db.query(func.count(Application.id)).scalar() or 0
    doc_pending = (
        db.query(func.count(Document.id)).filter(Document.status == DocStatus.PENDING).scalar() or 0
    )
    verif_pending = (
        db.query(func.count(Verification.id))
        .filter(Verification.status == VerificationStatus.PENDING)
        .scalar()
        or 0
    )
    today_start = db_now().replace(hour=0, minute=0, second=0, microsecond=0)
    created_today = (
        db.query(func.count(Application.id))
        .filter(Application.created_at >= today_start)
        .scalar()
        or 0
    )
    return {
        "total_applications": KpiValue(value=total, sub=f"↑ {created_today} today"),
        "doc_pending": KpiValue(value=doc_pending, sub="Awaiting upload"),
        "verification_pending": KpiValue(value=verif_pending, sub="In queue"),
        "finance_query": KpiValue(value=counts.get(ApplicationStatus.QUERY, 0), sub="Action required"),
        "sanctioned": KpiValue(value=counts.get(ApplicationStatus.SANCTIONED, 0), sub="Ready to deliver"),
        "disbursement": KpiValue(
            value=counts.get(ApplicationStatus.DISBURSEMENT, 0), sub="Pending UTR"
        ),
    }


def _build_pipeline(counts: dict[ApplicationStatus, int]) -> list[PipelineStage]:
    stages = []
    for status, key, label, tip_tpl in PIPELINE:
        count = counts.get(status, 0)
        stages.append(
            PipelineStage(
                key=key,
                status=status,
                count=count,
                tip=tip_tpl.format(n=count),
                label=label,
            )
        )
    return stages


def _attention_candidates(db: Session) -> list[dict]:
    now = utcnow()
    items: list[dict] = []

    query_apps = (
        db.query(Application, FinanceSubmission)
        .join(FinanceSubmission, FinanceSubmission.application_id == Application.id)
        .filter(
            Application.status == ApplicationStatus.QUERY,
            FinanceSubmission.status == FinanceStatus.QUERY,
            FinanceSubmission.query_note.isnot(None),
        )
        .all()
    )
    for app, sub in query_apps:
        wait = duration_between(sub.submitted_at, now)
        action = "upload_now" if "Bank" in (sub.query_note or "") else "open_application"
        urgent = action in ("upload_now",)
        items.append(
            {
                "id": app.id,
                "app_no": app.app_no,
                "customer_name": app.customer_name,
                "issue": sub.query_note or "Query raised by finance",
                "wait_label": format_attention(wait),
                "urgent": urgent,
                "action": action,
                "sort": app.app_no,
            }
        )

    disb_apps = (
        db.query(Application, Disbursement)
        .join(Disbursement, Disbursement.application_id == Application.id)
        .filter(
            Application.status == ApplicationStatus.DISBURSEMENT,
            Disbursement.status == DisbursementStatus.PENDING_UTR,
        )
        .all()
    )
    for app, disb in disb_apps:
        wait = duration_between(disb.created_at, now)
        if wait.total_seconds() < 24 * 3600:
            continue
        items.append(
            {
                "id": app.id,
                "app_no": app.app_no,
                "customer_name": app.customer_name,
                "issue": disb.notes
                or "Disbursement pending — UTR entry required",
                "wait_label": format_attention(wait),
                "urgent": True,
                "action": "enter_utr",
                "sort": app.app_no,
            }
        )
    return items


def _waiting_candidates(db: Session) -> list[dict]:
    now = utcnow()
    items: list[dict] = []

    fin_apps = (
        db.query(Application, FinanceSubmission)
        .join(FinanceSubmission, FinanceSubmission.application_id == Application.id)
        .filter(
            Application.status == ApplicationStatus.FINANCE,
            FinanceSubmission.status == FinanceStatus.PROCESSING,
        )
        .all()
    )
    for app, sub in fin_apps:
        wait = duration_between(sub.submitted_at, now)
        company_name = sub.company.name if sub.company else "Finance"
        items.append(
            {
                "id": app.id,
                "app_no": app.app_no,
                "customer_name": app.customer_name,
                "who": f"Finance Processing · {company_name}",
                "wait_label": format_wait(wait),
                "hot": wait.total_seconds() >= 48 * 3600,
                "sort": app.app_no,
            }
        )

    verif_apps = (
        db.query(Application)
        .filter(Application.status == ApplicationStatus.VERIFICATION)
        .all()
    )
    for app in verif_apps:
        pending_verif = [v for v in app.verifications if v.status == VerificationStatus.PENDING]
        pending_doc = [d for d in app.documents if d.status == DocStatus.PENDING]
        if pending_verif:
            wait = duration_between(pending_verif[0].created_at, now)
            who = "Verification · Finance Officer"
        elif pending_doc:
            wait = duration_between(pending_doc[0].created_at, now)
            who = "Document Upload · Customer"
        else:
            continue
        items.append(
            {
                "id": app.id,
                "app_no": app.app_no,
                "customer_name": app.customer_name,
                "who": who,
                "wait_label": format_wait(wait),
                "hot": wait.total_seconds() >= 48 * 3600,
                "sort": app.app_no,
            }
        )
    return items


def _build_finance_companies(db: Session) -> list[FinanceCompanyOut]:
    companies = db.query(FinanceCompany).all()
    max_approved = max((c.approved for c in companies), default=1) or 1
    out = []
    for c in companies:
        bar_pct = min(100, round(c.approved / max_approved * 100))
        out.append(
            FinanceCompanyOut(
                id=c.id,
                name=c.name,
                total_apps=c.total_apps,
                approved=c.approved,
                rejected=c.rejected,
                avg_time_days=float(c.avg_time_days or 0),
                bar_pct=bar_pct,
            )
        )
    return out


def _build_activities(db: Session, limit: int = 5) -> list[ActivityOut]:
    rows = (
        db.query(Activity)
        .order_by(Activity.created_at.desc())
        .limit(limit)
        .all()
    )
    out = []
    for act in rows:
        actor_name = act.actor.full_name if act.actor else "System"
        out.append(
            ActivityOut(
                id=act.id,
                app_no=act.application.app_no if act.application else None,
                actor_name=actor_name,
                action=act.action,
                created_at=act.created_at,
            )
        )
    return out


def _build_nav_counts(db: Session, user: User) -> NavCounts:
    thirty_days = db_now() - timedelta(days=30)
    lead_unassigned = (
        db.query(func.count(Application.id))
        .filter(
            Application.status == ApplicationStatus.LEAD,
            Application.assigned_to.is_(None),
        )
        .scalar()
        or 0
    )
    applications_badge = (
        db.query(func.count(Application.id))
        .filter(Application.created_at >= thirty_days)
        .scalar()
        or 0
    )
    doc_pending = (
        db.query(func.count(Document.id)).filter(Document.status == DocStatus.PENDING).scalar() or 0
    )
    verif_pending = (
        db.query(func.count(Verification.id))
        .filter(Verification.status == VerificationStatus.PENDING)
        .scalar()
        or 0
    )
    finance = (
        db.query(func.count(Application.id))
        .filter(Application.status == ApplicationStatus.QUERY)
        .scalar()
        or 0
    )
    delivery = (
        db.query(func.count(Delivery.id))
        .filter(Delivery.status == DeliveryStatus.PENDING)
        .scalar()
        or 0
    )
    disbursement = (
        db.query(func.count(Disbursement.id))
        .filter(Disbursement.status == DisbursementStatus.PENDING_UTR)
        .scalar()
        or 0
    )
    notifications = (
        db.query(func.count(Notification.id))
        .filter(Notification.user_id == user.id, Notification.read_at.is_(None))
        .scalar()
        or 0
    )
    return NavCounts(
        leads=lead_unassigned,
        applications=applications_badge,
        documents=doc_pending,
        verification=verif_pending,
        finance=finance,
        delivery=delivery,
        disbursement=disbursement,
        notifications=notifications,
    )


def get_dashboard(db: Session, user: User) -> dict:
    counts = _status_counts(db)

    recent = (
        db.query(Application)
        .filter(Application.status != ApplicationStatus.LEAD)
        .order_by(Application.created_at.desc())
        .limit(RECENT_WINDOW)
        .all()
    )
    recent_total = len(recent)
    mine_total = sum(1 for a in recent if a.assigned_to == user.id)

    attention = sorted(_attention_candidates(db), key=lambda i: i["sort"], reverse=True)
    waiting = sorted(_waiting_candidates(db), key=lambda i: i["sort"], reverse=True)

    tab_counts = {
        "all": recent_total,
        "mine": mine_total,
        "pending": len(attention),
    }

    return {
        "kpis": _build_kpis(db, counts),
        "pipeline": _build_pipeline(counts),
        "recent_applications": [
            RecentApplication(
                id=a.id,
                app_no=a.app_no,
                customer_name=a.customer_name,
                customer_phone=a.customer_phone,
                vehicle=a.vehicle,
                amount=float(a.amount),
                status=a.status,
                aging_label=format_aging(duration_between(a.updated_at)),
                aging_tone=aging_tone(duration_between(a.updated_at)),
            )
            for a in recent[:RECENT_PAGE_SIZE]
        ],
        "recent_total": recent_total,
        "tab_counts": tab_counts,
        "needs_attention": [
            AttentionItem(**{k: v for k, v in i.items() if k != "sort"})
            for i in attention[:3]
        ],
        "needs_attention_total": len(attention),
        "waiting_on": [
            WaitingItem(**{k: v for k, v in i.items() if k != "sort"})
            for i in waiting[:3]
        ],
        "waiting_on_total": len(waiting),
        "finance_companies": _build_finance_companies(db),
        "activities": _build_activities(db),
        "nav_counts": _build_nav_counts(db, user),
    }
