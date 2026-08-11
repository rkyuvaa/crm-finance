from datetime import UTC, datetime, timedelta

from app.models import Application, ApplicationStatus, User
from tests.conftest import auth_headers, login


def test_list_applications(seeded_client, db):
    sales = db.query(User).filter_by(email="sales@kim.com").first()
    now = datetime.now(UTC)
    for i in range(3):
        db.add(
            Application(
                app_no=f"APP-{100 - i}",
                customer_name=f"Cust {i}",
                customer_phone="9876543210",
                vehicle="Konwert EV Auto",
                amount=400000,
                status=ApplicationStatus.LEAD,
                assigned_to=sales.id,
                created_at=now - timedelta(days=i),
                updated_at=now - timedelta(hours=i),
            )
        )
    db.commit()

    token = login(seeded_client)
    resp = seeded_client.get("/api/v1/applications", headers=auth_headers(token))
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 3
    assert len(body["items"]) == 3
    assert body["items"][0]["app_no"] == "APP-100"
    assert body["tab_counts"]["mine"] == 3


def test_create_application(seeded_client, db):
    db.commit()

    token = login(seeded_client)
    resp = seeded_client.post(
        "/api/v1/applications",
        headers=auth_headers(token),
        json={
            "customer_name": "New Customer",
            "customer_phone": "9876500000",
            "vehicle": "Konwert EV Auto",
            "amount": 450000,
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["app_no"] == "APP-1"
    assert body["status"] == "LEAD"


def test_update_application(seeded_client, db):
    app = Application(
        app_no="APP-50",
        customer_name="Old Name",
        customer_phone="9876543210",
        vehicle="Konwert EV Auto",
        amount=400000,
        status=ApplicationStatus.LEAD,
        created_at=datetime.now(UTC) - timedelta(days=1),
    )
    db.add(app)
    db.commit()

    token = login(seeded_client)
    resp = seeded_client.patch(
        f"/api/v1/applications/{app.id}",
        headers=auth_headers(token),
        json={"status": "SANCTIONED"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "SANCTIONED"


def test_delete_application(seeded_client, db):
    app = Application(
        app_no="APP-49",
        customer_name="To Delete",
        customer_phone="9876543210",
        vehicle="Konwert EV Auto",
        amount=400000,
        status=ApplicationStatus.LEAD,
        created_at=datetime.now(UTC) - timedelta(days=1),
    )
    db.add(app)
    db.commit()

    token = login(seeded_client)
    resp = seeded_client.delete(
        f"/api/v1/applications/{app.id}", headers=auth_headers(token)
    )
    assert resp.status_code == 204
    assert db.get(Application, app.id) is None


def test_search_filter(seeded_client, db):
    now = datetime.now(UTC)
    db.add(
        Application(
            app_no="APP-20",
            customer_name="UniqueNameXYZ",
            customer_phone="9876543210",
            vehicle="Konwert EV Auto",
            amount=400000,
            status=ApplicationStatus.APPLICATION,
            created_at=now - timedelta(days=1),
            updated_at=now - timedelta(hours=2),
        )
    )
    db.add(
        Application(
            app_no="APP-21",
            customer_name="Other",
            customer_phone="9876543210",
            vehicle="Konwert EV Auto",
            amount=400000,
            status=ApplicationStatus.SANCTIONED,
            created_at=now - timedelta(days=1),
            updated_at=now - timedelta(hours=2),
        )
    )
    db.commit()

    token = login(seeded_client)
    resp = seeded_client.get(
        "/api/v1/applications?q=UniqueNameXYZ", headers=auth_headers(token)
    )
    assert resp.json()["total"] == 1

    resp = seeded_client.get(
        "/api/v1/applications?status=SANCTIONED", headers=auth_headers(token)
    )
    assert resp.json()["total"] == 1
    assert resp.json()["items"][0]["app_no"] == "APP-21"

