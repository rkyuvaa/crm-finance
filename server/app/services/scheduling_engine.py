"""
Automatic Task Scheduling Engine & Dependency Propagation Service
===================================================================
Professional, calendar-aware exact date-time task scheduling engine for ORBX Project & Task Management.

Handles:
- Working calendar date & exact date-time arithmetic (working days, weekly off days, holidays, daily working hours).
- Bi-directional Duration ↔ Start/Due Date calculation with Days + Hours.
- Exact date-time dependency scheduling (FS, SS, FF, SF + lag in Days + Hours).
- Recursive downstream dependency chain propagation.
- Parent task rollup & parent due date manual shift propagation.
- Auto Schedule lock (auto_schedule ON/OFF).
- Dependency conflict detection & one-click auto-adjustment.
- Circular dependency prevention with exact error messaging.
- Task activity audit logging for all auto-scheduled date shifts.
"""

from datetime import date, datetime, time, timedelta
from typing import Any, Dict, List, Optional, Set, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status as http_status

from app.models.projects import Task, TaskDependency, TaskActivity, PMDepType, DependencyType
from app.services.calendar_service import (
    WorkingCalendar,
    get_working_calendar,
    is_working_day,
    next_working_day,
    previous_working_day,
    add_working_days,
    subtract_working_days,
    count_working_days,
    walk_working_hours_forward,
    walk_working_hours_backward,
    count_working_hours,
    parse_hhmm_time,
    normalize_working_datetime_forward,
    normalize_working_datetime_backward,
)
from app.services.rollup_service import trigger_full_rollup, rollup_work_item


def validate_circular_dependency(db: Session, task_id: int, predecessor_id: int) -> None:
    """
    Validates that creating a dependency (task_id depends on predecessor_id)
    will not create a scheduling cycle.
    Raises 400 Bad Request with exact requested error text if a cycle is found.
    """
    if task_id == predecessor_id:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="⚠️ Circular dependency detected. This dependency cannot be created because it creates a scheduling loop."
        )

    # BFS traversal starting from task_id along successor links
    queue = [task_id]
    visited: Set[int] = set()

    while queue:
        curr = queue.pop(0)
        if curr in visited:
            continue
        visited.add(curr)

        if curr == predecessor_id:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="⚠️ Circular dependency detected. This dependency cannot be created because it creates a scheduling loop."
            )

        # Find all tasks that depend on curr (where task_id depends on curr)
        deps = db.query(TaskDependency).filter(
            TaskDependency.depends_on_task_id == curr
        ).all()
        for d in deps:
            queue.append(d.task_id)


def validate_parent_child_dependency(db: Session, task_id: int, predecessor_id: int) -> None:
    """
    Validates that a dependency cannot be created between a parent task and any of its descendants/subtasks.
    """
    curr = db.query(Task).filter(Task.id == predecessor_id, Task.is_deleted.is_(False)).first()
    while curr and curr.parent_task_id:
        if curr.parent_task_id == task_id:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="⚠️ Cannot create a dependency between a parent task and its subtask."
            )
        curr = db.query(Task).filter(Task.id == curr.parent_task_id, Task.is_deleted.is_(False)).first()

    curr = db.query(Task).filter(Task.id == task_id, Task.is_deleted.is_(False)).first()
    while curr and curr.parent_task_id:
        if curr.parent_task_id == predecessor_id:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="⚠️ Cannot create a dependency between a parent task and its subtask."
            )
        curr = db.query(Task).filter(Task.id == curr.parent_task_id, Task.is_deleted.is_(False)).first()


