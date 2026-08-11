from datetime import UTC, datetime, timedelta

from app.models import (
    Application,
    ApplicationStatus,
    Disbursement,
    DisbursementStatus,
    DocStatus,
    Document,
    FinanceStatus,
    FinanceSubmission,
    Notification,
    Verification,
    VerificationStatus,
)
from tests.conftest import auth_headers, login


def _seed_dashboard(db):
    from app.models import User

    sales = db.query(User).filter_by(email="sales@kim.com").first()

    now = datetime.now(UTC)
    for app_no, status, hours in [
        ("APP-125", ApplicationStatus.QUERY, 60),
        ("APP-124", ApplicationStatus.SANCTIONED, 4),
        ("APP-123", ApplicationStatus.FINANCE, 33.6),
        ("APP-122", ApplicationStatus.REJECTED, 100.8),
        ("APP-121", ApplicationStatus.DELIVERY, 6),
        ("APP-120", ApplicationStatus.COMPLETED, 48),
    ]:
        db.add(
            Application(
                app_no=app_no,
                customer_name=f"Customer {app_no}",
                customer_phone="9876543210",
                vehicle="Konwert EV Auto",
                amount=450000,
                status=status,
                created_at=now - timedelta(days=40),
                updated_at=now - timedelta(hours=hours),
            )
        )
    db.flush()

    apps = {a.app_no: a for a in db.query(Application).all()}
    db.add(
        FinanceSubmission(
            application_id=apps["APP-125"].id,
            company_id=1,
            status=FinanceStatus.QUERY,
            query_note="Bank Statement re-upload required",
            submitted_at=now - timedelta(hours=4.3),
        )
    )
    db.add(
        Disbursement(
            application_id=apps["APP-124"].id,
            status=DisbursementStatus.PENDING_UTR,
            created_at=now - timedelta(hours=100.8),
        )
    )
    db.add(
        Document(
            application_id=apps["APP-123"].id,
            doc_type="Bank Statement",
            status=DocStatus.PENDING,
            created_at=now - timedelta(hours=54),
        )
    )
    db.add(
        Verification(
            application_id=apps["APP-120"].id,
            status=VerificationStatus.PENDING,
            created_at=now - timedelta(hours=27),
        )
    )
    db.add(
        Notification(
            user_id=sales.id,
            message="Finance query raised on APP-125",
        )
    )
    db.commit()


def test_dashboard_shape(seeded_client, db):
    _seed_dashboard(db)
    token = login(seeded_client)
    resp = seeded_client.get("/api/v1/dashboard", headers=auth_headers(token))
    assert resp.status_code == 200
    body = resp.json()

    assert body["kpis"]["total_applications"]["value"] == 6
    assert len(body["pipeline"]) == 9
    assert body["pipeline"][0]["key"] == "leads"
    assert len(body["recent_applications"]) == 6
    assert body["recent_applications"][0]["app_no"] == "APP-125"

    attn = body["needs_attention"]
    assert attn[0]["app_no"] == "APP-125"
    assert attn[0]["urgent"] is True
    assert attn[0]["wait_label"] == "4h 18m"

    assert body["nav_counts"]["documents"] == 1
    assert body["nav_counts"]["notifications"] == 1


def test_dashboard_requires_auth(client):
    assert client.get("/api/v1/dashboard").status_code == 401


def test_aging_labels(seeded_client, db):
    _seed_dashboard(db)
    token = login(seeded_client)
    resp = seeded_client.get("/api/v1/dashboard", headers=auth_headers(token))
    body = resp.json()
    labels = {r["app_no"]: r["aging_label"] for r in body["recent_applications"]}
    assert labels["APP-124"] == "4h"
    assert labels["APP-125"] == "2.5d"
    assert labels["APP-123"] == "1.4d"
    assert labels["APP-122"] == "4.2d"
    assert labels["APP-120"] == "2d"


def test_finance_companies(seeded_client, db):
    _seed_dashboard(db)
    token = login(seeded_client)
    resp = seeded_client.get("/api/v1/dashboard", headers=auth_headers(token))
    body = resp.json()
    names = [c["name"] for c in body["finance_companies"]]
    assert names == ["ABC Finance", "XYZ Finance"]
