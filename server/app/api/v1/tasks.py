from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.projects import (
    Task, TaskStatusDef, TaskPriority, TaskSubtask, TaskTimeLog, TaskComment,
    TaskAttachment, TaskCustomFieldDefinition, TaskCustomFieldValue, Project
)
from app.models.user import User
from app.schemas.projects import (
    TaskCreate,
    TaskOut,
    TaskUpdate,
    TaskSubtaskCreate,
    TaskSubtaskOut,
    TaskTimeLogCreate,
    TaskTimeLogOut,
    TaskCommentCreate,
    TaskCommentOut,
    TaskAttachmentCreate,
    TaskAttachmentOut,
    CustomFieldValueCreate,
    CustomFieldValueOut,
)
from app.core.deps import get_current_user

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _format_task_out(t: Task) -> TaskOut:
    out = TaskOut.model_validate(t)
    out.project_name = t.project.name if t.project else None
    out.assignee_name = t.assignee.full_name if t.assignee else None
    out.subtasks = [TaskSubtaskOut.model_validate(st) for st in t.subtasks]
    return out


@router.get("", response_model=List[TaskOut])
def list_tasks(
    project_id: Optional[int] = None,
    status_id: Optional[int] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assignee_id: Optional[int] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all tasks with optional filtering"""
    query = db.query(Task)
    if project_id:
        query = query.filter(Task.project_id == project_id)
    if status_id:
        query = query.filter(Task.status_id == status_id)
    if priority:
        query = query.filter(Task.priority == priority.upper())
    if assignee_id:
        query = query.filter(Task.assignee_id == assignee_id)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(Task.title.ilike(like) | Task.description.ilike(like))

    tasks = query.order_by(Task.created_at.desc()).all()
    return [_format_task_out(t) for t in tasks]


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new task"""
    task = Task(**data.model_dump())
    if not task.assignee_id:
        task.assignee_id = current_user.id
    if not task.status_id:
        first_status = db.query(TaskStatusDef).order_by(TaskStatusDef.display_order).first()
        if first_status:
            task.status_id = first_status.id
    db.add(task)
    db.commit()
    db.refresh(task)
    return _format_task_out(task)


@router.get("/{task_id}", response_model=TaskOut)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get task details by ID"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return _format_task_out(task)


@router.put("/{task_id}", response_model=TaskOut)
def update_task(
    task_id: int,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update task details / status transition"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_dict = data.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(task, field, val)

    db.commit()
    db.refresh(task)
    return _format_task_out(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a task"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return None


@router.post("/{task_id}/subtasks", response_model=TaskSubtaskOut, status_code=status.HTTP_201_CREATED)
def add_subtask(
    task_id: int,
    data: TaskSubtaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a subtask / checklist item to a task"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    subtask = TaskSubtask(task_id=task.id, **data.model_dump())
    db.add(subtask)
    db.commit()
    db.refresh(subtask)
    return TaskSubtaskOut.model_validate(subtask)


@router.put("/subtasks/{subtask_id}/toggle", response_model=TaskSubtaskOut)
def toggle_subtask(
    subtask_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Toggle completion status of a subtask"""
    subtask = db.query(TaskSubtask).filter(TaskSubtask.id == subtask_id).first()
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")

    subtask.is_completed = not subtask.is_completed
    db.commit()
    db.refresh(subtask)
    return TaskSubtaskOut.model_validate(subtask)


@router.delete("/subtasks/{subtask_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subtask(
    subtask_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a subtask"""
    subtask = db.query(TaskSubtask).filter(TaskSubtask.id == subtask_id).first()
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    db.delete(subtask)
    db.commit()
    return None


@router.post("/{task_id}/timelogs", response_model=TaskTimeLogOut, status_code=status.HTTP_201_CREATED)
def log_time(
    task_id: int,
    data: TaskTimeLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Log work hours on a task"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    log = TaskTimeLog(task_id=task.id, user_id=current_user.id, **data.model_dump())
    task.actual_hours += log.hours
    db.add(log)
    db.commit()
    db.refresh(log)

    out = TaskTimeLogOut.model_validate(log)
    out.user_name = current_user.full_name
    return out


@router.get("/{task_id}/timelogs", response_model=List[TaskTimeLogOut])
def get_task_timelogs(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List time logs for a task"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    logs = db.query(TaskTimeLog).filter(TaskTimeLog.task_id == task_id).order_by(TaskTimeLog.created_at.desc()).all()
    results = []
    for l in logs:
        out = TaskTimeLogOut.model_validate(l)
        out.user_name = l.user.full_name if l.user else None
        results.append(out)
    return results


@router.post("/{task_id}/comments", response_model=TaskCommentOut, status_code=status.HTTP_201_CREATED)
def add_task_comment(
    task_id: int,
    data: TaskCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a discussion comment on a task"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    comment = TaskComment(task_id=task.id, user_id=current_user.id, **data.model_dump())
    db.add(comment)
    db.commit()
    db.refresh(comment)

    out = TaskCommentOut.model_validate(comment)
    out.user_name = current_user.full_name
    return out


@router.get("/{task_id}/comments", response_model=List[TaskCommentOut])
def get_task_comments(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get discussion comments for a task"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    comments = db.query(TaskComment).filter(TaskComment.task_id == task_id).order_by(TaskComment.created_at.asc()).all()
    results = []
    for c in comments:
        out = TaskCommentOut.model_validate(c)
        out.user_name = c.user.full_name if c.user else None
        results.append(out)
    return results


# --- Task Attachments API ---
@router.get("/{task_id}/attachments", response_model=List[TaskAttachmentOut])
def get_task_attachments(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all file attachments for a task"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return db.query(TaskAttachment).filter(TaskAttachment.task_id == task_id).order_by(TaskAttachment.created_at.desc()).all()


@router.post("/{task_id}/attachments", response_model=TaskAttachmentOut, status_code=status.HTTP_201_CREATED)
def add_task_attachment(
    task_id: int,
    data: TaskAttachmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a file attachment record to a task"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    attachment = TaskAttachment(task_id=task.id, **data.model_dump())
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return TaskAttachmentOut.model_validate(attachment)


@router.delete("/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a task attachment"""
    attachment = db.query(TaskAttachment).filter(TaskAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    db.delete(attachment)
    db.commit()
    return None


# --- Task Custom Fields Values API ---
@router.get("/{task_id}/custom-fields", response_model=List[CustomFieldValueOut])
def get_task_custom_fields(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get custom field values for a specific task"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    values = db.query(TaskCustomFieldValue).filter(TaskCustomFieldValue.task_id == task_id).all()
    results = []
    for val in values:
        field_def = db.query(TaskCustomFieldDefinition).filter(TaskCustomFieldDefinition.id == val.field_id).first()
        out = CustomFieldValueOut(
            id=val.id,
            field_id=val.field_id,
            field_label=field_def.label if field_def else f"Field {val.field_id}",
            value=val.value
        )
        results.append(out)
    return results


@router.post("/{task_id}/custom-fields", response_model=CustomFieldValueOut)
def save_task_custom_field(
    task_id: int,
    data: CustomFieldValueCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Set or update a custom field value for a task"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    field_def = db.query(TaskCustomFieldDefinition).filter(TaskCustomFieldDefinition.id == data.field_id).first()
    if not field_def:
        raise HTTPException(status_code=404, detail="Custom field definition not found")

    val = db.query(TaskCustomFieldValue).filter(
        TaskCustomFieldValue.task_id == task_id,
        TaskCustomFieldValue.field_id == data.field_id
    ).first()

    if val:
        val.value = data.value
    else:
        val = TaskCustomFieldValue(task_id=task_id, field_id=data.field_id, value=data.value)
        db.add(val)

    db.commit()
    db.refresh(val)
    return CustomFieldValueOut(
        id=val.id,
        field_id=val.field_id,
        field_label=field_def.label,
        value=val.value
    )