def compute_successor_datetimes(
    pred_start: Optional[datetime],
    pred_due: Optional[datetime],
    dep_type: str,
    lag_days: int,
    lag_hours: int,
    dur_working_days: int,
    dur_working_hours: int,
    calendar: WorkingCalendar,
) -> Tuple[Optional[datetime], Optional[datetime]]:
    """
    Compute required successor start_dt and due_dt based on predecessor exact datetimes,
    dependency type (FS/SS/FF/SF), lag (days + hours), and successor duration (days + hours).
    Walks working hours forward/backward skipping non-working hours and non-working days entirely.
    """
    if not pred_due and not pred_start:
        return None, None

    p_start = pred_start or pred_due
    p_due = pred_due or pred_start

    daily_h = calendar.daily_working_hours
    total_dur_hours = (dur_working_days or 0) * daily_h + (dur_working_hours or 0)
    if total_dur_hours <= 0:
        total_dur_hours = daily_h  # default 1 day

    total_lag_hours = (lag_days or 0) * daily_h + (lag_hours or 0)

    if dep_type == "FS":
        # Finish-to-Start: controlling datetime is predecessor finish
        succ_start = walk_working_hours_forward(p_due, total_lag_hours, calendar)
        # If total_lag_hours == 0 and succ_start is at or after work_end_time, roll to next working day
        if total_lag_hours == 0 and succ_start.time() >= calendar.work_end_time:
            succ_start = normalize_working_datetime_forward(
                succ_start, calendar.holidays, calendar.off_weekdays, calendar.work_start_time, calendar.work_end_time
            )
        succ_due = walk_working_hours_forward(succ_start, total_dur_hours, calendar)
        return succ_start, succ_due

    elif dep_type == "SS":
        # Start-to-Start: controlling datetime is predecessor start
        succ_start = walk_working_hours_forward(p_start, total_lag_hours, calendar)
        succ_due = walk_working_hours_forward(succ_start, total_dur_hours, calendar)
        return succ_start, succ_due

    elif dep_type == "FF":
        # Finish-to-Finish: controlling datetime is predecessor finish
        succ_due = walk_working_hours_forward(p_due, total_lag_hours, calendar)
        succ_start = walk_working_hours_backward(succ_due, total_dur_hours, calendar)
        return succ_start, succ_due

    elif dep_type == "SF":
        # Start-to-Finish: controlling datetime is predecessor start
        succ_due = walk_working_hours_forward(p_start, total_lag_hours, calendar)
        succ_start = walk_working_hours_backward(succ_due, total_dur_hours, calendar)
        return succ_start, succ_due

    else:
        # Default FS
        succ_start = walk_working_hours_forward(p_due, total_lag_hours, calendar)
        if total_lag_hours == 0 and succ_start.time() >= calendar.work_end_time:
            succ_start = normalize_working_datetime_forward(
                succ_start, calendar.holidays, calendar.off_weekdays, calendar.work_start_time, calendar.work_end_time
            )
        succ_due = walk_working_hours_forward(succ_start, total_dur_hours, calendar)
        return succ_start, succ_due


def compute_successor_dates(
    pred_start: Optional[date],
    pred_due: Optional[date],
    dep_type: str,
    lag_days: int,
    dur_working_days: int,
    calendar: Any,
) -> Tuple[Optional[date], Optional[date]]:
    """
    Backwards-compatible wrapper returning (start_date, due_date).
    """
    if not isinstance(calendar, WorkingCalendar):
        cal_obj = WorkingCalendar(
            holidays=calendar[0],
            off_weekdays=calendar[1],
            work_start_time=time(9, 0),
            work_end_time=time(18, 0),
            daily_working_hours=9,
        )
    else:
        cal_obj = calendar

    p_start_dt = datetime.combine(pred_start, cal_obj.work_start_time) if pred_start else None
    p_due_dt = datetime.combine(pred_due, cal_obj.work_end_time) if pred_due else None

    s_start_dt, s_due_dt = compute_successor_datetimes(
        pred_start=p_start_dt,
        pred_due=p_due_dt,
        dep_type=dep_type,
        lag_days=lag_days,
        lag_hours=0,
        dur_working_days=dur_working_days,
        dur_working_hours=0,
        calendar=cal_obj,
    )
    return (s_start_dt.date() if s_start_dt else None, s_due_dt.date() if s_due_dt else None)


