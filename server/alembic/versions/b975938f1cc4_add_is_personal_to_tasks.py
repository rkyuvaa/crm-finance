"""add_is_personal_to_tasks

Revision ID: b975938f1cc4
Revises: 20260917_compl_time
Create Date: 2026-09-25 12:11:09.424572

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b975938f1cc4'
down_revision: Union[str, None] = '20260917_compl_time'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_personal', sa.Boolean(), server_default=sa.text('false'), nullable=False))
        batch_op.create_index(batch_op.f('ix_tasks_is_personal'), ['is_personal'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_tasks_is_personal'))
        batch_op.drop_column('is_personal')
