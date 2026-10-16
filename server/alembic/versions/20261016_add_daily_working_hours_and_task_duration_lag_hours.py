"""add_daily_working_hours_and_task_duration_lag_hours

Revision ID: a7f8e9102b3c
Revises: 4f02496002a9
Create Date: 2026-10-16 15:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a7f8e9102b3c'
down_revision: Union[str, None] = '4f02496002a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create working_calendar_settings table
    op.create_table(
        'working_calendar_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('work_start_time', sa.String(length=5), server_default='09:00', nullable=False),
        sa.Column('work_end_time', sa.String(length=5), server_default='18:00', nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # 2. Add duration_working_hours to tasks
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.add_column(sa.Column('duration_working_hours', sa.Integer(), server_default='0', nullable=True))

    # 3. Add lag_hours to task_dependencies
    with op.batch_alter_table('task_dependencies', schema=None) as batch_op:
        batch_op.add_column(sa.Column('lag_hours', sa.Integer(), server_default='0', nullable=False))


def downgrade() -> None:
    with op.batch_alter_table('task_dependencies', schema=None) as batch_op:
        batch_op.drop_column('lag_hours')

    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.drop_column('duration_working_hours')

    op.drop_table('working_calendar_settings')
