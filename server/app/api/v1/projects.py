from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.projects import (
    Project, Task, ProjectMilestone, TaskStatusDef,
    ProjectCustomFieldDefinition, ProjectCustomFieldValue,
    TaskCustomFieldDefinition, TaskCustomFieldValue,
)
from app.models.user import User
from app.schemas.projects import (
    ProjectCreate,
    ProjectOut,
    ProjectUpdate,
    ProjectMilestoneCreate,
    ProjectMilestoneOut,
    CustomFieldDefinitionCreate,
    CustomFieldDefinitionUpdate,
    CustomFieldDefinitionOut,
    StatusDefinitionCreate,
    StatusDefinitionUpdate,
    StatusDefinitionOut,
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
        pass # To filter by status name, we need to join ProjectStatusDef. Skipping for now.
    if lead_id:
        query = query.filter(Project.lead_id == lead_id)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(Project.name.ilike(like) | Project.code.ilike(like))

    projects = query.order_by(Project.created_at.desc()).all()
    results = []
    for p in projects:
        total_tasks = db.query(Task).filter(Task.project_id == p.id).count()
        done_tasks = db.query(Task).join(TaskStatusDef, Task.status_id == TaskStatusDef.id).filter(
            Task.project_id == p.id,
            TaskStatusDef.is_terminal == True
        ).count()

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
    done_tasks = db.query(Task).join(TaskStatusDef, Task.status_id == TaskStatusDef.id).filter(
        Task.project_id == project.id, TaskStatusDef.is_terminal == True
    ).count()

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
    done_tasks = db.query(Task).join(TaskStatusDef, Task.status_id == TaskStatusDef.id).filter(
        Task.project_id == project.id, TaskStatusDef.is_terminal == True
    ).count()

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


# --- Custom Field Definitions API ---
@router.get("/custom-fields/definitions", response_model=List[CustomFieldDefinitionOut])
def get_project_custom_field_definitions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List custom field definitions for projects"""
    return db.query(ProjectCustomFieldDefinition).order_by(ProjectCustomFieldDefinition.display_order).all()


@router.post("/custom-fields/definitions", response_model=CustomFieldDefinitionOut, status_code=status.HTTP_201_CREATED)
def create_project_custom_field_definition(
    data: CustomFieldDefinitionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new custom field definition for projects"""
    field_def = ProjectCustomFieldDefinition(**data.model_dump())
    db.add(field_def)
    db.commit()
    db.refresh(field_def)
    return field_def


@router.get("/tasks/custom-fields/definitions", response_model=List[CustomFieldDefinitionOut])
def get_task_custom_field_definitions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List custom field definitions for tasks"""
    return db.query(TaskCustomFieldDefinition).order_by(TaskCustomFieldDefinition.display_order).all()


@router.post("/tasks/custom-fields/definitions", response_model=CustomFieldDefinitionOut, status_code=status.HTTP_201_CREATED)
def create_task_custom_field_definition(
    data: CustomFieldDefinitionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new custom field definition for tasks"""
    field_def = TaskCustomFieldDefinition(**data.model_dump())
    db.add(field_def)
    db.commit()
    db.refresh(field_def)
    return field_def


@router.put("/tasks/custom-fields/definitions/{field_id}", response_model=CustomFieldDefinitionOut)
def update_task_custom_field_definition(
    field_id: int,
    data: CustomFieldDefinitionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a custom field definition"""
    field_def = db.query(TaskCustomFieldDefinition).filter(TaskCustomFieldDefinition.id == field_id).first()
    if not field_def:
        raise HTTPException(status_code=404, detail="Custom field definition not found")
    update_dict = data.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(field_def, k, v)
    db.commit()
    db.refresh(field_def)
    return field_def


@router.delete("/tasks/custom-fields/definitions/{field_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task_custom_field_definition(
    field_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a custom field definition"""
    field_def = db.query(TaskCustomFieldDefinition).filter(TaskCustomFieldDefinition.id == field_id).first()
    if not field_def:
        raise HTTPException(status_code=404, detail="Custom field definition not found")
    db.delete(field_def)
    db.commit()
    return None


# --- Workflow Status Definitions API ---
@router.get("/statuses/definitions", response_model=List[StatusDefinitionOut])
def get_task_status_definitions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List workflow status definitions for tasks"""
    return db.query(TaskStatusDef).order_by(TaskStatusDef.display_order).all()


@router.post("/statuses/definitions", response_model=StatusDefinitionOut, status_code=status.HTTP_201_CREATED)
def create_task_status_definition(
    data: StatusDefinitionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new workflow status definition for tasks"""
    status_def = TaskStatusDef(**data.model_dump())
    db.add(status_def)
    db.commit()
    db.refresh(status_def)
    return status_def


@router.put("/statuses/definitions/{status_id}", response_model=StatusDefinitionOut)
def update_task_status_definition(
    status_id: int,
    data: StatusDefinitionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a workflow status definition"""
    status_def = db.query(TaskStatusDef).filter(TaskStatusDef.id == status_id).first()
    if not status_def:
        raise HTTPException(status_code=404, detail="Status definition not found")
    update_dict = data.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(status_def, k, v)
    db.commit()
    db.refresh(status_def)
    return status_def


@router.delete("/statuses/definitions/{status_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task_status_definition(
    status_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a status definition with data integrity protection"""
    status_def = db.query(TaskStatusDef).filter(TaskStatusDef.id == status_id).first()
    if not status_def:
        raise HTTPException(status_code=404, detail="Status definition not found")

    tasks_count = db.query(Task).filter(Task.status_id == status_id).count()
    if tasks_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete status '{status_def.name}' because it is currently assigned to {tasks_count} task(s). Please reassign those tasks before deleting.",
        )

    db.delete(status_def)
    db.commit()
    return None



