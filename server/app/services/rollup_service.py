"""
Rollup Service
==============
Recursively computes rolled-up dates and costs bottom-up through the
Sub-task → Task → Task List → Milestone → Project hierarchy.

Rules:
- Task List:
  - Start    = MIN(direct_child_tasks.start_datetime)
  - End      = MAX(direct_child_tasks.due_datetime)
  - Duration = End - Start (working hours / days using calendar_service)
- Milestone:
  - Start    = MIN(tasks.start_date)
  - End      = MAX(tasks.due_date)
  - estimated_cost = SUM(tasks.estimated_cost)
  - actual_cost    = SUM(tasks.actual_cost)
  - duration at milestone = calendar days (end - start + 1)
- Project:
  - Aggregates from all milestones
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.models.projects import Task, ProjectMilestone, ProjectTaskList, Project


def get_all_descendants(db: Session, parent_id: int) -> list[Task]:
    res = []
    children = db.query(Task).filter(Task.parent_task_id == parent_id, Task.is_deleted.is_(False)).all()
    for c in children:
        res.append(c)
        res.extend(get_all_descendants(db, c.id))
    return res


def rollup_task_list(db: Session, task_list_id: int) -> None:
    """
    Automatically calculates read-only fields for a Task List from its direct child tasks:
    - Start: Earliest start datetime among direct child tasks (MIN).
    - End: Latest end datetime among direct child tasks (MAX).
    - Duration: End - Start, calculated using existing duration units and date-time calculation logic
      (calendar_service count_working_hours).
    Does NOT commit — caller is responsible for commit.
    """
    task_list = db.query(ProjectTaskList).filter(ProjectTaskList.id == task_list_id).first()
    if not task_list:
        return

    # Direct child tasks inside that Task List
    tasks = db.query(Task).filter(
        Task.task_list_id == task_list_id,
        Task.is_deleted.is_(False)
    ).all()

    if not tasks:
        task_list.start_date = None
        task_list.start_time = None
        task_list.end_date = None
        task_list.end_time = None
        task_list.duration_working_days = None
        task_list.duration_working_hours = None
    else:
        from app.services.calendar_service import get_working_calendar, count_working_hours, parse_hhmm_time
        cal = get_working_calendar(db)

        start_dts = []
        end_dts = []

        for t in tasks:
            if t.start_date:
                s_time = parse_hhmm_time(t.start_time, cal.work_start_time)
                start_dts.append(datetime.combine(t.start_date, s_time))
            if t.due_date:
                d_time = parse_hhmm_time(t.due_time, cal.work_end_time)
                end_dts.append(datetime.combine(t.due_date, d_time))

        earliest_start = min(start_dts) if start_dts else None
        latest_end = max(end_dts) if end_dts else None

        if earliest_start:
            task_list.start_date = earliest_start.date()
            task_list.start_time = earliest_start.strftime("%H:%M")
        else:
            task_list.start_date = None
            task_list.start_time = None

        if latest_end:
            task_list.end_date = latest_end.date()
            task_list.end_time = latest_end.strftime("%H:%M")
        else:
            task_list.end_date = None
            task_list.end_time = None

        if earliest_start and latest_end:
            if earliest_start <= latest_end:
                w_days, w_hours = count_working_hours(earliest_start, latest_end, cal)
                task_list.duration_working_days = w_days
                task_list.duration_working_hours = w_hours
            else:
                task_list.duration_working_days = 0
                task_list.duration_working_hours = 0
        else:
            task_list.duration_working_days = None
            task_list.duration_working_hours = None

    db.add(task_list)

    # Recurse up to milestone
    if task_list.milestone_id:
        rollup_milestone(db, task_list.milestone_id)


def rollup_work_item(db: Session, task_id: int) -> None:
    """
    If task has children: recompute its start_date, due_date, estimated_cost, actual_cost.
    Then recurse up to its parent (if any), then to task list / milestone / project.
    Does NOT commit — caller is responsible for commit.
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        return

    children = db.query(Task).filter(
        Task.parent_task_id == task_id,
        Task.is_deleted.is_(False)
    ).all()

    if children:
        descendants = get_all_descendants(db, task_id)
        if descendants and all(d.is_completed for d in descendants):
            dates = []
            for d in descendants:
                dt = d.completion_date or (d.completed_at.date() if d.completed_at else None) or d.due_date
                if dt:
                    dates.append(dt)
            if dates:
                task.due_date = max(dates)
        else:
            end_dates = [c.due_date for c in children if c.due_date]
            if end_dates:
                task.due_date = max(end_dates)

        start_dates = [c.start_date for c in children if c.start_date]
        if start_dates:
            task.start_date = min(start_dates)

        task.estimated_cost = sum(c.estimated_cost or 0.0 for c in children)
        task.actual_cost = sum(c.actual_cost or 0.0 for c in children)

        # Parent duration is a read-only calendar-day span for display only.
        task.duration_working_days = None
        task.duration_working_hours = None

        db.add(task)

    # Recurse up the chain
    if task.parent_task_id:
        rollup_work_item(db, task.parent_task_id)
    else:
        if task.task_list_id:
            rollup_task_list(db, task.task_list_id)
        elif task.milestone_id:
            rollup_milestone(db, task.milestone_id)
        elif task.project_id:
            rollup_project(db, task.project_id)


