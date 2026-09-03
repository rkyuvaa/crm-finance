from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.projects import Project, Task, TaskStatus, ProjectMilestone
from app.models.user import User
from app.schemas.projects import (
    ProjectCreate,
    ProjectOut,
    ProjectUpdate,
    ProjectMilestoneCreate,
    ProjectMilestoneOut,
)
from app.core.deps import get_current_user

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=List[ProjectOut])
def list_projects(
    status: Optional[str] = None,
    lead_id: Optional[int] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all projects with optional filtering"""
    query = db.query(Project)
    if status:
        query = query.filter(Project.status == status.upper())
    if lead_id:
        query = query.filter(Project.lead_id == lead_id)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(Project.name.ilike(like) | Project.code.ilike(like))

    projects = query.order_by(Project.created_at.desc()).all()
    results = []
    for p in projects:
        total_tasks = db.query(Task).filter(Task.project_id == p.id).count()
        done_tasks = db.query(Task).filter(Task.project_id == p.id, Task.status == TaskStatus.DONE).count()

        p_out = ProjectOut.model_validate(p)
        p_out.owner_name = p.owner.full_name if p.owner else None
        p_out.lead_app_no = p.lead.app_no if p.lead else None
        p_out.lead_customer_name = p.lead.customer_name if p.lead else None
        p_out.tasks_count = {"total": total_tasks, "done": done_tasks}
        results.append(p_out)

    return results


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new project master record"""
    project = Project(**data.model_dump())
    if not project.owner_id:
        project.owner_id = current_user.id
    db.add(project)
    db.commit()
    db.refresh(project)

    p_out = ProjectOut.model_validate(project)
    p_out.owner_name = project.owner.full_name if project.owner else None
    p_out.lead_app_no = project.lead.app_no if project.lead else None
    p_out.lead_customer_name = project.lead.customer_name if project.lead else None
    p_out.tasks_count = {"total": 0, "done": 0}
    return p_out


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get project details by ID"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    total_tasks = db.query(Task).filter(Task.project_id == project.id).count()
    done_tasks = db.query(Task).filter(Task.project_id == project.id, Task.status == TaskStatus.DONE).count()

    p_out = ProjectOut.model_validate(project)
    p_out.owner_name = project.owner.full_name if project.owner else None
    p_out.lead_app_no = project.lead.app_no if project.lead else None
    p_out.lead_customer_name = project.lead.customer_name if project.lead else None
    p_out.tasks_count = {"total": total_tasks, "done": done_tasks}
    return p_out


@router.put("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int,
    data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update project details"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    update_dict = data.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(project, field, val)

    db.commit()
    db.refresh(project)

    total_tasks = db.query(Task).filter(Task.project_id == project.id).count()
    done_tasks = db.query(Task).filter(Task.project_id == project.id, Task.status == TaskStatus.DONE).count()

    p_out = ProjectOut.model_validate(project)
    p_out.owner_name = project.owner.full_name if project.owner else None
    p_out.lead_app_no = project.lead.app_no if project.lead else None
    p_out.lead_customer_name = project.lead.customer_name if project.lead else None
    p_out.tasks_count = {"total": total_tasks, "done": done_tasks}
    return p_out


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a project record"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
    return None
