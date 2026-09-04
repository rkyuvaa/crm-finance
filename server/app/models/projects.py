from datetime import datetime, date
from typing import TYPE_CHECKING, List
import enum

from sqlalchemy import (
    DateTime, Enum, ForeignKey, String, func, Date, Float, Boolean, Integer, Text, UniqueConstraint, JSON
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.application import Application
    from app.models.finance_company import FinanceCompany
    from app.models.branch import Branch
    from app.models.cost_center import CostCenter
    from app.models.rbac import Department


class ProjectType(Base):
    """Configurable project types"""
    __tablename__ = "project_types"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)


class ProjectStatusDef(Base):
    """Configurable project statuses"""
    __tablename__ = "project_statuses"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    color: Mapped[str] = mapped_column(String(20), default="#E2E8F0", nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_terminal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class TaskType(Base):
    """Configurable task types"""
    __tablename__ = "task_types"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)


class TaskStatusCategory(enum.StrEnum):
    NOT_STARTED = "NOT_STARTED"
    ACTIVE = "ACTIVE"
    DONE = "DONE"
    CLOSED = "CLOSED"


class TaskStatusDef(Base):
    """Configurable task statuses with category support"""
    __tablename__ = "task_statuses"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[TaskStatusCategory] = mapped_column(
        Enum(TaskStatusCategory, name="task_status_category"), default=TaskStatusCategory.ACTIVE, nullable=False
    )
    color: Mapped[str] = mapped_column(String(20), default="#E2E8F0", nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_terminal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class TaskPriority(enum.StrEnum):
    URGENT = "URGENT"
    HIGH = "HIGH"
    NORMAL = "NORMAL"
    LOW = "LOW"


class DependencyType(enum.StrEnum):
    BLOCKS = "BLOCKS"
    BLOCKED_BY = "BLOCKED_BY"
    WAITING_ON = "WAITING_ON"


class RelationshipType(enum.StrEnum):
    RELATED = "RELATED"
    LINKED = "LINKED"
    DUPLICATE = "DUPLICATE"


class ProjectWorkspace(Base):
    """Top-level workspace container for projects and spaces"""
    __tablename__ = "project_workspaces"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())

    spaces: Mapped[List["ProjectSpace"]] = relationship("ProjectSpace", back_populates="workspace", cascade="all, delete-orphan")


class ProjectSpace(Base):
    """Space division within a workspace (e.g. Engineering, Operations)"""
    __tablename__ = "project_spaces"

    id: Mapped[int] = mapped_column(primary_key=True)
    workspace_id: Mapped[int] = mapped_column(ForeignKey("project_workspaces.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())

    workspace: Mapped["ProjectWorkspace"] = relationship("ProjectWorkspace", back_populates="spaces")
    projects: Mapped[List["Project"]] = relationship("Project", back_populates="space")


class ProjectPhase(Base):
    """Phase / Folder / Group within a project"""
    __tablename__ = "project_phases"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    color: Mapped[str] = mapped_column(String(20), default="#64748B", nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())

    project: Mapped["Project"] = relationship("Project", back_populates="phases")
    tasks: Mapped[List["Task"]] = relationship("Task", back_populates="phase")


class Project(Base):
    """Project master entity linking CRM leads, tasks, and budgets"""
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    code: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    space_id: Mapped[int | None] = mapped_column(ForeignKey("project_spaces.id", ondelete="SET NULL"), nullable=True)
    lead_id: Mapped[int | None] = mapped_column(ForeignKey("applications.id", ondelete="SET NULL"), nullable=True, index=True)
    category: Mapped[str] = mapped_column(String(100), default="General", nullable=False)
    type_id: Mapped[int | None] = mapped_column(ForeignKey("project_types.id", ondelete="SET NULL"), nullable=True)
    status_id: Mapped[int | None] = mapped_column(ForeignKey("project_statuses.id", ondelete="SET NULL"), nullable=True, index=True)
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # 0 to 100%
    budget: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    estimated_cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    actual_cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    target_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    target_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.current_timestamp(), onupdate=func.current_timestamp()
    )

    space: Mapped["ProjectSpace | None"] = relationship("ProjectSpace", back_populates="projects")
    project_type: Mapped["ProjectType | None"] = relationship("ProjectType")
    status_def: Mapped["ProjectStatusDef | None"] = relationship("ProjectStatusDef")
    lead: Mapped["Application | None"] = relationship("Application", foreign_keys=[lead_id], lazy="joined")
    owner: Mapped["User | None"] = relationship("User", foreign_keys=[owner_id], lazy="joined")
    phases: Mapped[List["ProjectPhase"]] = relationship("ProjectPhase", back_populates="project", cascade="all, delete-orphan")
    milestones: Mapped[List["ProjectMilestone"]] = relationship("ProjectMilestone", back_populates="project", cascade="all, delete-orphan")
    tasks: Mapped[List["Task"]] = relationship("Task", back_populates="project", cascade="all, delete-orphan")


class ProjectMilestone(Base):
    """Key milestones within a project"""
    __tablename__ = "project_milestones"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())

    project: Mapped["Project"] = relationship("Project", back_populates="milestones")


