import pytest
from app.models.projects import WeeklyOffDay, WorkingCalendarHoliday
from tests.conftest import login, auth_headers

def test_calendar_config_and_weekly_off(seeded_client, db):
    token = login(seeded_client, "admin@kim.com")
    headers = auth_headers(token)
    
    # 1. Get initial calendar config
    res = seeded_client.get("/api/v1/calendar/config", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "weekly_off_days" in data
    assert "holidays" in data

    # 2. Update weekly off days to Sat (6) and Sun (0)
    res = seeded_client.put(
        "/api/v1/calendar/weekly-off",
        json={"day_of_week_list": [0, 6]},
        headers=headers
    )
    assert res.status_code == 200
    res_data = res.json()
    assert sorted(res_data["weekly_off_days"]) == [0, 6]

    # Verify directly in DB
    db_off_days = [r.day_of_week for r in db.query(WeeklyOffDay).all()]
    assert sorted(db_off_days) == [0, 6]

    # 3. Update weekly off days to Sun (0) only
    res = seeded_client.put(
        "/api/v1/calendar/weekly-off",
        json={"day_of_week_list": [0]},
        headers=headers
    )
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["weekly_off_days"] == [0]

    # 4. Add a holiday
    res = seeded_client.post(
        "/api/v1/calendar/holidays",
        json={
            "holiday_date": "2026-12-25",
            "description": "Christmas Day",
            "recurs_yearly": True
        },
        headers=headers
    )
    assert res.status_code == 200
    h_data = res.json()
    assert h_data["description"] == "Christmas Day"
    assert h_data["holiday_date"] == "2026-12-25"
    assert h_data["recurs_yearly"] is True

    # 5. Fetch calendar config to verify holiday and weekly off
    res = seeded_client.get("/api/v1/calendar/config", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["weekly_off_days"] == [0]
    assert len(data["holidays"]) >= 1
    h_item = next(h for h in data["holidays"] if h["holiday_date"] == "2026-12-25")
    assert h_item["description"] == "Christmas Day"

    # 6. Delete holiday
    res = seeded_client.delete(f"/api/v1/calendar/holidays/{h_data['id']}", headers=headers)
    assert res.status_code == 204
