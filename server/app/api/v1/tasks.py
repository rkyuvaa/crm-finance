import os
import re
import uuid
from datetime import datetime, timezone, date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File, Form, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_

from app.db.session import get_db
from app.models.projects import (
    Task, TaskStatusDef, TaskPriority, TaskStatusCategory, TaskSubtask, TaskTimeLog, TaskComment,
    TaskAttachment, TaskCustomFieldDefinition, TaskCustomFieldValue, Project, ProjectPhase,
    TaskAssignee, TaskFollower, TaskTag, TaskTagMap, TaskChecklist, TaskChecklistItem,
    TaskTimeEntry, TaskDependency, TaskRelationship, TaskActivity, TaskTemplate, TaskAutomationRule,
    DependencyType, RelationshipType
)
from app.models.cost_center import CostCenter
from app.models.branch import Branch
from app.models.rbac import Department
from app.models.user import User
from app.models.notification import Notification
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
    TaskAssigneeOut,
    TaskFollowerOut,
    TaskChecklistCreate,
    TaskChecklistOut,
    TaskChecklistItemCreate,
    TaskChecklistItemOut,
    TaskTimeEntryCreate,
    TaskTimeEntryOut,
    TaskDependencyCreate,
    TaskDependencyOut,
    TaskRelationshipCreate,
    TaskRelationshipOut,
    TaskActivityOut,
    BulkTaskActionRequest,
    BulkTaskActionResponse,
    TaskTemplateCreate,
    TaskTemplateOut,
    TaskTagOut,
    UserBriefOut,
    TaskConvertRequest,
    TaskReorderRequest,
    RescheduleDependenciesRequest,
)
from app.core.deps import get_current_user

router = APIRouter(prefix="/tasks", tags=["tasks"])

UPLOAD_DIR = os.path.join(os.getcwd(), "uploads", "tasks")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# --- Helper Utilities ---

def _generate_task_number(db: Session, project_id: Optional[int] = None) -> str:
    """Generate server-side unique human-readable task number e.g. TASK-000001 or PRJ-2026-0001"""
    if project_id:
        proj = db.get(Project, project_id)
        if proj and proj.code:
            prefix = f"{proj.code.upper()}"
            max_num = db.query(func.count(Task.id)).filter(Task.project_id == project_id).scalar() or 0
            return f"{prefix}-TASK-{max_num + 1:04d}"
    
    total = db.query(func.count(Task.id)).scalar() or 0
    num = total + 1
    while db.query(Task).filter(Task.task_number == f"TASK-{num:06d}").first():
        num += 1
    return f"TASK-{num:06d}"


def _get_task_depth(db: Session, parent_task_id: Optional[int]) -> int:
    """Calculate subtask nesting level depth"""
    depth = 1
    curr_id = parent_task_id
    visited = set()
    while curr_id:
        if curr_id in visited:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Circular parent relationship detected"
            )
        visited.add(curr_id)
        parent = db.get(Task, curr_id)
        if not parent:
            break
        depth += 1
        curr_id = parent.parent_task_id
        if depth > 10:
            break
    return depth


def _detect_circular_dependency(db: Session, task_id: int, target_task_id: int):
    """Detect if task_id depending on target_task_id causes a cycle"""
    if task_id == target_task_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A task cannot depend on itself"
        )
    
    # Check if target_task_id already directly or indirectly depends on task_id
    queue = [task_id]
    visited = set()
    while queue:
        curr = queue.pop(0)
        if curr in visited:
            continue
        visited.add(curr)
        if curr == target_task_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Circular task dependency detected"
            )
        # find tasks that depend on curr
        deps = db.query(TaskDependency).filter(TaskDependency.depends_on_task_id == curr).all()
        for d in deps:
            queue.append(d.task_id)


def _log_activity(db: Session, task_id: int, actor_id: Optional[int], action: str, field_name: Optional[str] = None, old_val: Optional[str] = None, new_val: Optional[str] = None):
    act = TaskActivity(
        task_id=task_id,
        actor_id=actor_id,
        action=action,
        field_name=field_name,
        old_value=str(old_val) if old_val is not None else None,
        new_value=str(new_val) if new_val is not None else None,
    )
    db.add(act)


def _parse_and_notify_mentions(db: Session, content: str, task: Task, actor: User):
    """Parse @mentions in text and create notifications"""
    usernames = re.findall(r'@([a-zA-Z0-9_\.\-]+)', content)
    notify_user_ids = set()

    for un in usernames:
        if un.lower() == 'assignee' and task.assignee_id:
            notify_user_ids.add(task.assignee_id)
        elif un.lower() == 'followers':
            for f in task.followers:
                notify_user_ids.add(f.user_id)
        else:
            u = db.query(User).filter(or_(User.username == un, User.email == un)).first()
            if u:
                notify_user_ids.add(u.id)

    # Remove self
    notify_user_ids.discard(actor.id)

    for uid in notify_user_ids:
        msg = f"{actor.full_name} mentioned you in task {task.task_number}: {task.title}"
        db.add(Notification(user_id=uid, message=msg))


def _update_parent_progress(db: Session, parent_id: Optional[int]):
    """Automatically calculate parent task progress percentage based on subtasks"""
    if not parent_id:
        return
    parent = db.get(Task, parent_id)
    if not parent:
        return

    subtasks = db.query(Task).filter(Task.parent_task_id == parent_id, Task.is_deleted.is_(False)).all()
    if not subtasks:
        return

    completed_count = sum(1 for st in subtasks if st.is_completed)
    total_count = len(subtasks)
    parent.progress_percentage = round((completed_count / total_count) * 100.0, 2)
    db.add(parent)
    
    # Recurse up if parent also has a parent
    if parent.parent_task_id:
        _update_parent_progress(db, parent.parent_task_id)


