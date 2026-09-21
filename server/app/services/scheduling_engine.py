"""
Automatic Task Scheduling Engine & Dependency Propagation Service
===================================================================
Professional, calendar-aware task scheduling engine for ORBX Project & Task Management.

Handles:
- Working calendar date arithmetic (working days, weekly off days, holidays).
- Bi-directional Duration ↔ Start/Due Date calculation.
- Dependency scheduling (FS, SS, FF, SF + lag).
- Recursive downstream dependency chain propagation.
- Parent task rollup & parent due date manual shift propagation.
- Auto Schedule lock (auto_schedule ON/OFF).
- Dependency conflict detection & one-click auto-adjustment.
- Circular dependency prevention with exact error messaging.
- Task activity audit logging for all auto-scheduled date shifts.
"""

from datetime import date, timedelta
from typing import Dict, List, Optional, Set, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status as http_status

from app.models.projects import Task, TaskDependency, TaskActivity, PMDepType, DependencyType
from app.services.calendar_service import (
    get_working_calendar,
    is_working_day,
    next_working_day,
    add_working_days,
    subtract_working_days,
    count_working_days,
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


def compute_successor_dates(
    pred_start: Optional[date],
    pred_due: Optional[date],
    dep_type: str,
    lag_days: int,
    dur_working_days: int,
    calendar: Tuple[Set[date], Set[int]],
) -> Tuple[Optional[date], Optional[date]]:
    """
    Compute required successor start_date and due_date based on predecessor dates,
    dependency type (FS/SS/FF/SF), lag days, and successor duration.
    """
    if not pred_due and not pred_start:
        return None, None

    p_start = pred_start or pred_due
    p_due = pred_due or pred_start
    dur = max(1, dur_working_days or 1)

    if dep_type == "FS":
        # Finish-to-Start: successor starts lag days after predecessor finish date
        succ_start = add_working_days(p_due, lag_days, calendar)
        succ_due = add_working_days(succ_start, dur - 1, calendar)
        return succ_start, succ_due

    elif dep_type == "SS":
        # Start-to-Start: successor starts lag days after predecessor start date
        succ_start = add_working_days(p_start, lag_days, calendar)
        succ_due = add_working_days(succ_start, dur - 1, calendar)
        return succ_start, succ_due

    elif dep_type == "FF":
        # Finish-to-Finish: successor finishes lag days after predecessor finish date
        succ_due = add_working_days(p_due, lag_days, calendar)
        succ_start = subtract_working_days(succ_due, dur - 1, calendar)
        return succ_start, succ_due

    elif dep_type == "SF":
        # Start-to-Finish: successor finishes lag days after predecessor start date
        succ_due = add_working_days(p_start, lag_days, calendar)
        succ_start = subtract_working_days(succ_due, dur - 1, calendar)
        return succ_start, succ_due

    else:
        # Default FS
        succ_start = add_working_days(p_due, lag_days, calendar)
        succ_due = add_working_days(succ_start, dur - 1, calendar)
        return succ_start, succ_due


def check_dependency_conflict(db: Session, task: Task) -> Optional[dict]:
    """
    Checks if a task's start_date conflicts with any predecessor dependencies.
    Returns None if no conflict, or a dictionary describing the conflict and recommended start date.
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
    max_recommended_start: Optional[date] = None
    triggering_pred: Optional[Task] = None
    triggering_desc: Optional[str] = None
    dur = max(1, task.duration_working_days or 1)

    for dep in deps:
        pred = db.query(Task).filter(
            Task.id == dep.depends_on_task_id,
            Task.is_deleted.is_(False)
        ).first()

        if not pred or (not pred.start_date and not pred.due_date):
            continue

        p_start = pred.start_date or pred.due_date
        p_due = pred.due_date or pred.start_date
        dep_type_str = dep.pm_dep_type.value if hasattr(dep.pm_dep_type, 'value') else str(dep.pm_dep_type or 'FS')
        lag = dep.lag_days or 0

        is_conflict = False
        desc = ""
        rec_start: Optional[date] = None

        if dep_type_str == "FS":
            min_start = add_working_days(p_due, 1 + lag, calendar)
            if task.start_date < min_start:
                is_conflict = True
                desc = "starts before predecessor finishes"
                rec_start = min_start

        elif dep_type_str == "SS":
            min_start = add_working_days(p_start, lag, calendar)
            if task.start_date < min_start:
                is_conflict = True
                desc = "starts before predecessor starts"
                rec_start = min_start

        elif dep_type_str == "FF":
            min_due = add_working_days(p_due, lag, calendar)
            if task.due_date and task.due_date < min_due:
                is_conflict = True
                desc = "finishes before predecessor finishes"
                rec_start = subtract_working_days(min_due, dur - 1, calendar)

        elif dep_type_str == "SF":
            min_due = add_working_days(p_start, lag, calendar)
            if task.due_date and task.due_date < min_due:
                is_conflict = True
                desc = "finishes before predecessor starts"
                rec_start = subtract_working_days(min_due, dur - 1, calendar)

        if is_conflict and rec_start:
            if max_recommended_start is None or rec_start > max_recommended_start:
                max_recommended_start = rec_start
                triggering_pred = pred
                triggering_desc = desc

    if max_recommended_start and triggering_pred:
        pred_label = triggering_pred.title or triggering_pred.task_number
        return {
            "has_conflict": True,
            "conflict_message": f"⚠️ Scheduling Conflict: Task {task.task_number} {triggering_desc or 'conflicts with'} predecessor '{pred_label}'.",
            "recommended_start_date": max_recommended_start.isoformat(),
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

            succ_dur = max(1, succ.duration_working_days or 1)

            # Evaluate ALL predecessor dependencies attached to succ to satisfy all constraints
            all_succ_deps = db.query(TaskDependency).filter(
                TaskDependency.task_id == succ.id
            ).all()

            max_req_start: Optional[date] = None
            max_req_due: Optional[date] = None

            for s_dep in all_succ_deps:
                p_task = db.query(Task).filter(
                    Task.id == s_dep.depends_on_task_id,
                    Task.is_deleted.is_(False)
                ).first()
                if not p_task:
                    continue

                if p_task.is_completed:
                    p_finish = p_task.completion_date or (p_task.completed_at.date() if p_task.completed_at else None) or p_task.due_date or p_task.start_date
                else:
                    p_finish = p_task.due_date or p_task.start_date

                p_start = p_task.start_date or p_finish
                if not p_start and not p_finish:
                    continue

                d_type = s_dep.pm_dep_type.value if hasattr(s_dep.pm_dep_type, 'value') else str(s_dep.pm_dep_type or 'FS')
                l_days = s_dep.lag_days or 0

                cand_start, cand_due = compute_successor_dates(
                    p_start, p_finish, d_type, l_days, succ_dur, calendar
                )
                if cand_start:
                    if max_req_start is None or cand_start > max_req_start:
                        max_req_start = cand_start
                        max_req_due = cand_due

            if not max_req_start or not max_req_due:
                continue

            if succ.start_date != max_req_start or succ.due_date != max_req_due:
                old_start = succ.start_date
                old_due = succ.due_date

                succ.start_date = max_req_start
                succ.due_date = max_req_due
                succ.duration_working_days = succ_dur
                db.add(succ)
                queue.append(succ.id)

                # Log activity audit trail
                reason = (
                    f"Schedule automatically shifted from ({old_start} - {old_due}) to "
                    f"({new_start} - {new_due}) to satisfy dependency constraints."
                )
                act = TaskActivity(
                    task_id=succ.id,
                    actor_id=actor_id,
                    action="AUTO_SCHEDULED",
                    field_name="start_date / due_date",
                    old_value=f"Start: {old_start}, Due: {old_due}",
                    new_value=f"Start: {new_start}, Due: {new_due} | {reason}",
                )
                db.add(act)

                queue.append(succ.id)

                # Trigger parent task rollup if subtask
                if succ.parent_task_id:
                    rollup_work_item(db, succ.parent_task_id)

    # Perform full bottom-up rollup from the changed task
    trigger_full_rollup(db, changed_task_id)


def auto_adjust_task_dates(db: Session, task_id: int, actor_id: Optional[int] = None) -> Task:
    """
    Auto Adjust Date action: Resolves dependency conflict on task_id by setting
    start_date to recommended_start_date, recalculating due_date, enabling auto_schedule,
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
    new_start = date.fromisoformat(rec_start_str)

    calendar = get_working_calendar(db)
    dur = task.duration_working_days or 1

    old_start = task.start_date
    old_due = task.due_date

    task.start_date = new_start
    task.due_date = add_working_days(new_start, dur - 1, calendar)
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
        new_value=f"Start: {new_start}, Due: {task.due_date} | {reason}",
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
