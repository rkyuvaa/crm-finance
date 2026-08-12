from app.models import VehicleModel
from tests.conftest import auth_headers, login


def _make_payload(**overrides):
    payload = {
        "name": "Konwert EV Auto",
        "vehicle_price": 550000,
        "down_payment": 55000,
        "loan_amount": 495000,
        "finance_company_id": None,
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
    assert resp.status_code == 400


def test_finance_companies_list(seeded_client):
    token = login(seeded_client)
    resp = seeded_client.get("/api/v1/masters/finance-companies", headers=auth_headers(token))
    assert resp.status_code == 200
    names = [c["name"] for c in resp.json()]
    assert "ABC Finance" in names