def check_dependency_conflict(db: Session, task: Task) -> Optional[dict]:
    """
    Checks if a task's start date/time conflicts with any predecessor dependencies.
    Returns None if no conflict, or a dictionary describing the conflict and recommended start date/time.
    """
    if not task.start_date:
        return None

    # Parent tasks derive dates from subtask rollups; skip predecessor conflict check for parent tasks
    has_subtasks = db.query(Task).filter(
        Task.parent_task_id == task.id,
        Task.is_deleted.is_(False)
    ).count() > 0
    if has_subtasks:
        return None

    deps = db.query(TaskDependency).filter(
        TaskDependency.task_id == task.id
    ).all()

    if not deps:
        return None

    calendar = get_working_calendar(db)
    max_recommended_start: Optional[datetime] = None
    triggering_pred: Optional[Task] = None
    triggering_desc: Optional[str] = None

    dur_days = task.duration_working_days or 0
    dur_hours = task.duration_working_hours or 0
    if dur_days == 0 and dur_hours == 0:
        dur_days = 1

    task_start_t = parse_hhmm_time(task.start_time, calendar.work_start_time)
    task_start_dt = datetime.combine(task.start_date, task_start_t)

    task_due_d = task.due_date or task.start_date
    task_due_t = parse_hhmm_time(task.due_time, calendar.work_end_time)
    task_due_dt = datetime.combine(task_due_d, task_due_t)

    for dep in deps:
        pred = db.query(Task).filter(
            Task.id == dep.depends_on_task_id,
            Task.is_deleted.is_(False)
        ).first()

        if not pred or (not pred.start_date and not pred.due_date):
            continue

        p_start_d = pred.start_date or pred.due_date
        p_start_t = parse_hhmm_time(pred.start_time, calendar.work_start_time)
        p_start_dt = datetime.combine(p_start_d, p_start_t)

        p_due_d = pred.due_date or pred.start_date
        p_due_t = parse_hhmm_time(pred.due_time, calendar.work_end_time)
        p_due_dt = datetime.combine(p_due_d, p_due_t)

        dep_type_str = dep.pm_dep_type.value if hasattr(dep.pm_dep_type, 'value') else str(dep.pm_dep_type or 'FS')
        l_days = dep.lag_days or 0
        l_hours = dep.lag_hours or 0

        cand_start_dt, cand_due_dt = compute_successor_datetimes(
            p_start_dt, p_due_dt, dep_type_str, l_days, l_hours, dur_days, dur_hours, calendar
        )
        if not cand_start_dt:
            continue

        is_conflict = False
        desc = ""

        if dep_type_str == "FS":
            if task_start_dt < cand_start_dt:
                is_conflict = True
                desc = "starts before predecessor finishes"
        elif dep_type_str == "SS":
            if task_start_dt < cand_start_dt:
                is_conflict = True
                desc = "starts before predecessor starts"
        elif dep_type_str == "FF":
            if task_due_dt < cand_due_dt:
                is_conflict = True
                desc = "finishes before predecessor finishes"
        elif dep_type_str == "SF":
            if task_due_dt < cand_due_dt:
                is_conflict = True
                desc = "finishes before predecessor starts"

        if is_conflict:
            if max_recommended_start is None or cand_start_dt > max_recommended_start:
                max_recommended_start = cand_start_dt
                triggering_pred = pred
                triggering_desc = desc

    if max_recommended_start and triggering_pred:
        pred_label = triggering_pred.title or triggering_pred.task_number
        rec_date_str = max_recommended_start.date().isoformat()
        rec_time_str = max_recommended_start.strftime("%H:%M")
        return {
            "has_conflict": True,
            "conflict_message": f"⚠️ Scheduling Conflict: Task {task.task_number} {triggering_desc or 'conflicts with'} predecessor '{pred_label}'. Recommended start date is {rec_date_str} {rec_time_str}.",
            "recommended_start_date": rec_date_str,
            "recommended_start_time": rec_time_str,
            "predecessor_task_number": triggering_pred.task_number,
            "predecessor_title": triggering_pred.title,
        }

    return None