def _format_task_out(t: Task, db: Session) -> TaskOut:
    out = TaskOut.model_validate(t)
    out.project_name = t.project.name if t.project else None
    out.assignee_name = t.assignee.full_name if t.assignee else None
    out.status_name = t.status_def.name if t.status_def else None
    out.status_color = t.status_def.color if t.status_def else "#E2E8F0"
    out.status_category = t.status_def.category.value if t.status_def and t.status_def.category else "ACTIVE"

    out.cost_center_code = t.cost_center.code if t.cost_center else None
    out.cost_center_name = t.cost_center.name if t.cost_center else None
    out.department_name = t.department.name if t.department else None

    out.assignees = [
        TaskAssigneeOut(
            id=a.id,
            task_id=a.task_id,
            user_id=a.user_id,
            assigned_at=a.assigned_at,
            user=UserBriefOut.model_validate(a.user) if a.user else None
        ) for a in t.assignees
    ]

    out.followers = [
        TaskFollowerOut(
            id=f.id,
            task_id=f.task_id,
            user_id=f.user_id,
            created_at=f.created_at,
            user=UserBriefOut.model_validate(f.user) if f.user else None
        ) for f in t.followers
    ]

    out.tags_list = [
        TaskTagOut(
            id=m.tag.id,
            name=m.tag.name,
            color=m.tag.color,
            created_at=m.tag.created_at
        ) for m in t.tag_mappings if m.tag
    ]

    out.checklists = []
    for c in t.checklists:
        c_items = []
        comp_cnt = 0
        for item in c.items:
            if item.is_completed:
                comp_cnt += 1
            c_items.append(TaskChecklistItemOut(
                id=item.id,
                checklist_id=item.checklist_id,
                title=item.title,
                is_completed=item.is_completed,
                assignee_id=item.assignee_id,
                due_date=item.due_date,
                display_order=item.display_order,
                completed_at=item.completed_at,
                completed_by=item.completed_by,
                assignee=UserBriefOut.model_validate(item.assignee) if item.assignee else None,
                created_at=item.created_at,
            ))
        out.checklists.append(TaskChecklistOut(
            id=c.id,
            task_id=c.task_id,
            title=c.title,
            display_order=c.display_order,
            items=c_items,
            completed_count=comp_cnt,
            total_count=len(c_items),
            created_at=c.created_at,
        ))

    out.time_entries = [
        TaskTimeEntryOut(
            id=te.id,
            task_id=te.task_id,
            user_id=te.user_id,
            started_at=te.started_at,
            ended_at=te.ended_at,
            duration_minutes=te.duration_minutes,
            description=te.description,
            user_name=te.user.full_name if te.user else None,
            created_at=te.created_at,
        ) for te in t.time_entries
    ]

    dependencies_out = []
    # 1. BLOCKED_BY dependencies (task t is blocked by depends_on_task_id)
    blocked_by_deps = db.query(TaskDependency).filter(TaskDependency.task_id == t.id).all()
    is_blocked = False
    for dep in blocked_by_deps:
        blocker = dep.depends_on_task
        if blocker and not blocker.is_deleted:
            if not blocker.is_completed:
                is_blocked = True
            dependencies_out.append(TaskDependencyOut(
                id=dep.id,
                task_id=dep.task_id,
                depends_on_task_id=dep.depends_on_task_id,
                depends_on_task_number=blocker.task_number,
                depends_on_task_title=blocker.title,
                depends_on_status_name=blocker.status_def.name if blocker.status_def else None,
                depends_on_priority=blocker.priority.value if hasattr(blocker.priority, 'value') else str(blocker.priority),
                depends_on_due_date=blocker.due_date,
                depends_on_is_completed=blocker.is_completed,
                direction="BLOCKED_BY",
                dependency_type=dep.dependency_type,
                created_at=dep.created_at,
            ))

    # 2. BLOCKING dependencies (task t blocks task_id)
    blocking_deps = db.query(TaskDependency).filter(TaskDependency.depends_on_task_id == t.id).all()
    for dep in blocking_deps:
        blocked_task = dep.task
        if blocked_task and not blocked_task.is_deleted:
            dependencies_out.append(TaskDependencyOut(
                id=dep.id,
                task_id=dep.task_id,
                depends_on_task_id=dep.depends_on_task_id,
                depends_on_task_number=blocked_task.task_number,
                depends_on_task_title=blocked_task.title,
                depends_on_status_name=blocked_task.status_def.name if blocked_task.status_def else None,
                depends_on_priority=blocked_task.priority.value if hasattr(blocked_task.priority, 'value') else str(blocked_task.priority),
                depends_on_due_date=blocked_task.due_date,
                depends_on_is_completed=blocked_task.is_completed,
                direction="BLOCKING",
                dependency_type=dep.dependency_type,
                created_at=dep.created_at,
            ))

    out.dependencies = dependencies_out
    out.is_blocked = is_blocked

    out.relationships = [
        TaskRelationshipOut(
            id=rel.id,
            task_id=rel.task_id,
            related_task_id=rel.related_task_id,
            related_task_number=rel.related_task.task_number if rel.related_task else None,
            related_task_title=rel.related_task.title if rel.related_task else None,
            relationship_type=rel.relationship_type,
            created_at=rel.created_at,
        ) for rel in db.query(TaskRelationship).filter(or_(TaskRelationship.task_id == t.id, TaskRelationship.related_task_id == t.id)).all()
    ]

    subtasks = db.query(Task).filter(
        Task.parent_task_id == t.id,
        Task.is_deleted.is_(False)
    ).order_by(Task.sort_order.asc(), Task.id.asc()).all()
    out.subtask_count = len(subtasks)
    out.completed_subtask_count = sum(1 for st in subtasks if st.is_completed)
    out.nested_subtasks = [_format_task_out(st, db) for st in subtasks]

    return out


# --- Task Endpoints ---

