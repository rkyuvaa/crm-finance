"""project_pm_settings - Add per-project PM scheduling preferences table

Revision ID: 20260910_pm_settings
Revises: 20260909_kim_pm_v1_patch
Create Date: 2026-09-10
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '20260910_pm_settings'
down_revision: Union[str, None] = '20260909_kim_pm_v1_patch'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'project_pm_settings',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('project_id', sa.Integer(), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('default_dep_type', sa.String(length=2), nullable=False, server_default='FS'),
        sa.Column('auto_shift_successors', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('prompt_on_reschedule', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        if_not_exists=True,
    )


def downgrade() -> None:
    op.drop_table('project_pm_settings')