class Task(Base):
    """Complete Enterprise Work-Management Task Entity (ClickUp-Inspired)"""
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    phase_id: Mapped[int | None] = mapped_column(ForeignKey("project_phases.id", ondelete="SET NULL"), nullable=True, index=True)
    parent_task_id: Mapped[int | None] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True, index=True)
    
    title: Mapped[str] = mapped_column(String(250), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    type_id: Mapped[int | None] = mapped_column(ForeignKey("task_types.id", ondelete="SET NULL"), nullable=True)
    status_id: Mapped[int | None] = mapped_column(ForeignKey("task_statuses.id", ondelete="SET NULL"), nullable=True, index=True)
    priority: Mapped[TaskPriority] = mapped_column(
        Enum(TaskPriority, name="task_priority"), default=TaskPriority.NORMAL, nullable=False, index=True
    )

    assignee_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    completed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    start_time: Mapped[str | None] = mapped_column(String(10), nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    due_time: Mapped[str | None] = mapped_column(String(10), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    estimated_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    actual_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    estimated_hours: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    actual_hours: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    progress_percentage: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)

    company_id: Mapped[int | None] = mapped_column(ForeignKey("finance_companies.id", ondelete="SET NULL"), nullable=True, index=True)
    branch_id: Mapped[int | None] = mapped_column(ForeignKey("branches.id", ondelete="SET NULL"), nullable=True, index=True)
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)
    cost_center_id: Mapped[int | None] = mapped_column(ForeignKey("cost_centers.id", ondelete="SET NULL"), nullable=True, index=True)

    recurrence_rule: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    tags: Mapped[str | None] = mapped_column(String(300), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp(), index=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.current_timestamp(), onupdate=func.current_timestamp()
    )

    # Relationships
    project: Mapped["Project | None"] = relationship("Project", back_populates="tasks")
    phase: Mapped["ProjectPhase | None"] = relationship("ProjectPhase", back_populates="tasks")
    task_type: Mapped["TaskType | None"] = relationship("TaskType")
    status_def: Mapped["TaskStatusDef | None"] = relationship("TaskStatusDef")
    
    creator: Mapped["User | None"] = relationship("User", foreign_keys=[created_by], lazy="joined")
    updater: Mapped["User | None"] = relationship("User", foreign_keys=[updated_by], lazy="joined")
    completer: Mapped["User | None"] = relationship("User", foreign_keys=[completed_by], lazy="joined")
    assignee: Mapped["User | None"] = relationship("User", foreign_keys=[assignee_id], lazy="joined")

    company: Mapped["FinanceCompany | None"] = relationship("FinanceCompany", lazy="joined")
    branch: Mapped["Branch | None"] = relationship("Branch", lazy="joined")
    department: Mapped["Department | None"] = relationship("Department", lazy="joined")
    cost_center: Mapped["CostCenter | None"] = relationship("CostCenter", lazy="joined")

    parent_task: Mapped["Task | None"] = relationship("Task", remote_side=[id], back_populates="subtask_items", lazy="joined")
    subtask_items: Mapped[List["Task"]] = relationship("Task", back_populates="parent_task", cascade="all, delete-orphan")

    assignees: Mapped[List["TaskAssignee"]] = relationship("TaskAssignee", back_populates="task", cascade="all, delete-orphan")
    followers: Mapped[List["TaskFollower"]] = relationship("TaskFollower", back_populates="task", cascade="all, delete-orphan")
    checklists: Mapped[List["TaskChecklist"]] = relationship("TaskChecklist", back_populates="task", cascade="all, delete-orphan")
    time_entries: Mapped[List["TaskTimeEntry"]] = relationship("TaskTimeEntry", back_populates="task", cascade="all, delete-orphan")
    time_logs: Mapped[List["TaskTimeLog"]] = relationship("TaskTimeLog", back_populates="task", cascade="all, delete-orphan")
    comments: Mapped[List["TaskComment"]] = relationship("TaskComment", back_populates="task", cascade="all, delete-orphan")
    attachments: Mapped[List["TaskAttachment"]] = relationship("TaskAttachment", back_populates="task", cascade="all, delete-orphan")
    subtasks: Mapped[List["TaskSubtask"]] = relationship("TaskSubtask", back_populates="task", cascade="all, delete-orphan")
    tag_mappings: Mapped[List["TaskTagMap"]] = relationship("TaskTagMap", back_populates="task", cascade="all, delete-orphan")
    activities: Mapped[List["TaskActivity"]] = relationship("TaskActivity", back_populates="task", cascade="all, delete-orphan")


class TaskAssignee(Base):
    """Many-to-many relationship for task assignees"""
    __tablename__ = "task_assignees"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())

    task: Mapped["Task"] = relationship("Task", back_populates="assignees")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], lazy="joined")
    assigner: Mapped["User | None"] = relationship("User", foreign_keys=[assigned_by], lazy="joined")

    __table_args__ = (UniqueConstraint("task_id", "user_id", name="uq_task_user_assignee"),)


