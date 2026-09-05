from datetime import datetime, date
from typing import Any, List, Optional
from pydantic import BaseModel, Field, ConfigDict

from app.models.projects import TaskPriority, TaskStatusCategory, DependencyType, RelationshipType


# --- Cost Center & Branch Brief Schemas ---
class CostCenterBrief(BaseModel):
    id: int
    code: str
    name: str
    department_id: Optional[int] = None
    company_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class BranchBrief(BaseModel):
    id: int
    code: str
    name: str
    company_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


# --- User Brief for Task Assignees / Followers ---
class UserBriefOut(BaseModel):
    id: int
    full_name: str
    email: str
    initials: Optional[str] = None
    profile_photo: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# --- Task Assignee & Follower ---
class TaskAssigneeOut(BaseModel):
    id: int
    task_id: int
    user_id: int
    user: Optional[UserBriefOut] = None
    assigned_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TaskFollowerOut(BaseModel):
    id: int
    task_id: int
    user_id: int
    user: Optional[UserBriefOut] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Task Tags ---
class TaskTagBase(BaseModel):
    name: str
    color: str = "#3B82F6"


class TaskTagCreate(TaskTagBase):
    pass


class TaskTagOut(TaskTagBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


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


# --- Task Checklist & Checklist Items ---
class TaskChecklistItemBase(BaseModel):
    title: str
    is_completed: bool = False
    assignee_id: Optional[int] = None
    due_date: Optional[date] = None
    display_order: int = 0


class TaskChecklistItemCreate(TaskChecklistItemBase):
    pass


class TaskChecklistItemOut(TaskChecklistItemBase):
    id: int
    checklist_id: int
    completed_at: Optional[datetime] = None
    completed_by: Optional[int] = None
    assignee: Optional[UserBriefOut] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TaskChecklistBase(BaseModel):
    title: str
    display_order: int = 0


class TaskChecklistCreate(TaskChecklistBase):
    items: List[TaskChecklistItemCreate] = []


class TaskChecklistOut(TaskChecklistBase):
    id: int
    task_id: int
    items: List[TaskChecklistItemOut] = []
    completed_count: int = 0
    total_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Time Log / Entry ---
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


class TaskTimeEntryBase(BaseModel):
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_minutes: int = 0
    description: Optional[str] = None


class TaskTimeEntryCreate(TaskTimeEntryBase):
    pass


class TaskTimeEntryOut(TaskTimeEntryBase):
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
    user_photo: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# --- Task Attachment ---
class TaskAttachmentBase(BaseModel):
    filename: str
    file_size: Optional[str] = None
    mime_type: Optional[str] = None
    file_url: Optional[str] = None


class TaskAttachmentCreate(TaskAttachmentBase):
    storage_path: Optional[str] = None


class TaskAttachmentOut(TaskAttachmentBase):
    id: int
    task_id: int
    uploaded_by: Optional[int] = None
    uploader_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Task Dependency & Relationship ---
class TaskDependencyCreate(BaseModel):
    depends_on_task_id: int
    dependency_type: DependencyType = DependencyType.BLOCKS
    direction: Optional[str] = "BLOCKED_BY"  # "BLOCKED_BY" or "BLOCKING"


class TaskDependencyOut(BaseModel):
    id: int
    task_id: int
    depends_on_task_id: int
    depends_on_task_number: Optional[str] = None
    depends_on_task_title: Optional[str] = None
    depends_on_status_name: Optional[str] = None
    depends_on_priority: Optional[str] = None
    depends_on_due_date: Optional[date] = None
    depends_on_is_completed: Optional[bool] = None
    direction: str = "BLOCKED_BY"  # "BLOCKING" or "BLOCKED_BY"
    dependency_type: DependencyType
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TaskRelationshipCreate(BaseModel):
    related_task_id: int
    relationship_type: RelationshipType = RelationshipType.RELATED


class TaskRelationshipOut(BaseModel):
    id: int
    task_id: int
    related_task_id: int
    related_task_number: Optional[str] = None
    related_task_title: Optional[str] = None
    relationship_type: RelationshipType
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Task Activity Audit Log ---
class TaskActivityOut(BaseModel):
    id: int
    task_id: int
    actor_id: Optional[int] = None
    actor_name: Optional[str] = None
    action: str
    field_name: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
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
    start_time: Optional[str] = None
    due_date: Optional[date] = None
    due_time: Optional[str] = None
    estimated_minutes: int = 0
    estimated_hours: float = 0.0
    tags: Optional[str] = None
    company_id: Optional[int] = None
    branch_id: Optional[int] = None
    department_id: Optional[int] = None
    cost_center_id: Optional[int] = None
    phase_id: Optional[int] = None
    recurrence_rule: Optional[dict] = None


class TaskCreate(TaskBase):
    project_id: Optional[int] = None
    parent_task_id: Optional[int] = None
    assignee_ids: Optional[List[int]] = None
    follower_ids: Optional[List[int]] = None
    tag_ids: Optional[List[int]] = None
    sort_order: Optional[int] = 0


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    type_id: Optional[int] = None
    status_id: Optional[int] = None
    priority: Optional[TaskPriority] = None
    assignee_id: Optional[int] = None
    assignee_ids: Optional[List[int]] = None
    follower_ids: Optional[List[int]] = None
    start_date: Optional[date] = None
    start_time: Optional[str] = None
    due_date: Optional[date] = None
    due_time: Optional[str] = None
    estimated_minutes: Optional[int] = None
    estimated_hours: Optional[float] = None
    actual_minutes: Optional[int] = None
    actual_hours: Optional[float] = None
    tags: Optional[str] = None
    tag_ids: Optional[List[int]] = None
    company_id: Optional[int] = None
    branch_id: Optional[int] = None
    department_id: Optional[int] = None
    cost_center_id: Optional[int] = None
    phase_id: Optional[int] = None
    parent_task_id: Optional[int] = None
    is_completed: Optional[bool] = None
    is_archived: Optional[bool] = None
    is_deleted: Optional[bool] = None
    sort_order: Optional[int] = None
    recurrence_rule: Optional[dict] = None
    override_dependencies: Optional[bool] = False


class TaskOut(TaskBase):
    id: int
    task_number: str
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    parent_task_id: Optional[int] = None
    sort_order: int = 0
    actual_minutes: int = 0
    actual_hours: float = 0.0
    progress_percentage: float = 0.0
    is_completed: bool = False
    is_archived: bool = False
    is_deleted: bool = False
    is_blocked: bool = False
    completed_at: Optional[datetime] = None
    completed_by: Optional[int] = None

    assignee_name: Optional[str] = None
    cost_center_code: Optional[str] = None
    cost_center_name: Optional[str] = None
    department_name: Optional[str] = None
    status_name: Optional[str] = None
    status_color: Optional[str] = None
    status_category: Optional[str] = None

    assignees: List[TaskAssigneeOut] = []
    followers: List[TaskFollowerOut] = []
    checklists: List[TaskChecklistOut] = []
    time_entries: List[TaskTimeEntryOut] = []
    dependencies: List[TaskDependencyOut] = []
    relationships: List[TaskRelationshipOut] = []
    tags_list: List[TaskTagOut] = []
    subtask_count: int = 0
    completed_subtask_count: int = 0
    nested_subtasks: List["TaskOut"] = []

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TaskConvertRequest(BaseModel):
    target_parent_id: Optional[int] = None


class TaskReorderRequest(BaseModel):
    sibling_ids: List[int]


class RescheduleDependenciesRequest(BaseModel):
    days_shift: int


# --- Bulk Action Schemas ---
class BulkTaskActionRequest(BaseModel):
    task_ids: List[int] = Field(..., min_length=1)
    action: str  # assign, change_status, set_priority, set_dates, add_tags, remove_tags, archive, delete
    assignee_id: Optional[int] = None
    assignee_ids: Optional[List[int]] = None
    status_id: Optional[int] = None
    priority: Optional[TaskPriority] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    tag_ids: Optional[List[int]] = None


class BulkTaskActionResponse(BaseModel):
    success: bool
    affected_count: int
    message: str


# --- Task Template Schemas ---
class TaskTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    template_data: dict


class TaskTemplateOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    template_data: dict
    created_by: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Task Automation Schemas ---
class TaskAutomationRuleCreate(BaseModel):
    project_id: Optional[int] = None
    trigger_event: str
    conditions: Optional[dict] = None
    actions: dict
    is_active: bool = True


class TaskAutomationRuleOut(BaseModel):
    id: int
    project_id: Optional[int] = None
    trigger_event: str
    conditions: Optional[dict] = None
    actions: dict
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Project Milestone & Project Schemas ---
class ProjectMilestoneBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[date] = None
    is_completed: bool = False


class ProjectMilestoneCreate(ProjectMilestoneBase):
    pass


class ProjectMilestoneUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[date] = None
    is_completed: Optional[bool] = None


class ProjectMilestoneOut(ProjectMilestoneBase):
    id: int
    project_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


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
    options: Optional[Any] = None
    display_order: int = 0


class CustomFieldDefinitionCreate(CustomFieldDefinitionBase):
    pass


class CustomFieldDefinitionUpdate(BaseModel):
    name: Optional[str] = None
    label: Optional[str] = None
    field_type: Optional[str] = None
    is_required: Optional[bool] = None
    options: Optional[Any] = None
    display_order: Optional[int] = None


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
    category: TaskStatusCategory = TaskStatusCategory.ACTIVE
    display_order: int = 0
    is_terminal: bool = False


class StatusDefinitionCreate(StatusDefinitionBase):
    pass


class StatusDefinitionUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    category: Optional[TaskStatusCategory] = None
    display_order: Optional[int] = None
    is_terminal: Optional[bool] = None


class StatusDefinitionOut(StatusDefinitionBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
