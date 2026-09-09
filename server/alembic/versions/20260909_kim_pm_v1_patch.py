"""kim_pm_v1_patch - Add KIM PM Tool v1.1 columns safely

Revision ID: 20260909_kim_pm_v1_patch
Revises: 20260904_tasks_clickup
Create Date: 2026-09-09

Additive-only migration: adds new columns without dropping or altering
any existing columns or data. Safe to run against existing data.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '20260909_kim_pm_v1_patch'
down_revision: Union[str, None] = '20260904_tasks_clickup'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- projects: add prefix and rollup date fields ---
    with op.batch_alter_table('projects', schema=None) as batch_op:
        batch_op.add_column(sa.Column('prefix', sa.String(length=3), nullable=True))
        batch_op.add_column(sa.Column('rollup_start_date', sa.Date(), nullable=True))
        batch_op.add_column(sa.Column('rollup_end_date', sa.Date(), nullable=True))

    # --- project_milestones: add rollup fields (keep due_date/is_completed) ---
    with op.batch_alter_table('project_milestones', schema=None) as batch_op:
        batch_op.add_column(sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('rollup_start_date', sa.Date(), nullable=True))
        batch_op.add_column(sa.Column('rollup_end_date', sa.Date(), nullable=True))
        batch_op.add_column(sa.Column('rollup_estimated_cost', sa.Float(), nullable=False, server_default='0.0'))
        batch_op.add_column(sa.Column('rollup_actual_cost', sa.Float(), nullable=False, server_default='0.0'))
        batch_op.add_column(sa.Column('rollup_duration_days', sa.Integer(), nullable=True))

    # --- tasks: add scheduling & cost fields ---
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.add_column(sa.Column('milestone_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('duration_working_days', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('estimated_cost', sa.Float(), nullable=False, server_default='0.0'))
        batch_op.add_column(sa.Column('actual_cost', sa.Float(), nullable=False, server_default='0.0'))
        batch_op.add_column(sa.Column('completion_date', sa.Date(), nullable=True))
        # Create FK index (SQLite: no ALTER COLUMN for FK, just index)
        batch_op.create_index('ix_tasks_milestone_id', ['milestone_id'], unique=False)

    # --- task_statuses: add status behaviour flags ---
    with op.batch_alter_table('task_statuses', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_completed_type', sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column('exclude_from_active_totals', sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column('is_default_on_create', sa.Boolean(), nullable=False, server_default=sa.false()))

    # --- task_dependencies: add pm_dep_type (FS/SS/FF/SF) and lag_days, keeping original columns ---
    with op.batch_alter_table('task_dependencies', schema=None) as batch_op:
        batch_op.add_column(sa.Column('pm_dep_type', sa.String(length=2), nullable=True))
        batch_op.add_column(sa.Column('lag_days', sa.Integer(), nullable=False, server_default='0'))

    # --- new tables (IF NOT EXISTS to handle partially-applied previous migration) ---
    op.create_table(
        'working_calendar_holidays',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('holiday_date', sa.Date(), nullable=False),
        sa.Column('description', sa.String(200), nullable=False),
        sa.Column('recurs_yearly', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.UniqueConstraint('holiday_date', name='uq_holiday_date'),
        if_not_exists=True,
    )

    op.create_table(
        'weekly_off_days',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('day_of_week', sa.Integer(), nullable=False),
        sa.UniqueConstraint('day_of_week', name='uq_weekly_off_day'),
        if_not_exists=True,
    )


def downgrade() -> None:
    op.drop_table('weekly_off_days')
    op.drop_table('working_calendar_holidays')

    with op.batch_alter_table('task_dependencies', schema=None) as batch_op:
        batch_op.drop_column('lag_days')
        batch_op.drop_column('pm_dep_type')

    with op.batch_alter_table('task_statuses', schema=None) as batch_op:
        batch_op.drop_column('is_default_on_create')
        batch_op.drop_column('exclude_from_active_totals')
        batch_op.drop_column('is_completed_type')

    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.drop_index('ix_tasks_milestone_id')
        batch_op.drop_column('completion_date')
        batch_op.drop_column('actual_cost')
        batch_op.drop_column('estimated_cost')
        batch_op.drop_column('duration_working_days')
        batch_op.drop_column('milestone_id')

    with op.batch_alter_table('project_milestones', schema=None) as batch_op:
        batch_op.drop_column('rollup_duration_days')
        batch_op.drop_column('rollup_actual_cost')
        batch_op.drop_column('rollup_estimated_cost')
        batch_op.drop_column('rollup_end_date')
        batch_op.drop_column('rollup_start_date')
        batch_op.drop_column('display_order')

    with op.batch_alter_table('projects', schema=None) as batch_op:
        batch_op.drop_column('rollup_end_date')
        batch_op.drop_column('rollup_start_date')
        batch_op.drop_column('prefix')
