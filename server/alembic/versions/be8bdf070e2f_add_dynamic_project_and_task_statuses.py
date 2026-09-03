"""Add dynamic project and task statuses

Revision ID: be8bdf070e2f
Revises: 20260903_create_projects_tasks
Create Date: 2026-09-03 16:58:36.188953

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'be8bdf070e2f'
down_revision: Union[str, None] = '20260903_create_projects_tasks'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('project_statuses',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('color', sa.String(length=20), nullable=False),
    sa.Column('display_order', sa.Integer(), nullable=False),
    sa.Column('is_terminal', sa.Boolean(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('project_types',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('description', sa.String(length=500), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('task_statuses',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('color', sa.String(length=20), nullable=False),
    sa.Column('display_order', sa.Integer(), nullable=False),
    sa.Column('is_terminal', sa.Boolean(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('task_types',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('icon', sa.String(length=50), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )

    with op.batch_alter_table('projects', schema=None) as batch_op:
        batch_op.add_column(sa.Column('type_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('status_id', sa.Integer(), nullable=True))
        batch_op.drop_index(batch_op.f('ix_projects_status'))
        batch_op.create_index(batch_op.f('ix_projects_status_id'), ['status_id'], unique=False)
        batch_op.create_foreign_key('fk_projects_status_id', 'project_statuses', ['status_id'], ['id'], ondelete='SET NULL')
        batch_op.create_foreign_key('fk_projects_type_id', 'project_types', ['type_id'], ['id'], ondelete='SET NULL')
        batch_op.drop_column('status')

    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.add_column(sa.Column('type_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('status_id', sa.Integer(), nullable=True))
        batch_op.drop_index(batch_op.f('ix_tasks_status'))
        batch_op.create_index(batch_op.f('ix_tasks_status_id'), ['status_id'], unique=False)
        batch_op.create_foreign_key('fk_tasks_status_id', 'task_statuses', ['status_id'], ['id'], ondelete='SET NULL')
        batch_op.create_foreign_key('fk_tasks_type_id', 'task_types', ['type_id'], ['id'], ondelete='SET NULL')
        batch_op.drop_column('status')


def downgrade() -> None:
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.add_column(sa.Column('status', sa.VARCHAR(length=50), server_default=sa.text("'TODO'"), nullable=False))
        batch_op.drop_constraint('fk_tasks_status_id', type_='foreignkey')
        batch_op.drop_constraint('fk_tasks_type_id', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_tasks_status_id'))
        batch_op.create_index(batch_op.f('ix_tasks_status'), ['status'], unique=False)
        batch_op.drop_column('status_id')
        batch_op.drop_column('type_id')

    with op.batch_alter_table('projects', schema=None) as batch_op:
        batch_op.add_column(sa.Column('status', sa.VARCHAR(length=50), server_default=sa.text("'PLANNING'"), nullable=False))
        batch_op.drop_constraint('fk_projects_status_id', type_='foreignkey')
        batch_op.drop_constraint('fk_projects_type_id', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_projects_status_id'))
        batch_op.create_index(batch_op.f('ix_projects_status'), ['status'], unique=False)
        batch_op.drop_column('status_id')
        batch_op.drop_column('type_id')

    op.drop_table('task_types')
    op.drop_table('task_statuses')
    op.drop_table('project_types')
    op.drop_table('project_statuses')
