"""
Working Calendar Service
========================
Provides calendar-aware date and exact date-time arithmetic for the PM scheduling engine.

Conventions:
- day_of_week follows Python isoweekday(): Monday=1, Sunday=7
  WeeklyOffDay.day_of_week stores 0=Sunday ... 6=Saturday (matches JS Date.getDay())
- Daily working hours: start time (e.g. 09:00) and end time (e.g. 18:00)
- Duration at leaf level = Days + Hours
- Duration at parent level = calendar days (End - Start + 1)
"""
from datetime import date, datetime, time, timedelta
from typing import NamedTuple, Optional, Set, Tuple
from sqlalchemy.orm import Session
from app.models.projects import WorkingCalendarHoliday, WeeklyOffDay, WorkingCalendarSetting


class WorkingCalendar(NamedTuple):
    holidays: Set[date]
    off_weekdays: Set[int]
    work_start_time: time = time(9, 0)
    work_end_time: time = time(18, 0)
    daily_working_hours: int = 9


def parse_hhmm_time(t_str: Optional[str], default: time) -> time:
    """Parse 'HH:MM' string to time object with fallback."""
    if not t_str:
        return default
    try:
        parts = t_str.strip().split(":")
        return time(int(parts[0]), int(parts[1]))
    except Exception:
        return default


