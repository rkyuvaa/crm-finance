"""
Working Calendar Service
========================
Provides calendar-aware date arithmetic for the PM scheduling engine.

Conventions:
- day_of_week follows Python isoweekday(): Monday=1, Sunday=7
  WeeklyOffDay.day_of_week stores 0=Sunday ... 6=Saturday (matches JS Date.getDay())
- Duration at leaf level = working days (user-entered)
- Duration at parent level = calendar days (End - Start + 1)
"""
from datetime import date, timedelta
from typing import Set, Tuple
from sqlalchemy.orm import Session
from app.models.projects import WorkingCalendarHoliday, WeeklyOffDay


def get_working_calendar(db: Session) -> Tuple[Set[date], Set[int]]:
    """
    Returns (holiday_dates: Set[date], off_weekdays: Set[int]).
    off_weekdays uses Python's date.weekday() convention: Monday=0, Sunday=6.
    Handles recurs_yearly by expanding recurring holidays for current year ±2.
    """
    from datetime import datetime
    current_year = datetime.now().year
    years_range = range(current_year - 2, current_year + 3)

    raw_holidays = db.query(WorkingCalendarHoliday).all()
    holiday_dates: Set[date] = set()

    for h in raw_holidays:
        if h.recurs_yearly:
            for yr in years_range:
                try:
                    holiday_dates.add(date(yr, h.holiday_date.month, h.holiday_date.day))
                except ValueError:
                    pass  # Feb 29 in non-leap years — skip
        else:
            holiday_dates.add(h.holiday_date)

    # WeeklyOffDay stores 0=Sunday,1=Monday,...,6=Saturday (JS convention)
    # Python's date.weekday() is Monday=0...Sunday=6
    # Map: JS 0(Sun)→Py 6, JS 1(Mon)→Py 0, ..., JS 6(Sat)→Py 5
    js_off_days = {d.day_of_week for d in db.query(WeeklyOffDay).all()}
    off_weekdays: Set[int] = set()
    for js_day in js_off_days:
        py_day = (js_day - 1) % 7  # JS Sun(0)→Py Sat(5)? No — correct mapping below
        # JS: 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
        # Py: 0=Mon,1=Tue,2=Wed,3=Thu,4=Fri,5=Sat,6=Sun
        py_map = {0: 6, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5}
        off_weekdays.add(py_map[js_day])

    return holiday_dates, off_weekdays


def is_working_day(d: date, holidays: Set[date], off_weekdays: Set[int]) -> bool:
    """Return True if d is a working day (not a holiday, not a weekly-off day)."""
    if d in holidays:
        return False
    if d.weekday() in off_weekdays:
        return False
    return True


def next_working_day(d: date, holidays: Set[date], off_weekdays: Set[int]) -> date:
    """Return d itself if working, else roll forward to next working day."""
    while not is_working_day(d, holidays, off_weekdays):
        d += timedelta(days=1)
    return d


def add_working_days(start: date, n: int, calendar: Tuple[Set[date], Set[int]]) -> date:
    """
    Add n working days to start.
    n=0 → returns start (rolled to next working day if non-working).
    Positive n advances forward; negative n goes backward.
    """
    holidays, off_weekdays = calendar
    current = next_working_day(start, holidays, off_weekdays)

    if n == 0:
        return current

    step = 1 if n > 0 else -1
    remaining = abs(n)

    while remaining > 0:
        current += timedelta(days=step)
        if is_working_day(current, holidays, off_weekdays):
            remaining -= 1

    return current


def subtract_working_days(end: date, n: int, calendar: Tuple[Set[date], Set[int]]) -> date:
    """Subtract n working days from end. end counts as day 1."""
    holidays, off_weekdays = calendar
    current = next_working_day(end, holidays, off_weekdays)

    remaining = n - 1  # end itself counts as day 1
    while remaining > 0:
        current -= timedelta(days=1)
        if is_working_day(current, holidays, off_weekdays):
            remaining -= 1

    return current


def count_working_days(start: date, end: date, calendar: Tuple[Set[date], Set[int]]) -> int:
    """Count working days from start to end inclusive."""
    if start > end:
        return 0
    holidays, off_weekdays = calendar
    count = 0
    current = start
    while current <= end:
        if is_working_day(current, holidays, off_weekdays):
            count += 1
        current += timedelta(days=1)
    return count
