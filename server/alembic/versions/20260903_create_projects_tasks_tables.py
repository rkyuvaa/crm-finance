"""Create Projects and Tasks module tables

Revision ID: 20260903_create_projects_tasks
Revises: 20260903_create_hr_tables
Create Date: 2026-09-03
"""

from alembic import op
import sqlalchemy as sa

revision = '20260903_create_projects_tasks'
down_revision = '20260903_create_hr_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. project_workspaces
    op.create_table(
        'project_workspaces',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column('name', sa.String(150), nullable=False),
        sa.Column('description', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False)
    )

    # 2. project_spaces
    op.create_table(
        'project_spaces',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column('workspace_id', sa.Integer(), sa.ForeignKey('project_workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(150), nullable=False),
        sa.Column('description', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False)
    )

    # 3. projects
    op.create_table(
        'projects',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('code', sa.String(50), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('space_id', sa.Integer(), sa.ForeignKey('project_spaces.id', ondelete='SET NULL'), nullable=True),
        sa.Column('lead_id', sa.Integer(), sa.ForeignKey('applications.id', ondelete='SET NULL'), nullable=True),
        sa.Column('category', sa.String(100), server_default='General', nullable=False),
        sa.Column('status', sa.String(50), server_default='PLANNING', nullable=False),
        sa.Column('progress', sa.Integer(), server_default='0', nullable=False),
        sa.Column('budget', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('estimated_cost', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('actual_cost', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('target_start_date', sa.Date(), nullable=True),
        sa.Column('target_end_date', sa.Date(), nullable=True),
        sa.Column('owner_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False)
    )
    op.create_index('ix_projects_name', 'projects', ['name'])
    op.create_index('ix_projects_code', 'projects', ['code'])
    op.create_index('ix_projects_lead_id', 'projects', ['lead_id'])
    op.create_index('ix_projects_status', 'projects', ['status'])

    # 4. project_milestones
    op.create_table(
        'project_milestones',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column('project_id', sa.Integer(), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.String(500), nullable=True),
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('is_completed', sa.Boolean(), server_default=sa.text('FALSE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False)
    )
    op.create_index('ix_project_milestones_project_id', 'project_milestones', ['project_id'])

    # 5. tasks
    op.create_table(
        'tasks',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column('project_id', sa.Integer(), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=True),
        sa.Column('parent_task_id', sa.Integer(), sa.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=True),
        sa.Column('title', sa.String(250), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(50), server_default='TODO', nullable=False),
        sa.Column('priority', sa.String(50), server_default='NORMAL', nullable=False),
        sa.Column('assignee_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('estimated_hours', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('actual_hours', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('tags', sa.String(300), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False)
    )
    op.create_index('ix_tasks_project_id', 'tasks', ['project_id'])
    op.create_index('ix_tasks_parent_task_id', 'tasks', ['parent_task_id'])
    op.create_index('ix_tasks_title', 'tasks', ['title'])
    op.create_index('ix_tasks_status', 'tasks', ['status'])
    op.create_index('ix_tasks_priority', 'tasks', ['priority'])
    op.create_index('ix_tasks_assignee_id', 'tasks', ['assignee_id'])

    # 6. task_subtasks
    op.create_table(
        'task_subtasks',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column('task_id', sa.Integer(), sa.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(250), nullable=False),
        sa.Column('is_completed', sa.Boolean(), server_default=sa.text('FALSE'), nullable=False),
        sa.Column('display_order', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False)
    )
    op.create_index('ix_task_subtasks_task_id', 'task_subtasks', ['task_id'])

    # 7. task_time_logs
    op.create_table(
        'task_time_logs',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column('task_id', sa.Integer(), sa.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('hours', sa.Float(), nullable=False),
        sa.Column('log_date', sa.Date(), server_default=sa.func.current_date(), nullable=False),
        sa.Column('description', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False)
    )
    op.create_index('ix_task_time_logs_task_id', 'task_time_logs', ['task_id'])

    # 8. task_comments
    op.create_table(
        'task_comments',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column('task_id', sa.Integer(), sa.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False)
    )
    op.create_index('ix_task_comments_task_id', 'task_comments', ['task_id'])


def downgrade() -> None:
    op.drop_table('task_comments')
    op.drop_table('task_time_logs')
    op.drop_table('task_subtasks')
    op.drop_table('tasks')
    op.drop_table('project_milestones')
    op.drop_table('projects')
    op.drop_table('project_spaces')
    op.drop_table('project_workspaces')