def propagate_task_schedule_changes(
    db: Session,
    changed_task_id: int,
    actor_id: Optional[int] = None,
) -> None:
    """
    Propagate schedule changes recursively downstream through dependent tasks (auto_schedule == True)
    and roll up dates bottom-up to parent tasks, milestones, and projects.
    Resolves to exact date and time.
    Does NOT commit — caller commits transaction.
    """
    calendar = get_working_calendar(db)
    queue = [changed_task_id]
    visited: Set[int] = set()

    while queue:
        curr_id = queue.pop(0)
        if curr_id in visited:
            continue
        visited.add(curr_id)

        curr_task = db.query(Task).filter(Task.id == curr_id, Task.is_deleted.is_(False)).first()
        if not curr_task:
            continue

        # Find all downstream tasks that depend on curr_id
        successor_deps = db.query(TaskDependency).filter(
            TaskDependency.depends_on_task_id == curr_id
        ).all()

        for dep in successor_deps:
            succ = db.query(Task).filter(
                Task.id == dep.task_id,
                Task.is_deleted.is_(False)
            ).first()

            if not succ:
                continue

            # Do not auto-shift already completed tasks
            if succ.is_completed:
                continue

            # Respect auto_schedule lock — if auto_schedule is OFF, do not auto-shift dates
            if not succ.auto_schedule:
                continue

            succ_dur_days = succ.duration_working_days or 0
            succ_dur_hours = succ.duration_working_hours or 0
            if succ_dur_days == 0 and succ_dur_hours == 0:
                succ_dur_days = 1

            # Evaluate ALL predecessor dependencies attached to succ to satisfy all constraints
            all_succ_deps = db.query(TaskDependency).filter(
                TaskDependency.task_id == succ.id
            ).all()

            max_req_start_dt: Optional[datetime] = None
            max_req_due_dt: Optional[datetime] = None

            for s_dep in all_succ_deps:
                p_task = db.query(Task).filter(
                    Task.id == s_dep.depends_on_task_id,
                    Task.is_deleted.is_(False)
                ).first()
                if not p_task:
                    continue

                if p_task.is_completed:
                    p_finish_d = p_task.completion_date or (p_task.completed_at.date() if p_task.completed_at else None) or p_task.due_date or p_task.start_date
                    p_finish_t = parse_hhmm_time(p_task.completion_time or p_task.due_time, calendar.work_end_time)
                else:
                    p_finish_d = p_task.due_date or p_task.start_date
                    p_finish_t = parse_hhmm_time(p_task.due_time, calendar.work_end_time)

                p_start_d = p_task.start_date or p_finish_d
                p_start_t = parse_hhmm_time(p_task.start_time, calendar.work_start_time)

                if not p_start_d and not p_finish_d:
                    continue

                p_finish_dt = datetime.combine(p_finish_d, p_finish_t)
                p_start_dt = datetime.combine(p_start_d, p_start_t)

                d_type = s_dep.pm_dep_type.value if hasattr(s_dep.pm_dep_type, 'value') else str(s_dep.pm_dep_type or 'FS')
                l_days = s_dep.lag_days or 0
                l_hours = s_dep.lag_hours or 0

                cand_start_dt, cand_due_dt = compute_successor_datetimes(
                    p_start_dt, p_finish_dt, d_type, l_days, l_hours, succ_dur_days, succ_dur_hours, calendar
                )
                if cand_start_dt:
                    if max_req_start_dt is None or cand_start_dt > max_req_start_dt:
                        max_req_start_dt = cand_start_dt
                        max_req_due_dt = cand_due_dt

            if not max_req_start_dt or not max_req_due_dt:
                continue

            new_start_d = max_req_start_dt.date()
            new_start_t = max_req_start_dt.strftime("%H:%M")
            new_due_d = max_req_due_dt.date()
            new_due_t = max_req_due_dt.strftime("%H:%M")

            if (succ.start_date != new_start_d or succ.start_time != new_start_t or
                succ.due_date != new_due_d or succ.due_time != new_due_t):
                old_start = f"{succ.start_date} {succ.start_time or ''}".strip()
                old_due = f"{succ.due_date} {succ.due_time or ''}".strip()
                new_start_str = f"{new_start_d} {new_start_t}"
                new_due_str = f"{new_due_d} {new_due_t}"

                succ.start_date = new_start_d
                succ.start_time = new_start_t
                succ.due_date = new_due_d
                succ.due_time = new_due_t
                succ.duration_working_days = succ_dur_days
                succ.duration_working_hours = succ_dur_hours
                db.add(succ)
                queue.append(succ.id)

                # Log activity audit trail
                reason = (
                    f"Schedule automatically shifted from ({old_start} - {old_due}) to "
                    f"({new_start_str} - {new_due_str}) to satisfy dependency constraints."
                )
                act = TaskActivity(
                    task_id=succ.id,
                    actor_id=actor_id,
                    action="AUTO_SCHEDULED",
                    field_name="start_date / due_date",
                    old_value=f"Start: {old_start}, Due: {old_due}",
                    new_value=f"Start: {new_start_str}, Due: {new_due_str} | {reason}",
                )
                db.add(act)

                # Trigger parent task rollup if subtask
                if succ.parent_task_id:
                    rollup_work_item(db, succ.parent_task_id)

    # Perform full bottom-up rollup from the changed task
    trigger_full_rollup(db, changed_task_id)


