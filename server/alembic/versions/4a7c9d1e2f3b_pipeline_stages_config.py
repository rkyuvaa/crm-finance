"""pipeline stages configuration

Revision ID: 4a7c9d1e2f3b
Revises: 2f1a5b8c3d4e
Create Date: 2026-08-12 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '4a7c9d1e2f3b'
down_revision: Union[str, None] = '2f1a5b8c3d4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('pipeline_stages',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('key', sa.String(length=40), nullable=False),
    sa.Column('label', sa.String(length=60), nullable=False),
    sa.Column('status', sa.Enum('LEAD', 'APPLICATION', 'VERIFICATION', 'FINANCE', 'QUERY', 'SANCTIONED', 'DELIVERY', 'DISBURSEMENT', 'COMPLETED', 'REJECTED', name='application_status'), nullable=False),
    sa.Column('order_index', sa.Integer(), nullable=False),
    sa.Column('enabled', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_pipeline_stages_key'), 'pipeline_stages', ['key'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_pipeline_stages_key'), table_name='pipeline_stages')
    op.drop_table('pipeline_stages')
