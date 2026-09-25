"""add_task_mgmt_enhancements

Revision ID: 4f02496002a9
Revises: b975938f1cc4
Create Date: 2026-09-25 13:45:54.397889

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '4f02496002a9'
down_revision: Union[str, None] = 'b975938f1cc4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.add_column(sa.Column('recurrence_end_date', sa.Date(), nullable=True))
        batch_op.add_column(sa.Column('recurring_task_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('reminder_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('reminder_status', sa.String(length=20), nullable=True, server_default="PENDING"))
        batch_op.create_index(batch_op.f('ix_tasks_recurring_task_id'), ['recurring_task_id'], unique=False)
        batch_op.create_foreign_key('fk_tasks_recurring_task_id_tasks', 'tasks', ['recurring_task_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.drop_constraint('fk_tasks_recurring_task_id_tasks', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_tasks_recurring_task_id'))
        batch_op.drop_column('reminder_status')
        batch_op.drop_column('reminder_at')
        batch_op.drop_column('recurring_task_id')
        batch_op.drop_column('recurrence_end_date')
