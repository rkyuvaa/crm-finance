"""
Dependency Scheduling Service
==============================
Implements FS/SS/FF/SF scheduling with lag and working-calendar awareness.

Dependency type rules (successor's controlled date → derived date):
  FS: successor.start = predecessor.end   + lag  → end   = start + duration - 1
  SS: successor.start = predecessor.start + lag  → end   = start + duration - 1
  FF: successor.end   = predecessor.end   + lag  → start = end   - duration + 1
  SF: successor.end   = predecessor.start + lag  → start = end   - duration + 1

All date arithmetic uses working days via calendar_service.
In the DB: due_date = end_date, start_date = start_date.
"""
from typing import Set, Tuple, Optional
from datetime import date
from sqlalchemy.orm import Session
from fastapi import HTTPException, status as http_status
from app.models.projects import Task, TaskDependency, PMDepType
from app.services.calendar_service import add_working_days, subtract_working_days, get_working_calendar


def _get_controlled_field(dep_type: str) -> str:
    """Returns 'start_date' or 'due_date' — whichever the dep type directly controls on the successor."""
    if dep_type in (PMDepType.FS, PMDepType.SS):
        return "start_date"
    return "due_date"


def apply_dependency_schedule(db: Session, task: Task) -> bool:
    """
    For a given task, find its controlling predecessor dependencies (pm_dep_type set).
    Compute and SET task.start_date / task.due_date based on the dependency.
    Returns True if dates were changed.
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

    # Process each dependency — last one wins per controlled field
    new_start: Optional[date] = None
    new_end: Optional[date] = None

    for dep in deps:
        pred = db.query(Task).filter(Task.id == dep.depends_on_task_id).first()
        if not pred:
            continue

        lag = dep.lag_days or 0
        dep_type = dep.pm_dep_type

        if dep_type == PMDepType.FS:
            # Start = Predecessor.End + lag working-day gap
            # lag=0: start immediately after pred ends (next working day)
            # lag=2: 2 working days gap → e.g. pred ends Wed, lag 2 → start Mon (skipping holidays/weekends)
            if pred.due_date:
                from app.services.calendar_service import next_working_day
                from datetime import timedelta
                after_lag = add_working_days(pred.due_date, lag, calendar)
                computed = next_working_day(after_lag, calendar[0], calendar[1])
                if new_start is None or computed > new_start:
                    new_start = computed

        elif dep_type == PMDepType.SS:
            # Start = Predecessor.Start + lag working days
            if pred.start_date:
                if lag >= 0:
                    computed = add_working_days(pred.start_date, lag, calendar)
                else:
                    computed = subtract_working_days(pred.start_date, -lag, calendar)
                if new_start is None or computed > new_start:
                    new_start = computed

        elif dep_type == PMDepType.FF:
            # End = Predecessor.End + lag working days
            if pred.due_date:
                if lag >= 0:
                    computed = add_working_days(pred.due_date, lag, calendar)
                else:
                    computed = subtract_working_days(pred.due_date, -lag, calendar)
                if new_end is None or computed > new_end:
                    new_end = computed

        elif dep_type == PMDepType.SF:
            # End = Predecessor.Start + lag working days
            if pred.start_date:
                if lag >= 0:
                    computed = add_working_days(pred.start_date, lag, calendar)
                else:
                    computed = subtract_working_days(pred.start_date, -lag, calendar)
                if new_end is None or computed > new_end:
                    new_end = computed

    duration = task.duration_working_days or 0

    if new_start is not None:
        task.start_date = new_start
        if duration > 0:
            task.due_date = add_working_days(new_start, duration - 1, calendar)
        changed = True

    if new_end is not None:
        task.due_date = new_end
        if duration > 0:
            task.start_date = subtract_working_days(new_end, duration - 1, calendar)
        changed = True

    if changed:
        db.add(task)

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
