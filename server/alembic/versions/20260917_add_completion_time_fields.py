"""add completion_time to tasks and projects

Revision ID: 20260917_compl_time
Revises: 20260917_perf_indexes
Create Date: 2026-09-17
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '20260917_compl_time'
down_revision: Union[str, None] = '20260917_perf_indexes'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # 1. Add completion_time to tasks
    task_cols = [c['name'] for c in inspector.get_columns('tasks')]
    if 'completion_time' not in task_cols:
        with op.batch_alter_table('tasks') as batch_op:
            batch_op.add_column(sa.Column('completion_time', sa.String(length=10), nullable=True))

    # 2. Add completion fields to projects
    project_cols = [c['name'] for c in inspector.get_columns('projects')]
    with op.batch_alter_table('projects') as batch_op:
        if 'target_end_time' not in project_cols:
            batch_op.add_column(sa.Column('target_end_time', sa.String(length=10), nullable=True))
        if 'completion_date' not in project_cols:
            batch_op.add_column(sa.Column('completion_date', sa.Date(), nullable=True))
        if 'completion_time' not in project_cols:
            batch_op.add_column(sa.Column('completion_time', sa.String(length=10), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('projects') as batch_op:
        try:
            batch_op.drop_column('completion_time')
            batch_op.drop_column('completion_date')
            batch_op.drop_column('target_end_time')
        except Exception:
            pass

    with op.batch_alter_table('tasks') as batch_op:
        try:
            batch_op.drop_column('completion_time')
        except Exception:
            pass
