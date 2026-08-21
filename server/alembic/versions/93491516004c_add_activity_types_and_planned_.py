"""add activity_types and planned_activities tables

Revision ID: 93491516004c
Revises: cf5982952824
Create Date: 2026-08-21 11:43:34.372388

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '93491516004c'
down_revision: Union[str, None] = 'cf5982952824'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'activity_types',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=60), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('icon', sa.String(length=40), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_activity_types_name'), 'activity_types', ['name'], unique=True)

    op.create_table(
        'planned_activities',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('application_id', sa.Integer(), nullable=False),
        sa.Column('activity_type_id', sa.Integer(), nullable=True),
        sa.Column('activity_type_name', sa.String(length=60), nullable=False),
        sa.Column('subject', sa.String(length=120), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('assigned_to', sa.Integer(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['activity_type_id'], ['activity_types.id'], ),
        sa.ForeignKeyConstraint(['application_id'], ['applications.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_to'], ['users.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_planned_activities_application_id'), 'planned_activities', ['application_id'], unique=False)
    op.create_index(op.f('ix_planned_activities_status'), 'planned_activities', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_planned_activities_status'), table_name='planned_activities')
    op.drop_index(op.f('ix_planned_activities_application_id'), table_name='planned_activities')
    op.drop_table('planned_activities')
    op.drop_index(op.f('ix_activity_types_name'), table_name='activity_types')
    op.drop_table('activity_types')
