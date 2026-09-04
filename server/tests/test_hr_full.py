import pytest
from app.models.enums import UserRole
from tests.conftest import DEFAULT_PASSWORD, auth_headers, login

def test_hr_module_full_crud(seeded_client, db):
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)

    # Fetch admin user ID
    me_resp = seeded_client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    user_id = me_resp.json()["id"]

    # 1. ATTENDANCE CRUD
    att_payload = {
        "user_id": user_id,
        "attendance_date": "2026-09-04",
        "check_in": "09:00:00",
        "check_out": "18:00:00",
        "status": "PRESENT",
    }
    att_resp = seeded_client.post("/api/v1/hr/attendance", json=att_payload, headers=headers)
    assert att_resp.status_code == 201, att_resp.text
    att_id = att_resp.json()["id"]

    att_list = seeded_client.get("/api/v1/hr/attendance", headers=headers)
    assert att_list.status_code == 200
    assert any(a["id"] == att_id for a in att_list.json())

    att_update = seeded_client.put(f"/api/v1/hr/attendance/{att_id}", json={"notes": "Regular shift"}, headers=headers)
    assert att_update.status_code == 200
    assert att_update.json()["notes"] == "Regular shift"

    att_del = seeded_client.delete(f"/api/v1/hr/attendance/{att_id}", headers=headers)
    assert att_del.status_code == 204

    # 2. LEAVE REQUEST CRUD & APPROVAL WORKFLOW
    leave_payload = {
        "user_id": user_id,
        "leave_type": "CASUAL",
        "start_date": "2026-09-10",
        "end_date": "2026-09-12",
        "reason": "Personal work",
    }
    leave_resp = seeded_client.post("/api/v1/hr/leave-requests", json=leave_payload, headers=headers)
    assert leave_resp.status_code == 201, leave_resp.text
    leave_id = leave_resp.json()["id"]

    # Approve Leave Request
    app_resp = seeded_client.post(f"/api/v1/hr/leave-requests/{leave_id}/approve", json={"approved_by_id": user_id}, headers=headers)
    assert app_resp.status_code == 200
    assert app_resp.json()["status"] == "APPROVED"

    # 3. PAYROLL CRUD
    pay_payload = {
        "user_id": user_id,
        "payroll_month": "2026-09-01",
        "base_salary": 80000.0,
        "allowances": 15000.0,
        "deductions": 5000.0,
        "status": "DRAFT",
    }
    pay_resp = seeded_client.post("/api/v1/hr/payroll", json=pay_payload, headers=headers)
    assert pay_resp.status_code == 201, pay_resp.text
    pay_id = pay_resp.json()["id"]
    assert pay_resp.json()["net_salary"] == 90000.0

    pay_update = seeded_client.put(f"/api/v1/hr/payroll/{pay_id}", json={"status": "PAID"}, headers=headers)
    assert pay_update.status_code == 200
    assert pay_update.json()["status"] == "PAID"

    # 4. PERFORMANCE REVIEWS
    perf_payload = {
        "user_id": user_id,
        "reviewer_id": user_id,
        "review_date": "2026-09-04",
        "rating": 5.0,
        "comments": "Outstanding leadership and code quality.",
    }
    perf_resp = seeded_client.post("/api/v1/hr/performance-reviews", json=perf_payload, headers=headers)
    assert perf_resp.status_code == 201, perf_resp.text
    perf_id = perf_resp.json()["id"]

    perf_list = seeded_client.get("/api/v1/hr/performance-reviews", headers=headers)
    assert perf_list.status_code == 200
    assert any(p["id"] == perf_id for p in perf_list.json())
