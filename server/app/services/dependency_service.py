"""
Dependency Scheduling Service
==============================
Implements FS/SS/FF/SF scheduling with lag (Days + Hours) and working-calendar exact date-time awareness.

Dependency type rules (successor's controlled datetime → derived datetime):
  FS: successor.start = predecessor.end   + lag  → end   = start + duration
  SS: successor.start = predecessor.start + lag  → end   = start + duration
  FF: successor.end   = predecessor.end   + lag  → start = end   - duration
  SF: successor.end   = predecessor.start + lag  → start = end   - duration

All datetime arithmetic walks working hours via calendar_service.
"""
from typing import Set, Tuple, Optional
from datetime import date, datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status as http_status
from app.models.projects import Task, TaskDependency, PMDepType
from app.services.calendar_service import (
    get_working_calendar,
    parse_hhmm_time,
    walk_working_hours_forward,
    walk_working_hours_backward,
)
from app.services.scheduling_engine import compute_successor_datetimes


def _get_controlled_field(dep_type: Any) -> str:
    """Returns 'start_date' or 'due_date' — whichever the dep type directly controls on the successor."""
    d_str = dep_type.value if hasattr(dep_type, 'value') else str(dep_type)
    if d_str in ("FS", "SS"):
        return "start_date"
    return "due_date"


def apply_dependency_schedule(db: Session, task: Task) -> bool:
    """
    For a given task, find its controlling predecessor dependencies (pm_dep_type set).
    Compute and SET task.start_date, task.start_time, task.due_date, task.due_time based on exact date-time.
    Returns True if dates/times were changed.
    If task is a parent (has children), skip — parents are controlled by rollup, not dependencies.
    Does NOT commit.
    """
    # Skip parents — they are rollup-controlled
    children_count = db.query(Task).filter(
        Task.parent_task_id == task.id,
        Task.is_deleted.is_(False)
    ).count()
    if children_count > 0:
        return False

    deps = db.query(TaskDependency).filter(
        TaskDependency.task_id == task.id,
        TaskDependency.pm_dep_type.isnot(None)
    ).all()

    if not deps:
        return False

    calendar = get_working_calendar(db)
    changed = False

    succ_dur_days = task.duration_working_days or 0
    succ_dur_hours = task.duration_working_hours or 0
    if succ_dur_days == 0 and succ_dur_hours == 0:
        succ_dur_days = 1

    max_req_start: Optional[datetime] = None
    max_req_due: Optional[datetime] = None

    for dep in deps:
        pred = db.query(Task).filter(Task.id == dep.depends_on_task_id).first()
        if not pred:
            continue

        p_finish_d = pred.due_date or pred.start_date
        p_finish_t = parse_hhmm_time(pred.due_time, calendar.work_end_time)
        p_start_d = pred.start_date or p_finish_d
        p_start_t = parse_hhmm_time(pred.start_time, calendar.work_start_time)

        if not p_finish_d and not p_start_d:
            continue

        p_finish_dt = datetime.combine(p_finish_d, p_finish_t)
        p_start_dt = datetime.combine(p_start_d, p_start_t)

        d_type = dep.pm_dep_type.value if hasattr(dep.pm_dep_type, 'value') else str(dep.pm_dep_type or 'FS')
        l_days = dep.lag_days or 0
        l_hours = dep.lag_hours or 0

        cand_start_dt, cand_due_dt = compute_successor_datetimes(
            p_start_dt, p_finish_dt, d_type, l_days, l_hours, succ_dur_days, succ_dur_hours, calendar
        )
        if cand_start_dt:
            if max_req_start is None or cand_start_dt > max_req_start:
                max_req_start = cand_start_dt
                max_req_due = cand_due_dt

    if max_req_start and max_req_due:
        new_start_d = max_req_start.date()
        new_start_t = max_req_start.strftime("%H:%M")
        new_due_d = max_req_due.date()
        new_due_t = max_req_due.strftime("%H:%M")

        if (task.start_date != new_start_d or task.start_time != new_start_t or
            task.due_date != new_due_d or task.due_time != new_due_t):
            task.start_date = new_start_d
            task.start_time = new_start_t
            task.due_date = new_due_d
            task.due_time = new_due_t
            task.duration_working_days = succ_dur_days
            task.duration_working_hours = succ_dur_hours
            db.add(task)
            changed = True

    return changed


def cascade_recalculate(db: Session, changed_task_id: int) -> None:
    """
    BFS through all tasks that have changed_task_id as a predecessor (via pm_dep_type deps).
    For each successor, call apply_dependency_schedule, then trigger rollup.
    Continues recursively. Detects cycles (visited set).
    Does NOT commit.
    """
    from app.services.rollup_service import rollup_work_item

    queue = [changed_task_id]
    visited: set = set()

    while queue:
        current_id = queue.pop(0)
        if current_id in visited:
            continue
        visited.add(current_id)

        # Find all tasks that depend on current_id with a scheduling dep type
        successor_deps = db.query(TaskDependency).filter(
            TaskDependency.depends_on_task_id == current_id,
            TaskDependency.pm_dep_type.isnot(None)
        ).all()

        for dep in successor_deps:
            succ = db.query(Task).filter(Task.id == dep.task_id).first()
            if succ and succ.id not in visited:
                changed = apply_dependency_schedule(db, succ)
                if changed:
                    queue.append(succ.id)
                    # Trigger rollup up the parent chain for this successor
                    if succ.parent_task_id:
                        rollup_work_item(db, succ.parent_task_id)


def validate_date_edit(db: Session, task: Task, field: str) -> None:
    """
    Raises HTTPException(400) if `field` ('start_date' or 'due_date') is dependency-controlled
    by a pm_dep_type dependency. Error message names the controlling predecessor task_number.
    """
    deps = db.query(TaskDependency).filter(
        TaskDependency.task_id == task.id,
        TaskDependency.pm_dep_type.isnot(None)
    ).all()

    for dep in deps:
        controlled_field = _get_controlled_field(dep.pm_dep_type)
        if controlled_field == field:
            pred = db.query(Task).filter(Task.id == dep.depends_on_task_id).first()
            pred_id = pred.task_number if pred else f"ID={dep.depends_on_task_id}"
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Cannot directly edit '{field.replace('_', ' ')}' on task {task.task_number}. "
                    f"It is controlled by predecessor {pred_id} via a {dep.pm_dep_type} dependency. "
                    f"Edit or remove that dependency first."
                )
            )
