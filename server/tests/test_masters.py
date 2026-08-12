from app.models import Application, ApplicationStatus, VehicleModel
from tests.conftest import auth_headers, login


def _make_payload(**overrides):
    payload = {
        "name": "Konwert EV Auto",
        "vehicle_price": 550000,
        "down_payment": 55000,
        "loan_amount": 495000,
    }
    payload.update(overrides)
    return payload


def test_list_vehicle_models_empty(seeded_client):
    token = login(seeded_client)
    resp = seeded_client.get("/api/v1/masters/vehicle-models", headers=auth_headers(token))
    assert resp.status_code == 200
    assert resp.json() == []


def test_sales_cannot_create_vehicle_model(seeded_client):
    token = login(seeded_client)
    resp = seeded_client.post(
        "/api/v1/masters/vehicle-models",
        headers=auth_headers(token),
        json=_make_payload(),
    )
    assert resp.status_code == 403


def test_admin_crud_vehicle_model(seeded_client, db):
    token = login(seeded_client, email="admin@kim.com")

    resp = seeded_client.post(
        "/api/v1/masters/vehicle-models",
        headers=auth_headers(token),
        json=_make_payload(),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Konwert EV Auto"
    assert body["vehicle_price"] == 550000
    assert body["loan_amount"] == 495000
    model_id = body["id"]

    resp = seeded_client.patch(
        f"/api/v1/masters/vehicle-models/{model_id}",
        headers=auth_headers(token),
        json={"vehicle_price": 560000},
    )
    assert resp.status_code == 200
    assert resp.json()["vehicle_price"] == 560000

    resp = seeded_client.get("/api/v1/masters/vehicle-models", headers=auth_headers(token))
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    resp = seeded_client.delete(
        f"/api/v1/masters/vehicle-models/{model_id}", headers=auth_headers(token)
    )
    assert resp.status_code == 204
    assert db.get(VehicleModel, model_id) is None


def test_duplicate_model_name_rejected(seeded_client):
    token = login(seeded_client, email="admin@kim.com")
    seeded_client.post(
        "/api/v1/masters/vehicle-models",
        headers=auth_headers(token),
        json=_make_payload(),
    )
    resp = seeded_client.post(
        "/api/v1/masters/vehicle-models",
        headers=auth_headers(token),
        json=_make_payload(),
    )
    assert resp.status_code == 409


def test_finance_companies_list(seeded_client):
    token = login(seeded_client)
    resp = seeded_client.get("/api/v1/masters/finance-companies", headers=auth_headers(token))
    assert resp.status_code == 200
    names = [c["name"] for c in resp.json()]
    assert "ABC Finance" in names


def test_sales_cannot_create_finance_company(seeded_client):
    token = login(seeded_client)
    resp = seeded_client.post(
        "/api/v1/masters/finance-companies",
        headers=auth_headers(token),
        json={"name": "New Financier"},
    )
    assert resp.status_code == 403


def test_admin_crud_finance_company(seeded_client, db):
    token = login(seeded_client, email="admin@kim.com")

    resp = seeded_client.post(
        "/api/v1/masters/finance-companies",
        headers=auth_headers(token),
        json={"name": "PQR Finance"},
    )
    assert resp.status_code == 201
    company_id = resp.json()["id"]

    resp = seeded_client.patch(
        f"/api/v1/masters/finance-companies/{company_id}",
        headers=auth_headers(token),
        json={"name": "PQR Finance Ltd"},
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "PQR Finance Ltd"

    resp = seeded_client.delete(
        f"/api/v1/masters/finance-companies/{company_id}", headers=auth_headers(token)
    )
    assert resp.status_code == 204


def test_cannot_delete_finance_company_in_use(seeded_client, db):
    from datetime import UTC, datetime, timedelta

    token = login(seeded_client, email="admin@kim.com")
    companies = seeded_client.get(
        "/api/v1/masters/finance-companies", headers=auth_headers(token)
    ).json()
    company_id = companies[0]["id"]

    db.add(
        Application(
            app_no="APP-X1",
            customer_name="In Use",
            customer_phone="9876543210",
            vehicle="Konwert EV Auto",
            amount=400000,
            status=ApplicationStatus.LEAD,
            finance_company_id=company_id,
            created_at=datetime.now(UTC) - timedelta(days=1),
        )
    )
    db.commit()

    resp = seeded_client.delete(
        f"/api/v1/masters/finance-companies/{company_id}", headers=auth_headers(token)
    )
    assert resp.status_code == 409


def test_stages_crud(seeded_client, db):
    token = login(seeded_client, email="admin@kim.com")

    resp = seeded_client.get("/api/v1/masters/stages", headers=auth_headers(token))
    assert resp.status_code == 200
    assert resp.json() == []

    resp = seeded_client.post(
        "/api/v1/masters/stages",
        headers=auth_headers(token),
        json={
            "key": "leads",
            "label": "Leads",
            "status": "LEAD",
            "order_index": 0,
            "enabled": True,
        },
    )
    assert resp.status_code == 201
    stage_id = resp.json()["id"]

    resp = seeded_client.patch(
        f"/api/v1/masters/stages/{stage_id}",
        headers=auth_headers(token),
        json={"enabled": False, "label": "New Leads"},
    )
    assert resp.status_code == 200
    assert resp.json()["enabled"] is False
    assert resp.json()["label"] == "New Leads"

    resp = seeded_client.delete(
        f"/api/v1/masters/stages/{stage_id}", headers=auth_headers(token)
    )
    assert resp.status_code == 204


def test_sales_cannot_manage_stages(seeded_client):
    token = login(seeded_client)
    resp = seeded_client.post(
        "/api/v1/masters/stages",
        headers=auth_headers(token),
        json={"key": "leads", "label": "Leads", "status": "LEAD", "order_index": 0},
    )
    assert resp.status_code == 403