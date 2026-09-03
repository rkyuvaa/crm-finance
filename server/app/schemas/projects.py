from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict

from app.models.projects import TaskPriority


# --- Subtask / Checklist ---
class TaskSubtaskBase(BaseModel):
    title: str
    is_completed: bool = False
    display_order: int = 0


class TaskSubtaskCreate(TaskSubtaskBase):
    pass


class TaskSubtaskOut(TaskSubtaskBase):
    id: int
    task_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Time Log ---
class TaskTimeLogBase(BaseModel):
    hours: float = Field(..., gt=0)
    log_date: date
    description: Optional[str] = None


class TaskTimeLogCreate(TaskTimeLogBase):
    pass


class TaskTimeLogOut(TaskTimeLogBase):
    id: int
    task_id: int
    user_id: int
    user_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Task Comment ---
class TaskCommentBase(BaseModel):
    content: str


class TaskCommentCreate(TaskCommentBase):
    pass


class TaskCommentOut(TaskCommentBase):
    id: int
    task_id: int
    user_id: int
    user_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Task ---
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    type_id: Optional[int] = None
    status_id: Optional[int] = None
    priority: TaskPriority = TaskPriority.NORMAL
    assignee_id: Optional[int] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    estimated_hours: float = 0.0
    tags: Optional[str] = None


class TaskCreate(TaskBase):
    project_id: Optional[int] = None
    parent_task_id: Optional[int] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    type_id: Optional[int] = None
    status_id: Optional[int] = None
    priority: Optional[TaskPriority] = None
    assignee_id: Optional[int] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    tags: Optional[str] = None


class TaskOut(TaskBase):
    id: int
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    parent_task_id: Optional[int] = None
    actual_hours: float = 0.0
    assignee_name: Optional[str] = None
    subtasks: List[TaskSubtaskOut] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Project Milestone ---
class ProjectMilestoneBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[date] = None
    is_completed: bool = False


class ProjectMilestoneCreate(ProjectMilestoneBase):
    pass


class ProjectMilestoneOut(ProjectMilestoneBase):
    id: int
    project_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Project ---
class ProjectBase(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    space_id: Optional[int] = None
    lead_id: Optional[int] = None
    category: str = "General"
    type_id: Optional[int] = None
    status_id: Optional[int] = None
    progress: int = 0
    budget: float = 0.0
    estimated_cost: float = 0.0
    actual_cost: float = 0.0
    target_start_date: Optional[date] = None
    target_end_date: Optional[date] = None
    owner_id: Optional[int] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    space_id: Optional[int] = None
    lead_id: Optional[int] = None
    category: Optional[str] = None
    type_id: Optional[int] = None
    status_id: Optional[int] = None
    progress: Optional[int] = None
    budget: Optional[float] = None
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None
    target_start_date: Optional[date] = None
    target_end_date: Optional[date] = None
    owner_id: Optional[int] = None


class ProjectOut(ProjectBase):
    id: int
    owner_name: Optional[str] = None
    lead_app_no: Optional[str] = None
    lead_customer_name: Optional[str] = None
    tasks_count: dict = {"total": 0, "done": 0}
    milestones: List[ProjectMilestoneOut] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Custom Fields ---
class CustomFieldDefinitionBase(BaseModel):
    name: str
    label: str
    field_type: str = "text"  # text, number, select, date, currency
    is_required: bool = False
    options: Optional[dict] = None
    display_order: int = 0


class CustomFieldDefinitionCreate(CustomFieldDefinitionBase):
    pass


class CustomFieldDefinitionOut(CustomFieldDefinitionBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CustomFieldValueBase(BaseModel):
    field_id: int
    value: Optional[str] = None


class CustomFieldValueCreate(CustomFieldValueBase):
    pass


class CustomFieldValueOut(CustomFieldValueBase):
    id: int
    field_label: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# --- Status Definitions ---
class StatusDefinitionBase(BaseModel):
    name: str
    color: str = "#E2E8F0"
    display_order: int = 0
    is_terminal: bool = False


class StatusDefinitionCreate(StatusDefinitionBase):
    pass


class StatusDefinitionOut(StatusDefinitionBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


