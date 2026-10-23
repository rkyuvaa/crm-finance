"""add target_start_time to projects

Revision ID: c9d0e1224a5b
Revises: b8a9f0113c4d
Create Date: 2026-10-23 16:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c9d0e1224a5b'
down_revision: Union[str, None] = 'b8a9f0113c4d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    project_cols = [c['name'] for c in inspector.get_columns('projects')]
    with op.batch_alter_table('projects') as batch_op:
        if 'target_start_time' not in project_cols:
            batch_op.add_column(sa.Column('target_start_time', sa.String(length=10), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('projects') as batch_op:
        try:
            batch_op.drop_column('target_start_time')
        except Exception:
            pass