def get_working_calendar(db: Session) -> WorkingCalendar:
    """
    Returns WorkingCalendar(holidays, off_weekdays, work_start_time, work_end_time, daily_working_hours).
    Can be unpacked as `holidays, off_weekdays = get_working_calendar(db)` for backwards compatibility.
    """
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
    py_map = {0: 6, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5}
    for js_day in js_off_days:
        if js_day in py_map:
            off_weekdays.add(py_map[js_day])

    # Fetch daily working hours setting
    setting = db.query(WorkingCalendarSetting).first()
    start_t = parse_hhmm_time(setting.work_start_time if setting else None, time(9, 0))
    end_t = parse_hhmm_time(setting.work_end_time if setting else None, time(18, 0))

    start_mins = start_t.hour * 60 + start_t.minute
    end_mins = end_t.hour * 60 + end_t.minute
    daily_hours = max(1, (end_mins - start_mins) // 60)

    return WorkingCalendar(
        holidays=holiday_dates,
        off_weekdays=off_weekdays,
        work_start_time=start_t,
        work_end_time=end_t,
        daily_working_hours=daily_hours,
    )


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


def previous_working_day(d: date, holidays: Set[date], off_weekdays: Set[int]) -> date:
    """Return d itself if working, else roll backward to latest previous working day."""
    while not is_working_day(d, holidays, off_weekdays):
        d -= timedelta(days=1)
    return d


def add_working_days(start: date, n: int, calendar: Tuple[Set[date], Set[int]]) -> date:
    """
    Add n working days to start.
    n=0 → returns start (rolled to next working day if non-working).
    Positive n advances forward; negative n goes backward.
    """
    holidays = calendar[0]
    off_weekdays = calendar[1]
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
    """
    Subtract n working days from end.
    n=0 returns end (rolled to preceding working day if non-working).
    Positive n steps backward n working days.
    """
    holidays = calendar[0]
    off_weekdays = calendar[1]
    current = end
    # If end is on a non-working day, roll backward to the latest working day
    while not is_working_day(current, holidays, off_weekdays):
        current -= timedelta(days=1)

    if n <= 0:
        return current

    remaining = n
    while remaining > 0:
        current -= timedelta(days=1)
        if is_working_day(current, holidays, off_weekdays):
            remaining -= 1

    return current


def count_working_days(start: date, end: date, calendar: Tuple[Set[date], Set[int]]) -> int:
    """Count working days from start to end inclusive."""
    if start > end:
        return 0
    holidays = calendar[0]
    off_weekdays = calendar[1]
    count = 0
    current = start
    while current <= end:
        if is_working_day(current, holidays, off_weekdays):
            count += 1
        current += timedelta(days=1)
    return count


# ==============================================================================
# Exact Date-Time Working Hours Arithmetic
# ==============================================================================

def normalize_working_datetime_forward(
    dt: datetime,
    holidays: Set[date],
    off_weekdays: Set[int],
    work_start: time,
    work_end: time,
) -> datetime:
    """
    Normalize dt forward:
    - If on a non-working day, rolls forward to the next working day at work_start.
    - If earlier than work_start, sets time to work_start today.
    - If at or after work_end, rolls forward to the next working day at work_start.
    """
    cur_date = dt.date()
    cur_time = dt.time()

    if not is_working_day(cur_date, holidays, off_weekdays):
        cur_date = next_working_day(cur_date + timedelta(days=1), holidays, off_weekdays)
        return datetime.combine(cur_date, work_start)

    if cur_time < work_start:
        return datetime.combine(cur_date, work_start)

    if cur_time >= work_end:
        next_d = next_working_day(cur_date + timedelta(days=1), holidays, off_weekdays)
        return datetime.combine(next_d, work_start)

    return dt


def normalize_working_datetime_backward(
    dt: datetime,
    holidays: Set[date],
    off_weekdays: Set[int],
    work_start: time,
    work_end: time,
) -> datetime:
    """
    Normalize dt backward:
    - If on a non-working day, rolls backward to previous working day at work_end.
    - If after work_end, sets time to work_end today.
    - If at or before work_start, rolls backward to previous working day at work_end.
    """
    cur_date = dt.date()
    cur_time = dt.time()

    if not is_working_day(cur_date, holidays, off_weekdays):
        cur_date = previous_working_day(cur_date - timedelta(days=1), holidays, off_weekdays)
        return datetime.combine(cur_date, work_end)

    if cur_time > work_end:
        return datetime.combine(cur_date, work_end)

    if cur_time <= work_start:
        prev_d = previous_working_day(cur_date - timedelta(days=1), holidays, off_weekdays)
        return datetime.combine(prev_d, work_end)

    return dt


def walk_working_hours_forward(
    start_dt: datetime,
    total_hours: float,
    calendar: WorkingCalendar,
) -> datetime:
    """
    Walk forward `total_hours` working hours starting from start_dt.
    Skips non-working hours and non-working days entirely so the result never lands outside a working window.
    """
    if total_hours < 0:
        return walk_working_hours_backward(start_dt, -total_hours, calendar)

    holidays = calendar.holidays
    off_weekdays = calendar.off_weekdays
    work_start = calendar.work_start_time
    work_end = calendar.work_end_time

    current = normalize_working_datetime_forward(start_dt, holidays, off_weekdays, work_start, work_end)
    if total_hours == 0:
        return current

    remaining_hours = float(total_hours)

    while remaining_hours > 0:
        minutes_to_end = (work_end.hour * 60 + work_end.minute) - (current.hour * 60 + current.minute)
        hours_to_end = minutes_to_end / 60.0

        if remaining_hours < hours_to_end or abs(remaining_hours - hours_to_end) < 1e-6:
            current = current + timedelta(hours=remaining_hours)
            remaining_hours = 0
            break
        else:
            remaining_hours -= hours_to_end
            next_date = next_working_day(current.date() + timedelta(days=1), holidays, off_weekdays)
            current = datetime.combine(next_date, work_start)

    return current


def walk_working_hours_backward(
    end_dt: datetime,
    total_hours: float,
    calendar: WorkingCalendar,
) -> datetime:
    """
    Walk backward `total_hours` working hours starting from end_dt.
    Skips non-working hours and non-working days entirely.
    """
    if total_hours < 0:
        return walk_working_hours_forward(end_dt, -total_hours, calendar)

    holidays = calendar.holidays
    off_weekdays = calendar.off_weekdays
    work_start = calendar.work_start_time
    work_end = calendar.work_end_time

    current = normalize_working_datetime_backward(end_dt, holidays, off_weekdays, work_start, work_end)
    if total_hours == 0:
        return current

    remaining_hours = float(total_hours)

    while remaining_hours > 0:
        minutes_from_start = (current.hour * 60 + current.minute) - (work_start.hour * 60 + work_start.minute)
        hours_from_start = minutes_from_start / 60.0

        if remaining_hours < hours_from_start or abs(remaining_hours - hours_from_start) < 1e-6:
            current = current - timedelta(hours=remaining_hours)
            remaining_hours = 0
            break
        else:
            remaining_hours -= hours_from_start
            prev_date = previous_working_day(current.date() - timedelta(days=1), holidays, off_weekdays)
            current = datetime.combine(prev_date, work_end)

    return current


def count_working_hours(
    start_dt: datetime,
    end_dt: datetime,
    calendar: WorkingCalendar,
) -> Tuple[int, int]:
    """
    Count working time between start_dt and end_dt.
    Returns (working_days, working_hours) where working_hours < daily_working_hours.
    """
    if start_dt >= end_dt:
        return 0, 0

    holidays = calendar.holidays
    off_weekdays = calendar.off_weekdays
    work_start = calendar.work_start_time
    work_end = calendar.work_end_time
    daily_hours = calendar.daily_working_hours

    # Normalize both
    cur = normalize_working_datetime_forward(start_dt, holidays, off_weekdays, work_start, work_end)
    end_norm = normalize_working_datetime_backward(end_dt, holidays, off_weekdays, work_start, work_end)

    if cur >= end_norm:
        return 0, 0

    total_hours = 0.0
    while cur.date() < end_norm.date():
        # Add hours remaining today
        mins_today = (work_end.hour * 60 + work_end.minute) - (cur.hour * 60 + cur.minute)
        total_hours += mins_today / 60.0
        next_d = next_working_day(cur.date() + timedelta(days=1), holidays, off_weekdays)
        cur = datetime.combine(next_d, work_start)

    # Same day
    if cur < end_norm:
        mins_final = (end_norm.hour * 60 + end_norm.minute) - (cur.hour * 60 + cur.minute)
        total_hours += mins_final / 60.0

    total_int_hours = int(round(total_hours))
    days = total_int_hours // daily_hours
    hours = total_int_hours % daily_hours
    return days, hours
