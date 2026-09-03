"""Add project and task custom fields

Revision ID: bb0eac034604
Revises: be8bdf070e2f
Create Date: 2026-09-03 20:23:52.647823

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'bb0eac034604'
down_revision: Union[str, None] = 'be8bdf070e2f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('project_custom_field_definitions',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=60), nullable=False),
    sa.Column('label', sa.String(length=120), nullable=False),
    sa.Column('field_type', sa.String(length=30), nullable=False),
    sa.Column('is_required', sa.Boolean(), nullable=False),
    sa.Column('options', sa.JSON(), nullable=True),
    sa.Column('display_order', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('project_custom_field_definitions', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_project_custom_field_definitions_name'), ['name'], unique=False)

    op.create_table('task_custom_field_definitions',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=60), nullable=False),
    sa.Column('label', sa.String(length=120), nullable=False),
    sa.Column('field_type', sa.String(length=30), nullable=False),
    sa.Column('is_required', sa.Boolean(), nullable=False),
    sa.Column('options', sa.JSON(), nullable=True),
    sa.Column('display_order', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('task_custom_field_definitions', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_task_custom_field_definitions_name'), ['name'], unique=False)

    op.create_table('project_custom_field_values',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('project_id', sa.Integer(), nullable=False),
    sa.Column('field_id', sa.Integer(), nullable=False),
    sa.Column('value', sa.Text(), nullable=True),
    sa.ForeignKeyConstraint(['field_id'], ['project_custom_field_definitions.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('project_custom_field_values', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_project_custom_field_values_field_id'), ['field_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_project_custom_field_values_project_id'), ['project_id'], unique=False)

    op.create_table('task_custom_field_values',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('task_id', sa.Integer(), nullable=False),
    sa.Column('field_id', sa.Integer(), nullable=False),
    sa.Column('value', sa.Text(), nullable=True),
    sa.ForeignKeyConstraint(['field_id'], ['task_custom_field_definitions.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('task_custom_field_values', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_task_custom_field_values_field_id'), ['field_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_task_custom_field_values_task_id'), ['task_id'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('task_custom_field_values', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_task_custom_field_values_task_id'))
        batch_op.drop_index(batch_op.f('ix_task_custom_field_values_field_id'))
    op.drop_table('task_custom_field_values')

    with op.batch_alter_table('project_custom_field_values', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_project_custom_field_values_project_id'))
        batch_op.drop_index(batch_op.f('ix_project_custom_field_values_field_id'))
    op.drop_table('project_custom_field_values')

    with op.batch_alter_table('task_custom_field_definitions', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_task_custom_field_definitions_name'))
    op.drop_table('task_custom_field_definitions')

    with op.batch_alter_table('project_custom_field_definitions', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_project_custom_field_definitions_name'))
    op.drop_table('project_custom_field_definitions')
