"""
Rollup Service
==============
Recursively computes rolled-up dates and costs bottom-up through the
Sub-task → Task → Milestone → Project hierarchy.

Rules:
- Start = MIN(children.start_date)
- End   = MAX(children.due_date)   [due_date IS the end_date in the DB]
- estimated_cost = SUM(children.estimated_cost)
- actual_cost    = SUM(children.actual_cost)
- duration at parent = calendar days (end - start + 1), NOT sum of children durations
"""
from typing import Optional
from sqlalchemy.orm import Session
from app.models.projects import Task, ProjectMilestone, Project


def rollup_work_item(db: Session, task_id: int) -> None:
    """
    If task has children: recompute its start_date, due_date, estimated_cost, actual_cost.
    Then recurse up to its parent (if any), then to milestone, then to project.
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
        start_dates = [c.start_date for c in children if c.start_date]
        end_dates = [c.due_date for c in children if c.due_date]

        task.start_date = min(start_dates) if start_dates else None
        task.due_date = max(end_dates) if end_dates else None
        task.estimated_cost = sum(c.estimated_cost or 0.0 for c in children)
        task.actual_cost = sum(c.actual_cost or 0.0 for c in children)

        # parent duration = calendar days (read-only span, not working-day count)
        if task.start_date and task.due_date:
            task.duration_working_days = (task.due_date - task.start_date).days + 1
        else:
            task.duration_working_days = None

        db.add(task)

    # Recurse up the chain
    if task.parent_task_id:
        rollup_work_item(db, task.parent_task_id)
    elif task.milestone_id:
        rollup_milestone(db, task.milestone_id)
    elif task.project_id:
        rollup_project(db, task.project_id)


def rollup_milestone(db: Session, milestone_id: int) -> None:
    """
    Aggregate from all direct tasks (top-level, parent_task_id IS NULL) under this milestone.
    Updates rollup_start_date, rollup_end_date, rollup_estimated_cost, rollup_actual_cost,
    rollup_duration_days. Does NOT commit.
    """
    milestone = db.query(ProjectMilestone).filter(ProjectMilestone.id == milestone_id).first()
    if not milestone:
        return

    # Top-level tasks under this milestone (not sub-tasks)
    tasks = db.query(Task).filter(
        Task.milestone_id == milestone_id,
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
