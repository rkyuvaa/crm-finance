from datetime import datetime, date
from typing import TYPE_CHECKING, List
import enum

from sqlalchemy import DateTime, Enum, ForeignKey, String, func, Date, Float, Boolean, Integer, Text, UniqueConstraint, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.application import Application


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

class TaskStatusDef(Base):
    """Configurable task statuses"""
    __tablename__ = "task_statuses"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    color: Mapped[str] = mapped_column(String(20), default="#E2E8F0", nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_terminal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class TaskPriority(enum.StrEnum):
    URGENT = "URGENT"
    HIGH = "HIGH"
    NORMAL = "NORMAL"
    LOW = "LOW"


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
    """Task master entity with subtasks, checklists, and timesheets"""
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    parent_task_id: Mapped[int | None] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(250), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    type_id: Mapped[int | None] = mapped_column(ForeignKey("task_types.id", ondelete="SET NULL"), nullable=True)
    status_id: Mapped[int | None] = mapped_column(ForeignKey("task_statuses.id", ondelete="SET NULL"), nullable=True, index=True)
    priority: Mapped[TaskPriority] = mapped_column(
        Enum(TaskPriority, name="task_priority"), default=TaskPriority.NORMAL, nullable=False, index=True
    )
    assignee_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    estimated_hours: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    actual_hours: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    tags: Mapped[str | None] = mapped_column(String(300), nullable=True)  # Comma-separated tags
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.current_timestamp(), onupdate=func.current_timestamp()
    )

    project: Mapped["Project | None"] = relationship("Project", back_populates="tasks")
    task_type: Mapped["TaskType | None"] = relationship("TaskType")
    status_def: Mapped["TaskStatusDef | None"] = relationship("TaskStatusDef")
    assignee: Mapped["User | None"] = relationship("User", foreign_keys=[assignee_id], lazy="joined")
    subtasks: Mapped[List["TaskSubtask"]] = relationship("TaskSubtask", back_populates="task", cascade="all, delete-orphan")
    time_logs: Mapped[List["TaskTimeLog"]] = relationship("TaskTimeLog", back_populates="task", cascade="all, delete-orphan")
    comments: Mapped[List["TaskComment"]] = relationship("TaskComment", back_populates="task", cascade="all, delete-orphan")
    attachments: Mapped[List["TaskAttachment"]] = relationship("TaskAttachment", back_populates="task", cascade="all, delete-orphan")


class TaskAttachment(Base):
    """File attachments linked to tasks"""
    __tablename__ = "task_attachments"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size: Mapped[str | None] = mapped_column(String(50), nullable=True)
    file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())

    task: Mapped["Task"] = relationship("Task", back_populates="attachments")


class TaskSubtask(Base):
    """Subtasks / checklists under a task"""
    __tablename__ = "task_subtasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(250), nullable=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())

    task: Mapped["Task"] = relationship("Task", back_populates="subtasks")


class TaskTimeLog(Base):
    """Timesheet log entries for tracking work duration"""
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
    """Discussion comments on tasks"""
    __tablename__ = "task_comments"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())

    task: Mapped["Task"] = relationship("Task", back_populates="comments")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], lazy="joined")


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

