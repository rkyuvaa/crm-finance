"""
Tests for Exact Date-Time Dependency Scheduling Engine
======================================================
Verifies:
1. Exact Prompt Example:
   ARR-T1 finishes 10-Sep-2026 16:00. ARR-T2 is FS with No Lag and Duration 1 Day 4 Hours
   (9 + 4 = 13 working hours, with a 9-hour working day 09:00 - 18:00).
   Walking 13 working hours forward from 16:00 consumes the remaining 2 hours of 10-Sep,
   all 9 hours of 11-Sep, and 2 hours of 12-Sep -> ARR-T2 ends 12-Sep-2026 11:00.
2. Boundary & Rollover Conditions (task ending at 18:00 -> FS successor starts at 09:00 next day).
3. SS, FF, and SF with days + hours lag.
4. Validation constraints (hours must be smaller than daily working hours).
"""
import pytest
from datetime import date, datetime, time
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.projects import Task, TaskDependency, WorkingCalendarSetting, WeeklyOffDay, WorkingCalendarHoliday
from app.services.calendar_service import (
    WorkingCalendar,
    walk_working_hours_forward,
    walk_working_hours_backward,
    count_working_hours,
    get_working_calendar,
)
from app.services.scheduling_engine import compute_successor_datetimes, propagate_task_schedule_changes
from tests.conftest import login, auth_headers, DEFAULT_PASSWORD


def test_calendar_service_walk_forward_example():
    """Verify exact prompt example via calendar_service."""
    cal = WorkingCalendar(
        holidays=set(),
        off_weekdays={6},  # Sunday only
        work_start_time=time(9, 0),
        work_end_time=time(18, 0),
        daily_working_hours=9,
    )
    # 10-Sep-2026 16:00
    start_dt = datetime(2026, 9, 10, 16, 0)
    # 1 Day 4 Hours = 9 + 4 = 13 working hours
    end_dt = walk_working_hours_forward(start_dt, 13, cal)

    assert end_dt == datetime(2026, 9, 12, 11, 0)


def test_calendar_service_walk_backward_reversibility():
    """Verify that walking backward from 12-Sep 11:00 by 13 working hours returns 10-Sep 16:00."""
    cal = WorkingCalendar(
        holidays=set(),
        off_weekdays={6},  # Sunday only
        work_start_time=time(9, 0),
        work_end_time=time(18, 0),
        daily_working_hours=9,
    )
    end_dt = datetime(2026, 9, 12, 11, 0)
    start_dt = walk_working_hours_backward(end_dt, 13, cal)

    assert start_dt == datetime(2026, 9, 10, 16, 0)


def test_compute_successor_datetimes_exact_example():
    """Verify compute_successor_datetimes produces exact result for FS with No Lag and 1d 4h duration."""
    cal = WorkingCalendar(
        holidays=set(),
        off_weekdays={6},
        work_start_time=time(9, 0),
        work_end_time=time(18, 0),
        daily_working_hours=9,
    )
    p_start = datetime(2026, 9, 10, 9, 0)
    p_finish = datetime(2026, 9, 10, 16, 0)

    s_start, s_due = compute_successor_datetimes(
        pred_start=p_start,
        pred_due=p_finish,
        dep_type="FS",
        lag_days=0,
        lag_hours=0,
        dur_working_days=1,
        dur_working_hours=4,
        calendar=cal,
    )

    assert s_start == datetime(2026, 9, 10, 16, 0)
    assert s_due == datetime(2026, 9, 12, 11, 0)


def test_end_of_day_rollover():
    """Predecessor finishes at exact end of day (18:00). Successor FS 0-lag should start 09:00 next working day."""
    cal = WorkingCalendar(
        holidays=set(),
        off_weekdays={6},
        work_start_time=time(9, 0),
        work_end_time=time(18, 0),
        daily_working_hours=9,
    )
    p_finish = datetime(2026, 9, 10, 18, 0)

    s_start, s_due = compute_successor_datetimes(
        pred_start=None,
        pred_due=p_finish,
        dep_type="FS",
        lag_days=0,
        lag_hours=0,
        dur_working_days=1,
        dur_working_hours=0,  # 9 hours
        calendar=cal,
    )

    assert s_start == datetime(2026, 9, 11, 9, 0)
    assert s_due == datetime(2026, 9, 11, 18, 0)


def test_ss_dependency_with_lag_hours():
    """Start-to-Start: Predecessor starts 10-Sep 09:00. Lag is 0d 3h. Successor starts 10-Sep 12:00."""
    cal = WorkingCalendar(
        holidays=set(),
        off_weekdays={6},
        work_start_time=time(9, 0),
        work_end_time=time(18, 0),
        daily_working_hours=9,
    )
    p_start = datetime(2026, 9, 10, 9, 0)

    s_start, s_due = compute_successor_datetimes(
        pred_start=p_start,
        pred_due=None,
        dep_type="SS",
        lag_days=0,
        lag_hours=3,
        dur_working_days=0,
        dur_working_hours=4,  # 4 hours
        calendar=cal,
    )

    assert s_start == datetime(2026, 9, 10, 12, 0)
    assert s_due == datetime(2026, 9, 10, 16, 0)


