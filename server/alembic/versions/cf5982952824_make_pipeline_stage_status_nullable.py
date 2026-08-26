"""Make pipeline_stage status nullable

Revision ID: cf5982952824
Revises: 63018cc69a9a
Create Date: 2026-08-19 12:18:22.236107

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'cf5982952824'
down_revision: Union[str, None] = '63018cc69a9a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('pipeline_stages') as batch_op:
        batch_op.alter_column('status', existing_type=sa.VARCHAR(length=12), nullable=True)


def downgrade() -> None:
    with op.batch_alter_table('pipeline_stages') as batch_op:
        batch_op.alter_column('status', existing_type=sa.VARCHAR(length=12), nullable=False)
