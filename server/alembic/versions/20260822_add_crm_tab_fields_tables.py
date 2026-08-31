"""add crm_tab_fields and crm_lead_custom_field_values tables

Revision ID: a8e9f01c2b3d
Revises: b7d90390a88c
Create Date: 2026-08-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a8e9f01c2b3d'
down_revision: Union[str, None] = 'b7d90390a88c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'crm_tab_fields',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tab_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=60), nullable=False),
        sa.Column('label', sa.String(length=120), nullable=False),
        sa.Column('field_type', sa.String(length=30), server_default='text', nullable=False),
        sa.Column('is_required', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('is_visible', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('is_readonly', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('is_searchable', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('is_filterable', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('is_sortable', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('is_archived', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('display_order', sa.Integer(), server_default='0', nullable=False),
        sa.Column('placeholder', sa.String(length=255), nullable=True),
        sa.Column('help_text', sa.Text(), nullable=True),
        sa.Column('default_value', sa.Text(), nullable=True),
        sa.Column('options', sa.JSON(), nullable=True),
        sa.Column('file_config', sa.JSON(), nullable=True),
        sa.Column('field_permissions', sa.JSON(), nullable=True),
        sa.Column('stage_rules', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['tab_id'], ['crm_tabs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_crm_tab_fields_name'), 'crm_tab_fields', ['name'], unique=False)
    op.create_index(op.f('ix_crm_tab_fields_tab_id'), 'crm_tab_fields', ['tab_id'], unique=False)

    op.create_table(
        'crm_lead_custom_field_values',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('application_id', sa.Integer(), nullable=False),
        sa.Column('field_id', sa.Integer(), nullable=False),
        sa.Column('value', sa.Text(), nullable=True),
        sa.Column('file_metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['application_id'], ['applications.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['field_id'], ['crm_tab_fields.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_crm_lead_custom_field_values_application_id'), 'crm_lead_custom_field_values', ['application_id'], unique=False)
    op.create_index(op.f('ix_crm_lead_custom_field_values_field_id'), 'crm_lead_custom_field_values', ['field_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_crm_lead_custom_field_values_field_id'), table_name='crm_lead_custom_field_values')
    op.drop_index(op.f('ix_crm_lead_custom_field_values_application_id'), table_name='crm_lead_custom_field_values')
    op.drop_table('crm_lead_custom_field_values')
    op.drop_index(op.f('ix_crm_tab_fields_tab_id'), table_name='crm_tab_fields')
    op.drop_index(op.f('ix_crm_tab_fields_name'), table_name='crm_tab_fields')
    op.drop_table('crm_tab_fields')
