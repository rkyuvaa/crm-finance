"""add_color_to_pipeline_stages

Revision ID: d7c9a2daa76b
Revises: f1a2b3c4d5e6
Create Date: 2026-08-24 15:24:15.499075

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd7c9a2daa76b'
down_revision: Union[str, None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [c['name'] for c in inspector.get_columns('pipeline_stages')]
    if 'color' not in columns:
        op.add_column('pipeline_stages', sa.Column('color', sa.String(length=30), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [c['name'] for c in inspector.get_columns('pipeline_stages')]
    if 'color' in columns:
        op.drop_column('pipeline_stages', 'color')
