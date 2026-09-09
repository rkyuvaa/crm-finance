from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.core.deps import get_current_user

router = APIRouter(prefix="/calendar", tags=["calendar"])

@router.get("/config")
def get_calendar_config(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return {"holidays": [], "weekly_off_days": [0, 6]}

@router.post("/holidays")
def add_holiday(data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return {"id": 1, **data}

@router.delete("/holidays/{holiday_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_holiday(holiday_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return None

@router.put("/weekly-off")
def update_weekly_off(days: List[int], db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return {"weekly_off_days": days}
