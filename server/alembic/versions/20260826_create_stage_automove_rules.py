"""create stage_automove_rules table

Revision ID: b8e9f02c3b4e
Revises: a8e9f01c2b3d
Create Date: 2026-08-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b8e9f02c3b4e'
down_revision: Union[str, None] = '0ccd9c691231'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'stage_automove_rules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('trigger_type', sa.String(length=40), server_default='standard_field', nullable=False),
        sa.Column('field_name', sa.String(length=100), nullable=True),
        sa.Column('field_id', sa.Integer(), nullable=True),
        sa.Column('condition_operator', sa.String(length=40), server_default='is_filled', nullable=False),
        sa.Column('condition_value', sa.Text(), nullable=True),
        sa.Column('source_stage_key', sa.String(length=40), nullable=True),
        sa.Column('target_status', sa.String(length=40), nullable=False),
        sa.Column('is_enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['field_id'], ['crm_tab_fields.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('stage_automove_rules')
