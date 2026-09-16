"""add auto_schedule to tasks

Revision ID: 20260916_auto_sched
Revises: 20260910_project_pm_settings
Create Date: 2026-09-16 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '20260916_auto_sched'
down_revision = '20260910_project_pm_settings'
branch_labels = None
depends_on = None


def upgrade():
    try:
        op.add_column('tasks', sa.Column('auto_schedule', sa.Boolean(), server_default='true', nullable=True))
        op.execute('UPDATE tasks SET auto_schedule = TRUE WHERE auto_schedule IS NULL')
    except Exception:
        pass


def downgrade():
    try:
        op.drop_column('tasks', 'auto_schedule')
    except Exception:
        pass
