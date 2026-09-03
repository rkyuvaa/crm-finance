"""add crm_tabs tables

Revision ID: b7d90390a88c
Revises: 93491516004c
Create Date: 2026-08-21 16:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b7d90390a88c'
down_revision: Union[str, None] = '20260821_add_app_sequence'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'crm_tabs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('module_id', sa.String(length=40), nullable=False, server_default='crm'),
        sa.Column('name', sa.String(length=60), nullable=False),
        sa.Column('code', sa.String(length=40), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('icon', sa.String(length=40), nullable=True, server_default='Layers'),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('visibility_type', sa.String(length=20), nullable=False, server_default='EVERYONE'),
        sa.Column('allowed_roles', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_crm_tabs_code'), 'crm_tabs', ['code'], unique=True)
    op.create_index(op.f('ix_crm_tabs_module_id'), 'crm_tabs', ['module_id'], unique=False)

    op.create_table(
        'crm_tab_stage_mappings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tab_id', sa.Integer(), nullable=False),
        sa.Column('stage_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['stage_id'], ['pipeline_stages.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tab_id'], ['crm_tabs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'crm_tab_filters',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tab_id', sa.Integer(), nullable=False),
        sa.Column('field', sa.String(length=60), nullable=False),
        sa.Column('operator', sa.String(length=20), nullable=False),
        sa.Column('value', sa.Text(), nullable=False),
        sa.Column('logical_operator', sa.String(length=10), nullable=False, server_default='AND'),
        sa.ForeignKeyConstraint(['tab_id'], ['crm_tabs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('crm_tab_filters')
    op.drop_table('crm_tab_stage_mappings')
    op.drop_index(op.f('ix_crm_tabs_module_id'), table_name='crm_tabs')
    op.drop_index(op.f('ix_crm_tabs_code'), table_name='crm_tabs')
    op.drop_table('crm_tabs')