@router.get("", response_model=List[TaskOut])
def list_tasks(
    project_id: Optional[int] = None,
    phase_id: Optional[int] = None,
    parent_task_id: Optional[int] = None,
    status_id: Optional[int] = None,
    status_category: Optional[str] = None,
    priority: Optional[str] = None,
    assignee_id: Optional[int] = None,
    follower_id: Optional[int] = None,
    cost_center_id: Optional[int] = None,
    company_id: Optional[int] = None,
    q: Optional[str] = None,
    include_subtasks: bool = True,
    is_completed: Optional[bool] = None,
    is_archived: bool = False,
    my_tasks_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List tasks with comprehensive ClickUp filtering"""
    query = db.query(Task).filter(Task.is_deleted.is_(False))

    if not is_archived:
        query = query.filter(Task.is_archived.is_(False))

    if project_id:
        query = query.filter(Task.project_id == project_id)
    if phase_id:
        query = query.filter(Task.phase_id == phase_id)
    
    if parent_task_id is not None:
        query = query.filter(Task.parent_task_id == parent_task_id)
    elif not include_subtasks:
        query = query.filter(Task.parent_task_id.is_(None))

    if status_id:
        query = query.filter(Task.status_id == status_id)
    if status_category:
        query = query.join(TaskStatusDef).filter(TaskStatusDef.category == status_category.upper())
    if priority:
        query = query.filter(Task.priority == priority.upper())
    
    if assignee_id:
        query = query.filter(
            or_(
                Task.assignee_id == assignee_id,
                Task.id.in_(db.query(TaskAssignee.task_id).filter(TaskAssignee.user_id == assignee_id))
            )
        )

    if follower_id:
        query = query.filter(
            Task.id.in_(db.query(TaskFollower.task_id).filter(TaskFollower.user_id == follower_id))
        )

    if my_tasks_only:
        query = query.filter(
            or_(
                Task.assignee_id == current_user.id,
                Task.id.in_(db.query(TaskAssignee.task_id).filter(TaskAssignee.user_id == current_user.id)),
                Task.id.in_(db.query(TaskFollower.task_id).filter(TaskFollower.user_id == current_user.id))
            )
        )

    if cost_center_id:
        query = query.filter(Task.cost_center_id == cost_center_id)
    if company_id:
        query = query.filter(Task.company_id == company_id)

    if is_completed is not None:
        query = query.filter(Task.is_completed == is_completed)

    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Task.title.ilike(like),
                Task.task_number.ilike(like),
                Task.description.ilike(like)
            )
        )

    tasks = query.order_by(Task.created_at.desc()).all()
    return [_format_task_out(t, db) for t in tasks]


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new task / subtask entity"""
    if not data.title or not data.title.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Task title is mandatory")

    # Validate Cost Center master reference if provided
    if data.cost_center_id:
        cc = db.get(CostCenter, data.cost_center_id)
        if not cc or not cc.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "INVALID_COST_CENTER", "message": "The selected cost center is invalid or inactive", "field": "cost_center_id"}
            )

    # Subtask nesting validation
    if data.parent_task_id:
        parent = db.get(Task, data.parent_task_id)
        if not parent:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent task not found")
        depth = _get_task_depth(db, data.parent_task_id)
        if depth > 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Subtask depth exceeds maximum allowed limit of 3 levels"
            )

    task_num = _generate_task_number(db, data.project_id)

    task = Task(
        task_number=task_num,
        project_id=data.project_id,
        phase_id=data.phase_id,
        parent_task_id=data.parent_task_id,
        title=data.title.strip(),
        description=data.description,
        type_id=data.type_id,
        status_id=data.status_id,
        priority=data.priority,
        assignee_id=data.assignee_id or current_user.id,
        created_by=current_user.id,
        updated_by=current_user.id,
        start_date=data.start_date,
        start_time=data.start_time,
        due_date=data.due_date,
        due_time=data.due_time,
        estimated_minutes=data.estimated_minutes or int(data.estimated_hours * 60),
        estimated_hours=data.estimated_hours or ((data.estimated_minutes or 0) / 60.0),
        tags=data.tags,
        company_id=data.company_id,
        branch_id=data.branch_id,
        department_id=data.department_id,
        cost_center_id=data.cost_center_id,
        recurrence_rule=data.recurrence_rule,
    )

    if not task.status_id:
        first_status = db.query(TaskStatusDef).filter(TaskStatusDef.is_active.is_(True)).order_by(TaskStatusDef.display_order).first()
        if first_status:
            task.status_id = first_status.id

    db.add(task)
    db.commit()
    db.refresh(task)

    # Assignees handling
    assignee_ids = data.assignee_ids or []
    if task.assignee_id and task.assignee_id not in assignee_ids:
        assignee_ids.append(task.assignee_id)
    
    for uid in set(assignee_ids):
        db.add(TaskAssignee(task_id=task.id, user_id=uid, assigned_by=current_user.id))
        if uid != current_user.id:
            db.add(Notification(user_id=uid, message=f"You were assigned to task {task.task_number}: {task.title}"))
        db.add(TaskFollower(task_id=task.id, user_id=uid))

    # Followers handling
    if data.follower_ids:
        for fid in set(data.follower_ids):
            if not db.query(TaskFollower).filter(TaskFollower.task_id == task.id, TaskFollower.user_id == fid).first():
                db.add(TaskFollower(task_id=task.id, user_id=fid))

    # Tags handling
    if data.tag_ids:
        for tid in data.tag_ids:
            db.add(TaskTagMap(task_id=task.id, tag_id=tid))

    # Log activity
    _log_activity(db, task.id, current_user.id, "CREATED", new_val=task.title)

    db.commit()
    db.refresh(task)

    if task.parent_task_id:
        _update_parent_progress(db, task.parent_task_id)

    return _format_task_out(task, db)


