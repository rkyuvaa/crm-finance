from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.projects import WorkingCalendarHoliday, WeeklyOffDay, WorkingCalendarSetting
from app.services.calendar_service import parse_hhmm_time
from datetime import time
from app.core.deps import get_current_user, require_permission

router = APIRouter(prefix="/calendar", tags=["calendar"], dependencies=[Depends(require_permission("view", "activities"))])


class HolidayCreate(BaseModel):
    holiday_date: date
    description: str
    recurs_yearly: bool = False


class HolidayOut(BaseModel):
    id: int
    holiday_date: date
    description: str
    recurs_yearly: bool

    model_config = ConfigDict(from_attributes=True)


class WeeklyOffUpdate(BaseModel):
    day_of_week_list: Optional[List[int]] = None
    days: Optional[List[int]] = None


class WorkingHoursUpdate(BaseModel):
    work_start_time: str = "09:00"
    work_end_time: str = "18:00"


class CalendarConfigOut(BaseModel):
    holidays: List[HolidayOut]
    weekly_off_days: List[int]
    work_start_time: str = "09:00"
    work_end_time: str = "18:00"
    daily_working_hours: int = 9


@router.get("/config", response_model=CalendarConfigOut)
def get_calendar_config(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    holidays = db.query(WorkingCalendarHoliday).order_by(WorkingCalendarHoliday.holiday_date.asc()).all()
    weekly_off_rows = db.query(WeeklyOffDay).all()
    weekly_off_days = [row.day_of_week for row in weekly_off_rows]

    setting = db.query(WorkingCalendarSetting).first()
    start_str = setting.work_start_time if setting else "09:00"
    end_str = setting.work_end_time if setting else "18:00"

    t_start = parse_hhmm_time(start_str, time(9, 0))
    t_end = parse_hhmm_time(end_str, time(18, 0))
    daily_hours = max(1, (t_end.hour * 60 + t_end.minute - (t_start.hour * 60 + t_start.minute)) // 60)

    holiday_list = [
        HolidayOut(
            id=h.id,
            holiday_date=h.holiday_date,
            description=h.description,
            recurs_yearly=h.recurs_yearly
        )
        for h in holidays
    ]
    return {
        "holidays": holiday_list,
        "weekly_off_days": weekly_off_days,
        "work_start_time": start_str,
        "work_end_time": end_str,
        "daily_working_hours": daily_hours,
    }


@router.post("/holidays", response_model=HolidayOut)
def add_holiday(data: HolidayCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(WorkingCalendarHoliday).filter(WorkingCalendarHoliday.holiday_date == data.holiday_date).first()
    if existing:
        existing.description = data.description
        existing.recurs_yearly = data.recurs_yearly
        db.commit()
        db.refresh(existing)
        return HolidayOut(
            id=existing.id,
            holiday_date=existing.holiday_date,
            description=existing.description,
            recurs_yearly=existing.recurs_yearly
        )

    new_holiday = WorkingCalendarHoliday(
        holiday_date=data.holiday_date,
        description=data.description,
        recurs_yearly=data.recurs_yearly
    )
    db.add(new_holiday)
    db.commit()
    db.refresh(new_holiday)
    return HolidayOut(
        id=new_holiday.id,
        holiday_date=new_holiday.holiday_date,
        description=new_holiday.description,
        recurs_yearly=new_holiday.recurs_yearly
    )


@router.delete("/holidays/{holiday_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_holiday(holiday_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    holiday = db.query(WorkingCalendarHoliday).filter(WorkingCalendarHoliday.id == holiday_id).first()
    if holiday:
        db.delete(holiday)
        db.commit()
    return None


@router.put("/weekly-off")
def update_weekly_off(data: WeeklyOffUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    target_days = data.day_of_week_list if data.day_of_week_list is not None else (data.days or [])
    valid_days = set(d for d in target_days if 0 <= d <= 6)

    db.query(WeeklyOffDay).delete()
    for d in sorted(valid_days):
        db.add(WeeklyOffDay(day_of_week=d))
    db.commit()

    updated_rows = db.query(WeeklyOffDay).all()
    res_days = [r.day_of_week for r in updated_rows]
    return {"weekly_off_days": res_days, "day_of_week_list": res_days}


@router.put("/working-hours")
def update_working_hours(data: WorkingHoursUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    t_start = parse_hhmm_time(data.work_start_time, time(9, 0))
    t_end = parse_hhmm_time(data.work_end_time, time(18, 0))

    start_mins = t_start.hour * 60 + t_start.minute
    end_mins = t_end.hour * 60 + t_end.minute

    if end_mins <= start_mins:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Daily Work End Time must be later than Start Time."
        )

    daily_hours = (end_mins - start_mins) // 60
    if daily_hours < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Daily working hours must be at least 1 hour."
        )

    setting = db.query(WorkingCalendarSetting).first()
    if not setting:
        setting = WorkingCalendarSetting(
            work_start_time=t_start.strftime("%H:%M"),
            work_end_time=t_end.strftime("%H:%M"),
        )
        db.add(setting)
    else:
        setting.work_start_time = t_start.strftime("%H:%M")
        setting.work_end_time = t_end.strftime("%H:%M")

    db.commit()
    db.refresh(setting)

    return {
        "work_start_time": setting.work_start_time,
        "work_end_time": setting.work_end_time,
        "daily_working_hours": daily_hours,
    }

