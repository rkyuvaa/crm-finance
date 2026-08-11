from datetime import UTC, datetime, timedelta


def utcnow() -> datetime:
    return datetime.now(UTC)


def as_utc(dt: datetime) -> datetime:
    """Normalize naive datetimes (e.g. from SQLite) to aware UTC."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt


def db_now() -> datetime:
    """Aware time on Postgres, naive UTC on SQLite (which strips tz)."""
    from app.core.config import settings

    now = utcnow()
    if settings.database_url.startswith("sqlite"):
        return now.replace(tzinfo=None)
    return now


def duration_between(start: datetime | None, end: datetime | None = None) -> timedelta:
    if start is None:
        return timedelta(0)
    return as_utc(end or utcnow()) - as_utc(start)


def format_aging(td: timedelta) -> str:
    """Mockup table-aging style: '4h', '2d', '1.4d', '2.5d', '4.2d'."""
    total_hours = td.total_seconds() / 3600
    if total_hours < 24:
        return f"{int(total_hours)}h"
    days = round(total_hours / 24, 1)
    if abs(days - round(days)) < 0.05:
        return f"{int(round(days))}d"
    return f"{days:.1f}d"


def format_wait(td: timedelta) -> str:
    """Waiting-on style: '2h 40m', '1d 3h', '2d 6h'."""
    total_hours = td.total_seconds() / 3600
    if total_hours < 24:
        h, m = int(total_hours), int((total_hours - int(total_hours)) * 60)
        return f"{h}h {m}m"
    d, h = int(total_hours // 24), int(total_hours % 24)
    return f"{d}d {h}h"


def format_attention(td: timedelta) -> str:
    """Needs-attention style: '4h 18m' below a day, otherwise decimal days '2.5d'."""
    total_hours = td.total_seconds() / 3600
    if total_hours < 24:
        h, m = int(total_hours), int((total_hours - int(total_hours)) * 60)
        return f"{h}h {m}m"
    return format_aging(td)


def aging_tone(td: timedelta) -> str:
    total_hours = td.total_seconds() / 3600
    if total_hours < 24:
        return "neutral"
    if total_hours < 48:
        return "medium"
    return "high"