@router.get("/{task_id}", response_model=TaskOut)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get task details by ID"""
    task = db.get(Task, task_id)
    if not task or task.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return _format_task_out(task, db)


@router.patch("/{task_id}", response_model=TaskOut)
@router.put("/{task_id}", response_model=TaskOut)
def update_task(
    task_id: int,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update task details / status transition"""
    task = db.get(Task, task_id)
    if not task or task.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    update_dict = data.model_dump(exclude_unset=True)

    if "title" in update_dict:
        if not update_dict["title"] or not update_dict["title"].strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Task title cannot be blank")
        if task.title != update_dict["title"]:
            _log_activity(db, task.id, current_user.id, "TITLE_CHANGED", old_val=task.title, new_val=update_dict["title"])

    if "cost_center_id" in update_dict and update_dict["cost_center_id"]:
        cc = db.get(CostCenter, update_dict["cost_center_id"])
        if not cc or not cc.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "INVALID_COST_CENTER", "message": "The selected cost center is invalid or inactive", "field": "cost_center_id"}
            )
        if task.cost_center_id != update_dict["cost_center_id"]:
            _log_activity(db, task.id, current_user.id, "COST_CENTER_CHANGED", old_val=task.cost_center_id, new_val=update_dict["cost_center_id"])

    if "parent_task_id" in update_dict and update_dict["parent_task_id"] != task.parent_task_id:
        if update_dict["parent_task_id"]:
            _detect_circular_dependency(db, task.id, update_dict["parent_task_id"])
            depth = _get_task_depth(db, update_dict["parent_task_id"])
            if depth > 3:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Subtask depth exceeds maximum allowed limit of 3 levels"
                )

    # Status & completion change logic
    is_completion_requested = False
    if "is_completed" in update_dict and update_dict["is_completed"] is True:
        is_completion_requested = True
    elif "status_id" in update_dict and update_dict["status_id"] != task.status_id:
        new_status = db.get(TaskStatusDef, update_dict["status_id"])
        if new_status and (new_status.category in [TaskStatusCategory.DONE, TaskStatusCategory.CLOSED] or new_status.is_terminal):
            is_completion_requested = True

    if is_completion_requested and not task.is_completed:
        # Check if task is blocked by incomplete tasks
        blocking_deps = db.query(TaskDependency).filter(TaskDependency.task_id == task.id).all()
        incomplete_blockers = []
        for dep in blocking_deps:
            if dep.depends_on_task and not dep.depends_on_task.is_deleted and not dep.depends_on_task.is_completed:
                incomplete_blockers.append(dep.depends_on_task.task_number)

        if incomplete_blockers and not data.override_dependencies:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "TASK_BLOCKED",
                    "message": f"Task is blocked by incomplete tasks: {', '.join(incomplete_blockers)}.",
                    "blocking_tasks": incomplete_blockers
                }
            )

        task.is_completed = True
        task.completed_at = datetime.now(timezone.utc)
        task.completed_by = current_user.id

        # Notify downstream dependent tasks that they are unblocked
        dependents = db.query(TaskDependency).filter(TaskDependency.depends_on_task_id == task.id).all()
        for dep in dependents:
            blocked_t = dep.task
            if blocked_t and not blocked_t.is_deleted and blocked_t.assignee_id:
                other_blockers = db.query(TaskDependency).filter(
                    TaskDependency.task_id == blocked_t.id,
                    TaskDependency.depends_on_task_id != task.id
                ).all()
                still_blocked = any(d.depends_on_task and not d.depends_on_task.is_completed for d in other_blockers)
                if not still_blocked:
                    db.add(Notification(
                        user_id=blocked_t.assignee_id,
                        message=f"Task {blocked_t.task_number}: {blocked_t.title} is now UNBLOCKED!"
                    ))

    elif "is_completed" in update_dict and update_dict["is_completed"] is False:
        task.is_completed = False
        task.completed_at = None
        task.completed_by = None
    elif "status_id" in update_dict and update_dict["status_id"] != task.status_id:
        new_status = db.get(TaskStatusDef, update_dict["status_id"])
        old_status_name = task.status_def.name if task.status_def else None
        new_status_name = new_status.name if new_status else None
        if new_status and not (new_status.category in [TaskStatusCategory.DONE, TaskStatusCategory.CLOSED] or new_status.is_terminal):
            task.is_completed = False
            task.completed_at = None
            task.completed_by = None
        _log_activity(db, task.id, current_user.id, "STATUS_CHANGED", old_val=old_status_name, new_val=new_status_name)

    if "priority" in update_dict and update_dict["priority"] != task.priority:
        _log_activity(db, task.id, current_user.id, "PRIORITY_CHANGED", old_val=task.priority, new_val=update_dict["priority"])

    if "due_date" in update_dict and update_dict["due_date"] != task.due_date:
        _log_activity(db, task.id, current_user.id, "DUE_DATE_CHANGED", old_val=task.due_date, new_val=update_dict["due_date"])

    # Update task fields
    task.updated_by = current_user.id
    for field, val in update_dict.items():
        if field not in ["assignee_ids", "follower_ids", "tag_ids"]:
            setattr(task, field, val)

    # Multi assignees update
    if "assignee_ids" in update_dict and update_dict["assignee_ids"] is not None:
        db.query(TaskAssignee).filter(TaskAssignee.task_id == task.id).delete()
        for uid in set(update_dict["assignee_ids"]):
            db.add(TaskAssignee(task_id=task.id, user_id=uid, assigned_by=current_user.id))
            if not db.query(TaskFollower).filter(TaskFollower.task_id == task.id, TaskFollower.user_id == uid).first():
                db.add(TaskFollower(task_id=task.id, user_id=uid))

    # Followers update
    if "follower_ids" in update_dict and update_dict["follower_ids"] is not None:
        db.query(TaskFollower).filter(TaskFollower.task_id == task.id).delete()
        for fid in set(update_dict["follower_ids"]):
            db.add(TaskFollower(task_id=task.id, user_id=fid))

    # Tags update
    if "tag_ids" in update_dict and update_dict["tag_ids"] is not None:
        db.query(TaskTagMap).filter(TaskTagMap.task_id == task.id).delete()
        for tid in update_dict["tag_ids"]:
            db.add(TaskTagMap(task_id=task.id, tag_id=tid))

    db.commit()
    db.refresh(task)

    if task.parent_task_id:
        _update_parent_progress(db, task.parent_task_id)

    return _format_task_out(task, db)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft delete a task"""
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    task.is_deleted = True
    _log_activity(db, task.id, current_user.id, "DELETED")
    db.commit()

    if task.parent_task_id:
        _update_parent_progress(db, task.parent_task_id)

    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Subtasks API ---

@router.put("/subtasks/{subtask_id}/toggle", response_model=TaskSubtaskOut)
def toggle_legacy_subtask(
    subtask_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Legacy subtask toggle compatibility endpoint"""
    subtask = db.get(TaskSubtask, subtask_id)
    if subtask:
        subtask.is_completed = not subtask.is_completed
        db.commit()
        db.refresh(subtask)
        return TaskSubtaskOut.model_validate(subtask)

    # Or toggle task entity subtask
    task = db.get(Task, subtask_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subtask not found")
    task.is_completed = not task.is_completed
    db.commit()
    db.refresh(task)
    return TaskSubtaskOut(
        id=task.id,
        task_id=task.parent_task_id or task.id,
        title=task.title,
        is_completed=task.is_completed,
        display_order=0,
        created_at=task.created_at
    )


@router.post("/{task_id}/subtasks", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def add_subtask(
    task_id: int,
    data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a subtask under a parent task"""
    parent = db.get(Task, task_id)
    if not parent or parent.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent task not found")
    
    data.parent_task_id = task_id
    if not data.project_id:
        data.project_id = parent.project_id
    
    # Also save legacy TaskSubtask record for backwards compatibility
    legacy_st = TaskSubtask(task_id=task_id, title=data.title)
    db.add(legacy_st)
    
    return create_task(data, db, current_user)


# --- Legacy Time Log Endpoints ---

@router.post("/{task_id}/timelogs", response_model=TaskTimeLogOut, status_code=status.HTTP_201_CREATED)
def log_time_legacy(
    task_id: int,
    data: TaskTimeLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    log = TaskTimeLog(task_id=task.id, user_id=current_user.id, hours=data.hours, log_date=data.log_date, description=data.description)
    task.actual_hours += log.hours
    task.actual_minutes += int(log.hours * 60)
    db.add(log)
    db.add(task)
    db.commit()
    db.refresh(log)

    out = TaskTimeLogOut.model_validate(log)
    out.user_name = current_user.full_name
    return out


@router.get("/{task_id}/timelogs", response_model=List[TaskTimeLogOut])
def get_task_timelogs_legacy(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    logs = db.query(TaskTimeLog).filter(TaskTimeLog.task_id == task_id).order_by(TaskTimeLog.created_at.desc()).all()
    results = []
    for l in logs:
        out = TaskTimeLogOut.model_validate(l)
        out.user_name = l.user.full_name if l.user else None
        results.append(out)
    return results



# --- Checklist API ---

@router.post("/{task_id}/checklists", response_model=TaskChecklistOut, status_code=status.HTTP_201_CREATED)
def create_checklist(
    task_id: int,
    data: TaskChecklistCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    checklist = TaskChecklist(task_id=task.id, title=data.title.strip(), display_order=data.display_order)
    db.add(checklist)
    db.commit()
    db.refresh(checklist)

    for item_data in data.items:
        ci = TaskChecklistItem(
            checklist_id=checklist.id,
            title=item_data.title.strip(),
            assignee_id=item_data.assignee_id,
            due_date=item_data.due_date,
            display_order=item_data.display_order,
        )
        db.add(ci)

    db.commit()
    db.refresh(checklist)
    _log_activity(db, task.id, current_user.id, "CHECKLIST_CREATED", new_val=checklist.title)

    c_items = []
    comp_cnt = 0
    for item in checklist.items:
        if item.is_completed:
            comp_cnt += 1
        c_items.append(TaskChecklistItemOut(
            id=item.id,
            checklist_id=item.checklist_id,
            title=item.title,
            is_completed=item.is_completed,
            assignee_id=item.assignee_id,
            due_date=item.due_date,
            display_order=item.display_order,
            completed_at=item.completed_at,
            completed_by=item.completed_by,
            assignee=UserBriefOut.model_validate(item.assignee) if item.assignee else None,
            created_at=item.created_at,
        ))

    return TaskChecklistOut(
        id=checklist.id,
        task_id=checklist.task_id,
        title=checklist.title,
        display_order=checklist.display_order,
        items=c_items,
        completed_count=comp_cnt,
        total_count=len(c_items),
        created_at=checklist.created_at,
    )


@router.post("/checklists/{checklist_id}/items", response_model=TaskChecklistItemOut, status_code=status.HTTP_201_CREATED)
def add_checklist_item(
    checklist_id: int,
    data: TaskChecklistItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    checklist = db.get(TaskChecklist, checklist_id)
    if not checklist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Checklist not found")

    ci = TaskChecklistItem(
        checklist_id=checklist.id,
        title=data.title.strip(),
        assignee_id=data.assignee_id,
        due_date=data.due_date,
        display_order=data.display_order,
    )
    db.add(ci)
    db.commit()
    db.refresh(ci)

    return TaskChecklistItemOut(
        id=ci.id,
        checklist_id=ci.checklist_id,
        title=ci.title,
        is_completed=ci.is_completed,
        assignee_id=ci.assignee_id,
        due_date=ci.due_date,
        display_order=ci.display_order,
        completed_at=ci.completed_at,
        completed_by=ci.completed_by,
        assignee=UserBriefOut.model_validate(ci.assignee) if ci.assignee else None,
        created_at=ci.created_at,
    )


@router.put("/checklist-items/{item_id}/toggle", response_model=TaskChecklistItemOut)
def toggle_checklist_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.get(TaskChecklistItem, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Checklist item not found")

    item.is_completed = not item.is_completed
    if item.is_completed:
        item.completed_at = datetime.now(timezone.utc)
        item.completed_by = current_user.id
    else:
        item.completed_at = None
        item.completed_by = None

    db.commit()
    db.refresh(item)
    return TaskChecklistItemOut(
        id=item.id,
        checklist_id=item.checklist_id,
        title=item.title,
        is_completed=item.is_completed,
        assignee_id=item.assignee_id,
        due_date=item.due_date,
        display_order=item.display_order,
        completed_at=item.completed_at,
        completed_by=item.completed_by,
        assignee=UserBriefOut.model_validate(item.assignee) if item.assignee else None,
        created_at=item.created_at,
    )


@router.post("/checklist-items/{item_id}/convert-to-subtask", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def convert_checklist_item_to_subtask(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Convert a checklist item into a full subtask"""
    item = db.get(TaskChecklistItem, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Checklist item not found")

    checklist = item.checklist
    parent_task = checklist.task

    subtask_data = TaskCreate(
        title=item.title,
        project_id=parent_task.project_id,
        parent_task_id=parent_task.id,
        assignee_id=item.assignee_id or current_user.id,
        due_date=item.due_date,
    )
    new_subtask = create_task(subtask_data, db, current_user)
    db.delete(item)
    db.commit()

    return new_subtask


# --- Time Tracking API ---

@router.post("/{task_id}/timer/start", response_model=TaskTimeEntryOut)
def start_timer(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Start stopwatch timer for current user on task"""
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    # Check active timer
    active = db.query(TaskTimeEntry).filter(
        TaskTimeEntry.user_id == current_user.id,
        TaskTimeEntry.ended_at.is_(None)
    ).first()
    if active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Active timer already running on task ID {active.task_id}. Stop it before starting a new timer."
        )

    entry = TaskTimeEntry(
        task_id=task.id,
        user_id=current_user.id,
        started_at=datetime.now(timezone.utc)
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    out = TaskTimeEntryOut.model_validate(entry)
    out.user_name = current_user.full_name
    return out


@router.post("/{task_id}/timer/stop", response_model=TaskTimeEntryOut)
def stop_timer(
    task_id: int,
    description: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Stop active timer and calculate duration"""
    entry = db.query(TaskTimeEntry).filter(
        TaskTimeEntry.task_id == task_id,
        TaskTimeEntry.user_id == current_user.id,
        TaskTimeEntry.ended_at.is_(None)
    ).first()

    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active timer found for task")

    now = datetime.now(timezone.utc)
    start_dt = entry.started_at
    if start_dt.tzinfo is None:
        start_dt = start_dt.replace(tzinfo=timezone.utc)

    entry.ended_at = now
    duration = int((now - start_dt).total_seconds() / 60)
    entry.duration_minutes = max(1, duration)
    if description:
        entry.description = description

    task = db.get(Task, task_id)
    if task:
        task.actual_minutes += entry.duration_minutes
        task.actual_hours = round(task.actual_minutes / 60.0, 2)
        db.add(task)

    db.commit()
    db.refresh(entry)

    out = TaskTimeEntryOut.model_validate(entry)
    out.user_name = current_user.full_name
    return out


@router.post("/{task_id}/time-entries", response_model=TaskTimeEntryOut, status_code=status.HTTP_201_CREATED)
def add_manual_time_entry(
    task_id: int,
    data: TaskTimeEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    ended = data.ended_at or datetime.now(timezone.utc)
    duration = data.duration_minutes
    if duration <= 0 and data.started_at and ended:
        duration = int((ended - data.started_at).total_seconds() / 60)

    entry = TaskTimeEntry(
        task_id=task.id,
        user_id=current_user.id,
        started_at=data.started_at,
        ended_at=ended,
        duration_minutes=max(1, duration),
        description=data.description
    )
    task.actual_minutes += entry.duration_minutes
    task.actual_hours = round(task.actual_minutes / 60.0, 2)

    db.add(entry)
    db.add(task)
    db.commit()
    db.refresh(entry)

    out = TaskTimeEntryOut.model_validate(entry)
    out.user_name = current_user.full_name
    return out


# --- Comments & Mentions API ---

@router.post("/{task_id}/comments", response_model=TaskCommentOut, status_code=status.HTTP_201_CREATED)
def add_task_comment(
    task_id: int,
    data: TaskCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.get(Task, task_id)
    if not task or task.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    if not data.content or not data.content.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Comment content cannot be empty")

    comment = TaskComment(task_id=task.id, user_id=current_user.id, content=data.content.strip())
    db.add(comment)
    db.commit()
    db.refresh(comment)

    # Mentions dispatches
    _parse_and_notify_mentions(db, comment.content, task, current_user)
    _log_activity(db, task.id, current_user.id, "COMMENT_ADDED", new_val=comment.content[:50])

    db.commit()

    out = TaskCommentOut.model_validate(comment)
    out.user_name = current_user.full_name
    out.user_photo = current_user.profile_photo
    return out


@router.get("/{task_id}/comments", response_model=List[TaskCommentOut])
def get_task_comments(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    comments = db.query(TaskComment).filter(
        TaskComment.task_id == task_id,
        TaskComment.deleted_at.is_(None)
    ).order_by(TaskComment.created_at.asc()).all()

    results = []
    for c in comments:
        out = TaskCommentOut.model_validate(c)
        out.user_name = c.user.full_name if c.user else None
        out.user_photo = c.user.profile_photo if c.user else None
        results.append(out)
    return results


# --- Attachments API ---

@router.post("/{task_id}/attachments", response_model=TaskAttachmentOut, status_code=status.HTTP_201_CREATED)
async def upload_task_attachment(
    task_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload physical task file attachment or JSON attachment record"""
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        body = await request.json()
        filename = body.get("filename", "attachment")
        file_size_str = body.get("file_size", "0 KB")
        file_url = body.get("file_url", "")
        attachment = TaskAttachment(
            task_id=task.id,
            uploaded_by=current_user.id,
            filename=filename,
            file_size=file_size_str,
            mime_type="application/octet-stream",
            file_url=file_url,
        )
    else:
        form = await request.form()
        file = form.get("file")
        if not file or not hasattr(file, "filename"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File is required")
        filename = file.filename or "attachment"
        ext = os.path.splitext(filename)[1]
        unique_name = f"{task_id}_{uuid.uuid4().hex[:8]}{ext}"
        dest_path = os.path.join(UPLOAD_DIR, unique_name)
        content = await file.read()
        file_size_str = f"{round(len(content) / 1024.0, 1)} KB"
        with open(dest_path, "wb") as f:
            f.write(content)
        rel_url = f"/uploads/tasks/{unique_name}"
        attachment = TaskAttachment(
            task_id=task.id,
            uploaded_by=current_user.id,
            filename=filename,
            file_size=file_size_str,
            mime_type=getattr(file, "content_type", "application/octet-stream"),
            storage_path=dest_path,
            file_url=rel_url,
        )

    db.add(attachment)
    _log_activity(db, task.id, current_user.id, "ATTACHMENT_ADDED", new_val=filename)
    db.commit()
    db.refresh(attachment)

    out = TaskAttachmentOut.model_validate(attachment)
    out.uploader_name = current_user.full_name
    return out



@router.post("/{task_id}/attachments/meta", response_model=TaskAttachmentOut, status_code=status.HTTP_201_CREATED)
def add_task_attachment_meta(
    task_id: int,
    data: TaskAttachmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add attachment record via JSON payload"""
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    attachment = TaskAttachment(
        task_id=task.id,
        uploaded_by=current_user.id,
        filename=data.filename,
        file_size=data.file_size,
        mime_type="application/octet-stream",
        storage_path=data.storage_path,
        file_url=data.file_url,
    )
    db.add(attachment)
    _log_activity(db, task.id, current_user.id, "ATTACHMENT_ADDED", new_val=data.filename)
    db.commit()
    db.refresh(attachment)

    out = TaskAttachmentOut.model_validate(attachment)
    out.uploader_name = current_user.full_name
    return out



@router.get("/{task_id}/attachments", response_model=List[TaskAttachmentOut])
def get_task_attachments(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    atts = db.query(TaskAttachment).filter(TaskAttachment.task_id == task_id).order_by(TaskAttachment.created_at.desc()).all()
    res = []
    for a in atts:
        out = TaskAttachmentOut.model_validate(a)
        out.uploader_name = a.uploader.full_name if a.uploader else None
        res.append(out)
    return res


@router.delete("/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    attachment = db.get(TaskAttachment, attachment_id)
    if not attachment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")

    if attachment.storage_path and os.path.exists(attachment.storage_path):
        try:
            os.remove(attachment.storage_path)
        except OSError:
            pass

    _log_activity(db, attachment.task_id, current_user.id, "ATTACHMENT_REMOVED", old_val=attachment.filename)
    db.delete(attachment)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Dependencies & Relationships API ---

@router.post("/{task_id}/dependencies", response_model=TaskDependencyOut, status_code=status.HTTP_201_CREATED)
def create_task_dependency(
    task_id: int,
    data: TaskDependencyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.get(Task, task_id)
    target_task = db.get(Task, data.depends_on_task_id)
    if not task or not target_task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task or target task not found")

    if data.direction == "BLOCKING":
        # task_id BLOCKS target_task
        blocked_id = target_task.id
        blocking_id = task.id
        target_display = target_task
    else:
        # task_id IS BLOCKED BY target_task
        blocked_id = task.id
        blocking_id = target_task.id
        target_display = target_task

    _detect_circular_dependency(db, blocked_id, blocking_id)

    existing_dep = db.query(TaskDependency).filter(
        TaskDependency.task_id == blocked_id,
        TaskDependency.depends_on_task_id == blocking_id
    ).first()

    if existing_dep:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Dependency relationship already exists")

    dep = TaskDependency(
        task_id=blocked_id,
        depends_on_task_id=blocking_id,
        dependency_type=data.dependency_type
    )
    db.add(dep)
    _log_activity(db, task.id, current_user.id, "DEPENDENCY_ADDED", new_val=target_display.task_number)
    db.commit()
    db.refresh(dep)

    return TaskDependencyOut(
        id=dep.id,
        task_id=dep.task_id,
        depends_on_task_id=dep.depends_on_task_id,
        depends_on_task_number=target_display.task_number,
        depends_on_task_title=target_display.title,
        depends_on_status_name=target_display.status_def.name if target_display.status_def else None,
        depends_on_priority=target_display.priority.value if hasattr(target_display.priority, 'value') else str(target_display.priority),
        depends_on_due_date=target_display.due_date,
        depends_on_is_completed=target_display.is_completed,
        direction=data.direction or "BLOCKED_BY",
        dependency_type=dep.dependency_type,
        created_at=dep.created_at,
    )


@router.delete("/dependencies/{dependency_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task_dependency(
    dependency_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dep = db.get(TaskDependency, dependency_id)
    if not dep:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dependency not found")

    db.delete(dep)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Bulk Actions API ---

@router.post("/bulk-action", response_model=BulkTaskActionResponse)
def bulk_task_action(
    req: BulkTaskActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tasks = db.query(Task).filter(Task.id.in_(req.task_ids)).all()
    if not tasks:
        return BulkTaskActionResponse(success=False, affected_count=0, message="No matching tasks found")

    affected = 0
    for t in tasks:
        if req.action == "change_status" and req.status_id:
            t.status_id = req.status_id
            _log_activity(db, t.id, current_user.id, "BULK_STATUS_CHANGE")
            affected += 1
        elif req.action == "set_priority" and req.priority:
            t.priority = req.priority
            _log_activity(db, t.id, current_user.id, "BULK_PRIORITY_CHANGE")
            affected += 1
        elif req.action == "assign" and req.assignee_id:
            t.assignee_id = req.assignee_id
            db.add(TaskAssignee(task_id=t.id, user_id=req.assignee_id, assigned_by=current_user.id))
            affected += 1
        elif req.action == "set_dates":
            if req.start_date:
                t.start_date = req.start_date
            if req.due_date:
                t.due_date = req.due_date
            affected += 1
        elif req.action == "archive":
            t.is_archived = True
            affected += 1
        elif req.action == "delete":
            t.is_deleted = True
            affected += 1

    db.commit()
    return BulkTaskActionResponse(
        success=True,
        affected_count=affected,
        message=f"Successfully applied {req.action} on {affected} task(s)."
    )


# --- Activity Log API ---

@router.get("/{task_id}/activities", response_model=List[TaskActivityOut])
def get_task_activities(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    activities = db.query(TaskActivity).filter(TaskActivity.task_id == task_id).order_by(TaskActivity.created_at.desc()).all()
    res = []
    for a in activities:
        res.append(TaskActivityOut(
            id=a.id,
            task_id=a.task_id,
            actor_id=a.actor_id,
            actor_name=a.actor.full_name if a.actor else None,
            action=a.action,
            field_name=a.field_name,
            old_value=a.old_value,
            new_value=a.new_value,
            created_at=a.created_at,
        ))
    return res


# --- Task Custom Fields Values API ---

@router.get("/{task_id}/custom-fields", response_model=List[CustomFieldValueOut])
def get_task_custom_fields(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    values = db.query(TaskCustomFieldValue).filter(TaskCustomFieldValue.task_id == task_id).all()
    results = []
    for val in values:
        field_def = db.get(TaskCustomFieldDefinition, val.field_id)
        results.append(CustomFieldValueOut(
            id=val.id,
            field_id=val.field_id,
            field_label=field_def.label if field_def else f"Field {val.field_id}",
            value=val.value
        ))
    return results


@router.post("/{task_id}/custom-fields", response_model=CustomFieldValueOut)
def save_task_custom_field(
    task_id: int,
    data: CustomFieldValueCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    field_def = db.get(TaskCustomFieldDefinition, data.field_id)
    if not field_def:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Custom field definition not found")

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


# --- Subtask & Dependency Workflow Endpoints ---

@router.post("/{task_id}/convert-to-task", response_model=TaskOut)
def convert_subtask_to_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Convert a subtask to a top-level task (parent_task_id = None)"""
    task = db.get(Task, task_id)
    if not task or task.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    old_parent_id = task.parent_task_id
    task.parent_task_id = None
    task.updated_by = current_user.id
    db.add(task)
    _log_activity(db, task.id, current_user.id, "CONVERTED_TO_TOP_LEVEL_TASK")
    db.commit()
    db.refresh(task)

    if old_parent_id:
        _update_parent_progress(db, old_parent_id)

    return _format_task_out(task, db)


@router.post("/{task_id}/convert-to-subtask", response_model=TaskOut)
def convert_task_to_subtask(
    task_id: int,
    data: TaskConvertRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Convert a task to a subtask under target_parent_id"""
    task = db.get(Task, task_id)
    if not task or task.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    if not data.target_parent_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="target_parent_id is required")

    target_parent = db.get(Task, data.target_parent_id)
    if not target_parent or target_parent.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target parent task not found")

    # Anti-circular parent check
    if task_id == data.target_parent_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A task cannot be its own parent")

    curr_id = data.target_parent_id
    visited = set()
    depth = 1
    while curr_id:
        if curr_id == task_id or curr_id in visited:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot make task a subtask because it would create a circular parent hierarchy"
            )
        visited.add(curr_id)
        parent = db.get(Task, curr_id)
        if not parent:
            break
        depth += 1
        if depth > 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Exceeded maximum nesting depth of 5 levels"
            )
        curr_id = parent.parent_task_id

    old_parent_id = task.parent_task_id
    task.parent_task_id = data.target_parent_id
    task.updated_by = current_user.id
    db.add(task)
    _log_activity(db, task.id, current_user.id, "CONVERTED_TO_SUBTASK", new_val=target_parent.task_number)
    db.commit()
    db.refresh(task)

    if old_parent_id:
        _update_parent_progress(db, old_parent_id)
    _update_parent_progress(db, data.target_parent_id)

    return _format_task_out(task, db)


@router.post("/{task_id}/reorder-subtasks", status_code=status.HTTP_200_OK)
def reorder_subtasks(
    task_id: int,
    data: TaskReorderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reorder subtasks within parent task_id"""
    for idx, sib_id in enumerate(data.sibling_ids):
        sub = db.get(Task, sib_id)
        if sub and sub.parent_task_id == task_id:
            sub.sort_order = idx
            db.add(sub)
    db.commit()
    return {"message": "Subtasks reordered successfully"}


@router.post("/{task_id}/reschedule-dependencies", response_model=TaskOut)
def reschedule_dependencies(
    task_id: int,
    data: RescheduleDependenciesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Shift start_date and due_date for downstream dependent tasks"""
    task = db.get(Task, task_id)
    if not task or task.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    if data.days_shift == 0:
        return _format_task_out(task, db)

    visited = set()

    def _shift_downstream(tid: int, shift: int):
        if tid in visited:
            return
        visited.add(tid)
        deps = db.query(TaskDependency).filter(TaskDependency.depends_on_task_id == tid).all()
        for d in deps:
            blocked_t = d.task
            if blocked_t and not blocked_t.is_deleted:
                if blocked_t.start_date:
                    blocked_t.start_date = blocked_t.start_date + timedelta(days=shift)
                if blocked_t.due_date:
                    blocked_t.due_date = blocked_t.due_date + timedelta(days=shift)
                db.add(blocked_t)
                _log_activity(db, blocked_t.id, current_user.id, "AUTO_RESCHEDULED", new_val=f"shifted {shift} days")
                _shift_downstream(blocked_t.id, shift)

    _shift_downstream(task.id, data.days_shift)
    db.commit()
    db.refresh(task)
    return _format_task_out(task, db)

