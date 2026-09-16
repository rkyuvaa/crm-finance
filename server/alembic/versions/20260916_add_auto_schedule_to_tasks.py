"""add auto_schedule to tasks

Revision ID: 20260916_auto_sched
Revises: 20260910_pm_settings
Create Date: 2026-09-16
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '20260916_auto_sched'
down_revision: Union[str, None] = '20260910_pm_settings'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('tasks')]
    if 'auto_schedule' not in columns:
        op.add_column('tasks', sa.Column('auto_schedule', sa.Boolean(), server_default=sa.true(), nullable=True))
        op.execute('UPDATE tasks SET auto_schedule = TRUE WHERE auto_schedule IS NULL')


def downgrade() -> None:
    pass
