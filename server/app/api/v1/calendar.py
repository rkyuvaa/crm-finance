from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.projects import WorkingCalendarHoliday, WeeklyOffDay
from app.core.deps import get_current_user

router = APIRouter(prefix="/calendar", tags=["calendar"])


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


class CalendarConfigOut(BaseModel):
    holidays: List[HolidayOut]
    weekly_off_days: List[int]


@router.get("/config", response_model=CalendarConfigOut)
def get_calendar_config(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    holidays = db.query(WorkingCalendarHoliday).order_by(WorkingCalendarHoliday.date.asc()).all()
    weekly_off_rows = db.query(WeeklyOffDay).all()
    weekly_off_days = [row.day_of_week for row in weekly_off_rows]

    holiday_list = [
        HolidayOut(
            id=h.id,
            holiday_date=h.date,
            description=h.description,
            recurs_yearly=h.recurs_yearly
        )
        for h in holidays
    ]
    return {
        "holidays": holiday_list,
        "weekly_off_days": weekly_off_days
    }


@router.post("/holidays", response_model=HolidayOut)
def add_holiday(data: HolidayCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(WorkingCalendarHoliday).filter(WorkingCalendarHoliday.date == data.holiday_date).first()
    if existing:
        existing.description = data.description
        existing.recurs_yearly = data.recurs_yearly
        db.commit()
        db.refresh(existing)
        return HolidayOut(
            id=existing.id,
            holiday_date=existing.date,
            description=existing.description,
            recurs_yearly=existing.recurs_yearly
        )

    new_holiday = WorkingCalendarHoliday(
        date=data.holiday_date,
        description=data.description,
        recurs_yearly=data.recurs_yearly
    )
    db.add(new_holiday)
    db.commit()
    db.refresh(new_holiday)
    return HolidayOut(
        id=new_holiday.id,
        holiday_date=new_holiday.date,
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

