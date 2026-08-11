from app.models import UserRole
from tests.conftest import DEFAULT_PASSWORD, auth_headers, login, make_user


def test_login_success(client, db):
    db.add(make_user("sales@kim.com", UserRole.SALES_EXECUTIVE, "Ramesh"))
    db.commit()
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "sales@kim.com", "password": DEFAULT_PASSWORD},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["access_token"]
    assert body["user"]["email"] == "sales@kim.com"
    assert body["user"]["full_name"] == "Ramesh"
    assert body["user"]["role"] == "SALES_EXECUTIVE"


def test_login_wrong_password(client, db):
    db.add(make_user("sales@kim.com", UserRole.SALES_EXECUTIVE))
    db.commit()
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "sales@kim.com", "password": "wrong-pass"},
    )
    assert resp.status_code == 401


def test_login_sets_refresh_cookie(client, db):
    db.add(make_user("sales@kim.com", UserRole.SALES_EXECUTIVE))
    db.commit()
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "sales@kim.com", "password": DEFAULT_PASSWORD},
    )
    assert resp.status_code == 200
    assert "refresh_token" in resp.cookies
    assert resp.cookies.get("refresh_token")


def test_refresh_flow(client, db):
    db.add(make_user("sales@kim.com", UserRole.SALES_EXECUTIVE))
    db.commit()
    client.post(
        "/api/v1/auth/login",
        json={"email": "sales@kim.com", "password": DEFAULT_PASSWORD},
    )
    resp = client.post("/api/v1/auth/refresh")
    assert resp.status_code == 200
    assert resp.json()["access_token"]


def test_me_requires_auth(client):
    assert client.get("/api/v1/auth/me").status_code == 401


def test_me_returns_user(seeded_client):
    token = login(seeded_client)
    resp = seeded_client.get("/api/v1/auth/me", headers=auth_headers(token))
    assert resp.status_code == 200
    assert resp.json()["email"] == "sales@kim.com"


def test_logout_clears_cookie(client, db):
    db.add(make_user("sales@kim.com", UserRole.SALES_EXECUTIVE))
    db.commit()
    client.post(
        "/api/v1/auth/login",
        json={"email": "sales@kim.com", "password": DEFAULT_PASSWORD},
    )
    resp = client.post("/api/v1/auth/logout")
    assert resp.status_code == 204
    assert resp.cookies.get("refresh_token") is None


def test_change_password(seeded_client):
    token = login(seeded_client)
    resp = seeded_client.post(
        "/api/v1/auth/change-password",
        headers=auth_headers(token),
        json={"current_password": DEFAULT_PASSWORD, "new_password": "brandnew123"},
    )
    assert resp.status_code == 204
    resp2 = seeded_client.post(
        "/api/v1/auth/login",
        json={"email": "sales@kim.com", "password": "brandnew123"},
    )
    assert resp2.status_code == 200
