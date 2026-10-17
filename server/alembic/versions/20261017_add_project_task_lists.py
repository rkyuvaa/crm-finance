"""add_project_task_lists

Revision ID: b8a9f0113c4d
Revises: a7f8e9102b3c
Create Date: 2026-10-17 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b8a9f0113c4d'
down_revision: Union[str, None] = 'a7f8e9102b3c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create project_task_lists table
    op.create_table(
        'project_task_lists',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('milestone_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('start_time', sa.String(length=10), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('end_time', sa.String(length=10), nullable=True),
        sa.Column('duration_working_days', sa.Integer(), nullable=True),
        sa.Column('duration_working_hours', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False),
        sa.ForeignKeyConstraint(['milestone_id'], ['project_milestones.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_project_task_lists_milestone_id'), 'project_task_lists', ['milestone_id'], unique=False)
    op.create_index(op.f('ix_project_task_lists_project_id'), 'project_task_lists', ['project_id'], unique=False)

    # 2. Add task_list_id to tasks table
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.add_column(sa.Column('task_list_id', sa.Integer(), nullable=True))
        batch_op.create_index(batch_op.f('ix_tasks_task_list_id'), ['task_list_id'], unique=False)
        batch_op.create_foreign_key('fk_tasks_task_list_id', 'project_task_lists', ['task_list_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.drop_constraint('fk_tasks_task_list_id', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_tasks_task_list_id'))
        batch_op.drop_column('task_list_id')

    op.drop_index(op.f('ix_project_task_lists_project_id'), table_name='project_task_lists')
    op.drop_index(op.f('ix_project_task_lists_milestone_id'), table_name='project_task_lists')
    op.drop_table('project_task_lists')