class TaskFollower(Base):
    """Many-to-many relationship for task followers / watchers"""
    __tablename__ = "task_followers"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())

    task: Mapped["Task"] = relationship("Task", back_populates="followers")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], lazy="joined")

    __table_args__ = (UniqueConstraint("task_id", "user_id", name="uq_task_user_follower"),)


class TaskTag(Base):
    """Tag entity for categorizing tasks"""
    __tablename__ = "task_tags"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    color: Mapped[str] = mapped_column(String(20), default="#3B82F6", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())


class TaskTagMap(Base):
    """Mapping between tasks and tags"""
    __tablename__ = "task_tag_mappings"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    tag_id: Mapped[int] = mapped_column(ForeignKey("task_tags.id", ondelete="CASCADE"), nullable=False, index=True)

    task: Mapped["Task"] = relationship("Task", back_populates="tag_mappings")
    tag: Mapped["TaskTag"] = relationship("TaskTag", lazy="joined")

    __table_args__ = (UniqueConstraint("task_id", "tag_id", name="uq_task_tag_map"),)


class TaskChecklist(Base):
    """Checklist within a task"""
    __tablename__ = "task_checklists"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())

    task: Mapped["Task"] = relationship("Task", back_populates="checklists")
    items: Mapped[List["TaskChecklistItem"]] = relationship("TaskChecklistItem", back_populates="checklist", cascade="all, delete-orphan")


class TaskChecklistItem(Base):
    """Individual item in a task checklist"""
    __tablename__ = "task_checklist_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    checklist_id: Mapped[int] = mapped_column(ForeignKey("task_checklists.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(250), nullable=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    assignee_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())

    checklist: Mapped["TaskChecklist"] = relationship("TaskChecklist", back_populates="items")
    assignee: Mapped["User | None"] = relationship("User", foreign_keys=[assignee_id], lazy="joined")
    completer: Mapped["User | None"] = relationship("User", foreign_keys=[completed_by], lazy="joined")


class TaskTimeEntry(Base):
    """Time tracking entry for work performed on a task"""
    __tablename__ = "task_time_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())

    task: Mapped["Task"] = relationship("Task", back_populates="time_entries")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], lazy="joined")


class TaskAttachment(Base):
    """File attachments linked to tasks"""
    __tablename__ = "task_attachments"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    uploaded_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size: Mapped[str | None] = mapped_column(String(50), nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    storage_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())

    task: Mapped["Task"] = relationship("Task", back_populates="attachments")
    uploader: Mapped["User | None"] = relationship("User", foreign_keys=[uploaded_by], lazy="joined")


class TaskSubtask(Base):
    """Legacy Subtask table for backwards compatibility"""
    __tablename__ = "task_subtasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(250), nullable=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())

    task: Mapped["Task"] = relationship("Task", back_populates="subtasks")