def auto_adjust_task_dates(db: Session, task_id: int, actor_id: Optional[int] = None) -> Task:
    """
    Auto Adjust Date action: Resolves dependency conflict on task_id by setting
    start_date and start_time to recommended values, recalculating due_date, enabling auto_schedule,
    and propagating downstream.
    """
    task = db.query(Task).filter(Task.id == task_id, Task.is_deleted.is_(False)).first()
    if not task:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Task not found")

    conflict = check_dependency_conflict(db, task)
    if not conflict or not conflict.get("recommended_start_date"):
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="No dependency conflict detected for this task."
        )

    rec_start_str = conflict["recommended_start_date"]
    rec_time_str = conflict.get("recommended_start_time", "09:00")
    new_start_d = date.fromisoformat(rec_start_str)

    calendar = get_working_calendar(db)
    dur_days = task.duration_working_days or 0
    dur_hours = task.duration_working_hours or 0
    if dur_days == 0 and dur_hours == 0:
        dur_days = 1

    total_dur_hours = dur_days * calendar.daily_working_hours + dur_hours
    start_dt = datetime.combine(new_start_d, parse_hhmm_time(rec_time_str, calendar.work_start_time))
    due_dt = walk_working_hours_forward(start_dt, total_dur_hours, calendar)

    old_start = f"{task.start_date} {task.start_time or ''}".strip()
    old_due = f"{task.due_date} {task.due_time or ''}".strip()

    task.start_date = start_dt.date()
    task.start_time = start_dt.strftime("%H:%M")
    task.due_date = due_dt.date()
    task.due_time = due_dt.strftime("%H:%M")
    task.auto_schedule = True
    db.add(task)

    # Log audit entry
    reason = f"Auto Adjust Date applied to resolve conflict with predecessor '{conflict.get('predecessor_title')}'."
    act = TaskActivity(
        task_id=task.id,
        actor_id=actor_id,
        action="AUTO_ADJUSTED",
        field_name="start_date / due_date",
        old_value=f"Start: {old_start}, Due: {old_due}",
        new_value=f"Start: {task.start_date} {task.start_time}, Due: {task.due_date} {task.due_time} | {reason}",
    )
    db.add(act)

    propagate_task_schedule_changes(db, task.id, actor_id)
    return task


def handle_parent_due_date_shift(
    db: Session,
    parent_task: Task,
    new_due_date: date,
    actor_id: Optional[int] = None,
) -> None:
    """
    When user manually shifts a parent task's due date:
    Identify subtasks, preserve subtask durations and dependency links, shift affected subtasks,
    and recalculate parent schedule.
    """
    subtasks = db.query(Task).filter(
        Task.parent_task_id == parent_task.id,
        Task.is_deleted.is_(False)
    ).all()

    if not subtasks:
        return

    calendar = get_working_calendar(db)

    # Find the current latest subtask due date
    sub_due_dates = [s.due_date for s in subtasks if s.due_date]
    if not sub_due_dates:
        return

    latest_sub_due = max(sub_due_dates)
    if latest_sub_due == new_due_date:
        return

    # Calculate working day shift
    if new_due_date > latest_sub_due:
        days_shift = count_working_days(latest_sub_due, new_due_date, calendar) - 1
    else:
        days_shift = -(count_working_days(new_due_date, latest_sub_due, calendar) - 1)

    if days_shift == 0:
        return

    for sub in subtasks:
        if sub.due_date:
            dur = sub.duration_working_days or 1
            if days_shift > 0:
                sub.due_date = add_working_days(sub.due_date, days_shift, calendar)
            else:
                sub.due_date = subtract_working_days(sub.due_date, abs(days_shift), calendar)

            if sub.start_date:
                sub.start_date = subtract_working_days(sub.due_date, dur - 1, calendar)

            db.add(sub)
            propagate_task_schedule_changes(db, sub.id, actor_id)