def rollup_milestone(db: Session, milestone_id: int) -> None:
    """
    Aggregate from all direct tasks (top-level, parent_task_id IS NULL) under this milestone,
    including tasks grouped inside Task Lists belonging to this milestone.
    Updates rollup_start_date, rollup_end_date, rollup_estimated_cost, rollup_actual_cost,
    rollup_duration_days. Does NOT commit.
    """
    milestone = db.query(ProjectMilestone).filter(ProjectMilestone.id == milestone_id).first()
    if not milestone:
        return

    # Top-level tasks under this milestone (not sub-tasks)
    tasks = db.query(Task).filter(
        or_(
            Task.milestone_id == milestone_id,
            Task.task_list_id.in_(
                db.query(ProjectTaskList.id).filter(ProjectTaskList.milestone_id == milestone_id)
            )
        ),
        Task.parent_task_id.is_(None),
        Task.is_deleted.is_(False)
    ).all()

    if not tasks:
        milestone.rollup_start_date = None
        milestone.rollup_end_date = None
        milestone.rollup_estimated_cost = 0.0
        milestone.rollup_actual_cost = 0.0
        milestone.rollup_duration_days = None
    else:
        start_dates = [t.start_date for t in tasks if t.start_date]
        end_dates = [t.due_date for t in tasks if t.due_date]

        milestone.rollup_start_date = min(start_dates) if start_dates else None
        milestone.rollup_end_date = max(end_dates) if end_dates else None
        milestone.rollup_estimated_cost = sum(t.estimated_cost or 0.0 for t in tasks)
        milestone.rollup_actual_cost = sum(t.actual_cost or 0.0 for t in tasks)

        if milestone.rollup_start_date and milestone.rollup_end_date:
            milestone.rollup_duration_days = (
                milestone.rollup_end_date - milestone.rollup_start_date
            ).days + 1
        else:
            milestone.rollup_duration_days = None

    db.add(milestone)

    # Propagate up to project
    if milestone.project_id:
        rollup_project(db, milestone.project_id)


def rollup_project(db: Session, project_id: int) -> None:
    """
    Aggregate from all milestones under this project.
    Updates rollup_start_date, rollup_end_date, estimated_cost, actual_cost on the Project.
    Does NOT commit.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return

    milestones = db.query(ProjectMilestone).filter(
        ProjectMilestone.project_id == project_id
    ).all()

    if not milestones:
        project.rollup_start_date = None
        project.rollup_end_date = None
        project.estimated_cost = 0.0
        project.actual_cost = 0.0
    else:
        start_dates = [m.rollup_start_date for m in milestones if m.rollup_start_date]
        end_dates = [m.rollup_end_date for m in milestones if m.rollup_end_date]

        project.rollup_start_date = min(start_dates) if start_dates else None
        project.rollup_end_date = max(end_dates) if end_dates else None
        project.estimated_cost = sum(m.rollup_estimated_cost or 0.0 for m in milestones)
        project.actual_cost = sum(m.rollup_actual_cost or 0.0 for m in milestones)

    db.add(project)


def trigger_full_rollup(db: Session, task_id: int) -> None:
    """
    Entry point: given a changed task, walk up the full chain and recompute everything.
    Does NOT commit — caller commits.
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        return

    # Start rollup from the task's root ancestor in the parent chain
    root_id = task_id
    visited: set = set()
    curr_id: Optional[int] = task.parent_task_id
    while curr_id and curr_id not in visited:
        visited.add(curr_id)
        root_id = curr_id
        parent = db.query(Task).filter(Task.id == curr_id).first()
        if not parent:
            break
        curr_id = parent.parent_task_id

    rollup_work_item(db, root_id)

    # In case task has task_list_id and wasn't reached by parent chain
    if task.task_list_id:
        rollup_task_list(db, task.task_list_id)