class TaskTimeLog(Base):
    """Legacy Timesheet log entries for backwards compatibility"""
    __tablename__ = "task_time_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    hours: Mapped[float] = mapped_column(Float, nullable=False)
    log_date: Mapped[date] = mapped_column(Date, nullable=False, server_default=func.current_date())
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())

    task: Mapped["Task"] = relationship("Task", back_populates="time_logs")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], lazy="joined")


class TaskComment(Base):
    """Discussion comments on tasks with soft delete support"""
    __tablename__ = "task_comments"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    task: Mapped["Task"] = relationship("Task", back_populates="comments")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], lazy="joined")


class TaskDependency(Base):
    """Dependency relations between tasks (Blocks, Blocked By, Waiting On)"""
    __tablename__ = "task_dependencies"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    depends_on_task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    dependency_type: Mapped[DependencyType] = mapped_column(
        Enum(DependencyType, name="task_dependency_type"), default=DependencyType.BLOCKS, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())

    task: Mapped["Task"] = relationship("Task", foreign_keys=[task_id])
    depends_on_task: Mapped["Task"] = relationship("Task", foreign_keys=[depends_on_task_id])

    __table_args__ = (UniqueConstraint("task_id", "depends_on_task_id", name="uq_task_dependency"),)


class TaskRelationship(Base):
    """Bidirectional relationships between tasks (Related, Linked, Duplicate)"""
    __tablename__ = "task_relationships"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    related_task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    relationship_type: Mapped[RelationshipType] = mapped_column(
        Enum(RelationshipType, name="task_relationship_type"), default=RelationshipType.RELATED, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())

    task: Mapped["Task"] = relationship("Task", foreign_keys=[task_id])
    related_task: Mapped["Task"] = relationship("Task", foreign_keys=[related_task_id])

    __table_args__ = (UniqueConstraint("task_id", "related_task_id", name="uq_task_relationship"),)


class TaskActivity(Base):
    """Immutable task activity log for auditing all changes"""
    __tablename__ = "task_activities"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    field_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    old_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp(), index=True)

    task: Mapped["Task"] = relationship("Task", back_populates="activities")
    actor: Mapped["User | None"] = relationship("User", foreign_keys=[actor_id], lazy="joined")


class TaskTemplate(Base):
    """Reusable task templates"""
    __tablename__ = "task_templates"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    template_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())

    creator: Mapped["User | None"] = relationship("User", foreign_keys=[created_by], lazy="joined")


class TaskAutomationRule(Base):
    """Configurable automation rules for task workflows"""
    __tablename__ = "task_automations"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    trigger_event: Mapped[str] = mapped_column(String(50), nullable=False)  # STATUS_CHANGE, TASK_OVERDUE, TASK_CREATED
    conditions: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    actions: Mapped[dict] = mapped_column(JSON, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())


class ProjectCustomFieldDefinition(Base):
    """Definition of custom fields for projects"""
    __tablename__ = "project_custom_field_definitions"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    field_type: Mapped[str] = mapped_column(String(30), default="text", nullable=False)  # text, number, select, date, currency
    is_required: Mapped[bool] = mapped_column(Boolean, default=False)
    options: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # {"choices": ["A", "B"]}
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())


class ProjectCustomFieldValue(Base):
    """Values for project custom fields"""
    __tablename__ = "project_custom_field_values"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    field_id: Mapped[int] = mapped_column(ForeignKey("project_custom_field_definitions.id", ondelete="CASCADE"), index=True, nullable=False)
    value: Mapped[str | None] = mapped_column(Text, nullable=True)


class TaskCustomFieldDefinition(Base):
    """Definition of custom fields for tasks"""
    __tablename__ = "task_custom_field_definitions"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    field_type: Mapped[str] = mapped_column(String(30), default="text", nullable=False)  # text, number, select, date, currency
    is_required: Mapped[bool] = mapped_column(Boolean, default=False)
    options: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())


class TaskCustomFieldValue(Base):
    """Values for task custom fields"""
    __tablename__ = "task_custom_field_values"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), index=True, nullable=False)
    field_id: Mapped[int] = mapped_column(ForeignKey("task_custom_field_definitions.id", ondelete="CASCADE"), index=True, nullable=False)
    value: Mapped[str | None] = mapped_column(Text, nullable=True)