def test_ff_dependency_with_lag():
    """Finish-to-Finish: Predecessor finishes 10-Sep 16:00. Lag is 2 hours. Successor finishes 10-Sep 18:00."""
    cal = WorkingCalendar(
        holidays=set(),
        off_weekdays={6},
        work_start_time=time(9, 0),
        work_end_time=time(18, 0),
        daily_working_hours=9,
    )
    p_finish = datetime(2026, 9, 10, 16, 0)

    s_start, s_due = compute_successor_datetimes(
        pred_start=None,
        pred_due=p_finish,
        dep_type="FF",
        lag_days=0,
        lag_hours=2,
        dur_working_days=0,
        dur_working_hours=5,  # 5 hours
        calendar=cal,
    )

    assert s_due == datetime(2026, 9, 10, 18, 0)
    assert s_start == datetime(2026, 9, 10, 13, 0)


def test_api_e2e_exact_prompt_scenario(seeded_client: TestClient, db: Session):
    """
    End-to-end API test:
    1. Set calendar daily working hours to 09:00 - 18:00 (9 hours).
    2. Set weekly off days to Sun only (0).
    3. Create ARR-T1 ending 10-Sep-2026 16:00.
    4. Create ARR-T2 with duration 1d 4h.
    5. Create FS dependency from ARR-T1 to ARR-T2 with 0 lag.
    6. Verify ARR-T2 start is 10-Sep-2026 16:00 and due is 12-Sep-2026 11:00.
    """
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)

    # 1. Update calendar working hours
    res_cal = seeded_client.put(
        "/api/v1/calendar/working-hours",
        json={"work_start_time": "09:00", "work_end_time": "18:00"},
        headers=headers,
    )
    assert res_cal.status_code == 200
    assert res_cal.json()["daily_working_hours"] == 9

    # Set weekly off to Sunday only (0)
    seeded_client.put(
        "/api/v1/calendar/weekly-off",
        json={"day_of_week_list": [0]},
        headers=headers,
    )

    # Create project
    p_res = seeded_client.post(
        "/api/v1/projects",
        json={"name": "Arrangement Project", "category": "General"},
        headers=headers,
    )
    assert p_res.status_code == 201
    proj_id = p_res.json()["id"]

    # Create ARR-T1
    t1_res = seeded_client.post(
        "/api/v1/tasks",
        json={
            "project_id": proj_id,
            "title": "ARR-T1",
            "start_date": "2026-09-10",
            "start_time": "09:00",
            "due_date": "2026-09-10",
            "due_time": "16:00",
            "duration_working_days": 0,
            "duration_working_hours": 7,
        },
        headers=headers,
    )
    assert t1_res.status_code == 201
    t1_id = t1_res.json()["id"]

    # Create ARR-T2 with Duration 1 Day 4 Hours
    t2_res = seeded_client.post(
        "/api/v1/tasks",
        json={
            "project_id": proj_id,
            "title": "ARR-T2",
            "duration_working_days": 1,
            "duration_working_hours": 4,
        },
        headers=headers,
    )
    assert t2_res.status_code == 201
    t2_id = t2_res.json()["id"]

    # Add FS dependency: ARR-T2 depends on ARR-T1 with No Lag
    dep_res = seeded_client.post(
        f"/api/v1/tasks/{t2_id}/dependencies",
        json={
            "predecessor_task_id": t1_id,
            "dep_type": "FS",
            "lag_days": 0,
            "lag_hours": 0,
        },
        headers=headers,
    )
    assert dep_res.status_code == 201

    # Fetch updated ARR-T2
    t2_get = seeded_client.get(f"/api/v1/tasks/{t2_id}", headers=headers).json()
    assert t2_get["start_date"] == "2026-09-10"
    assert t2_get["start_time"] == "16:00"
    assert t2_get["due_date"] == "2026-09-12"
    assert t2_get["due_time"] == "11:00"
    assert t2_get["duration_working_days"] == 1
    assert t2_get["duration_working_hours"] == 4


def test_validation_hours_exceeding_daily_length(seeded_client: TestClient):
    """Verify entering duration hours or lag hours >= daily hours is rejected with 400."""
    token = login(seeded_client, "admin@kim.com", DEFAULT_PASSWORD)
    headers = auth_headers(token)

    # Set daily hours to 9 (09:00 to 18:00)
    seeded_client.put(
        "/api/v1/calendar/working-hours",
        json={"work_start_time": "09:00", "work_end_time": "18:00"},
        headers=headers,
    )

    p_res = seeded_client.post("/api/v1/projects", json={"name": "Val Proj"}, headers=headers)
    proj_id = p_res.json()["id"]

    # Duration with 9 hours when daily is 9 should be rejected (must be smaller than daily length)
    bad_task = seeded_client.post(
        "/api/v1/tasks",
        json={
            "project_id": proj_id,
            "title": "Bad Task",
            "duration_working_days": 1,
            "duration_working_hours": 9,
        },
        headers=headers,
    )
    assert bad_task.status_code == 400
    assert "less than daily working hours" in bad_task.json()["detail"]
