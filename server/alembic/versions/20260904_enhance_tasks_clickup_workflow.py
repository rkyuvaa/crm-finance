"""Enhance tasks and project management for ClickUp workflow

Revision ID: 20260904_tasks_clickup
Revises: bb0eac034604
Create Date: 2026-09-04
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '20260904_tasks_clickup'
down_revision: Union[str, None] = 'bb0eac034604'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. cost_centers table
    op.create_table(
        'cost_centers',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('code', sa.String(50), nullable=False),
        sa.Column('name', sa.String(120), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('department_id', sa.Integer(), sa.ForeignKey('departments.id', name='fk_cc_department_id', ondelete='SET NULL'), nullable=True),
        sa.Column('company_id', sa.Integer(), sa.ForeignKey('finance_companies.id', name='fk_cc_company_id', ondelete='SET NULL'), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('TRUE')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False),
        sa.UniqueConstraint('code', name='uq_cost_centers_code')
    )
    op.create_index('ix_cost_centers_code', 'cost_centers', ['code'])
    op.create_index('ix_cost_centers_department_id', 'cost_centers', ['department_id'])
    op.create_index('ix_cost_centers_company_id', 'cost_centers', ['company_id'])

    # 2. branches table
    op.create_table(
        'branches',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('company_id', sa.Integer(), sa.ForeignKey('finance_companies.id', name='fk_branches_company_id', ondelete='SET NULL'), nullable=True),
        sa.Column('code', sa.String(50), nullable=False),
        sa.Column('name', sa.String(120), nullable=False),
        sa.Column('address', sa.String(255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('TRUE')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False),
        sa.UniqueConstraint('code', name='uq_branches_code')
    )
    op.create_index('ix_branches_code', 'branches', ['code'])
    op.create_index('ix_branches_company_id', 'branches', ['company_id'])

    # 3. project_phases table
    op.create_table(
        'project_phases',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('project_id', sa.Integer(), sa.ForeignKey('projects.id', name='fk_project_phases_project_id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(150), nullable=False),
        sa.Column('description', sa.String(500), nullable=True),
        sa.Column('color', sa.String(20), nullable=False, server_default='#64748B'),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False)
    )
    op.create_index('ix_project_phases_project_id', 'project_phases', ['project_id'])

    # 4. Alter task_statuses table to add category and is_active
    with op.batch_alter_table('task_statuses', schema=None) as batch_op:
        batch_op.add_column(sa.Column('category', sa.String(30), nullable=False, server_default='ACTIVE'))
        batch_op.add_column(sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('TRUE')))

    # 5. Alter tasks table to add new ClickUp columns
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.add_column(sa.Column('task_number', sa.String(50), nullable=True))
        batch_op.add_column(sa.Column('phase_id', sa.Integer(), sa.ForeignKey('project_phases.id', name='fk_tasks_phase_id', ondelete='SET NULL'), nullable=True))
        batch_op.add_column(sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id', name='fk_tasks_created_by', ondelete='SET NULL'), nullable=True))
        batch_op.add_column(sa.Column('updated_by', sa.Integer(), sa.ForeignKey('users.id', name='fk_tasks_updated_by', ondelete='SET NULL'), nullable=True))
        batch_op.add_column(sa.Column('completed_by', sa.Integer(), sa.ForeignKey('users.id', name='fk_tasks_completed_by', ondelete='SET NULL'), nullable=True))
        batch_op.add_column(sa.Column('start_time', sa.String(10), nullable=True))
        batch_op.add_column(sa.Column('due_time', sa.String(10), nullable=True))
        batch_op.add_column(sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('estimated_minutes', sa.Integer(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('actual_minutes', sa.Integer(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('progress_percentage', sa.Float(), nullable=False, server_default='0.0'))
        batch_op.add_column(sa.Column('is_completed', sa.Boolean(), nullable=False, server_default=sa.text('FALSE')))
        batch_op.add_column(sa.Column('is_archived', sa.Boolean(), nullable=False, server_default=sa.text('FALSE')))
        batch_op.add_column(sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('FALSE')))
        batch_op.add_column(sa.Column('company_id', sa.Integer(), sa.ForeignKey('finance_companies.id', name='fk_tasks_company_id', ondelete='SET NULL'), nullable=True))
        batch_op.add_column(sa.Column('branch_id', sa.Integer(), sa.ForeignKey('branches.id', name='fk_tasks_branch_id', ondelete='SET NULL'), nullable=True))
        batch_op.add_column(sa.Column('department_id', sa.Integer(), sa.ForeignKey('departments.id', name='fk_tasks_department_id', ondelete='SET NULL'), nullable=True))
        batch_op.add_column(sa.Column('cost_center_id', sa.Integer(), sa.ForeignKey('cost_centers.id', name='fk_tasks_cost_center_id', ondelete='SET NULL'), nullable=True))
        batch_op.add_column(sa.Column('recurrence_rule', sa.JSON(), nullable=True))

        batch_op.create_index('ix_tasks_task_number', ['task_number'], unique=True)
        batch_op.create_index('ix_tasks_phase_id', ['phase_id'])
        batch_op.create_index('ix_tasks_due_date', ['due_date'])
        batch_op.create_index('ix_tasks_is_completed', ['is_completed'])
        batch_op.create_index('ix_tasks_is_archived', ['is_archived'])
        batch_op.create_index('ix_tasks_is_deleted', ['is_deleted'])
        batch_op.create_index('ix_tasks_company_id', ['company_id'])
        batch_op.create_index('ix_tasks_branch_id', ['branch_id'])
        batch_op.create_index('ix_tasks_department_id', ['department_id'])
        batch_op.create_index('ix_tasks_cost_center_id', ['cost_center_id'])
        batch_op.create_index('ix_tasks_created_at', ['created_at'])

    # Populate task_number for any existing task records
    connection = op.get_bind()
    results = connection.execute(sa.text("SELECT id FROM tasks WHERE task_number IS NULL OR task_number = ''")).fetchall()
    for row in results:
        task_id = row[0]
        connection.execute(sa.text(f"UPDATE tasks SET task_number = 'TASK-{task_id:06d}' WHERE id = {task_id}"))

    # 6. task_assignees table
    op.create_table(
        'task_assignees',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('task_id', sa.Integer(), sa.ForeignKey('tasks.id', name='fk_ta_task_id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', name='fk_ta_user_id', ondelete='CASCADE'), nullable=False),
        sa.Column('assigned_by', sa.Integer(), sa.ForeignKey('users.id', name='fk_ta_assigned_by', ondelete='SET NULL'), nullable=True),
        sa.Column('assigned_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False),
        sa.UniqueConstraint('task_id', 'user_id', name='uq_task_user_assignee')
    )
    op.create_index('ix_task_assignees_task_id', 'task_assignees', ['task_id'])
    op.create_index('ix_task_assignees_user_id', 'task_assignees', ['user_id'])

    # 7. task_followers table
    op.create_table(
        'task_followers',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('task_id', sa.Integer(), sa.ForeignKey('tasks.id', name='fk_tf_task_id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', name='fk_tf_user_id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False),
        sa.UniqueConstraint('task_id', 'user_id', name='uq_task_user_follower')
    )
    op.create_index('ix_task_followers_task_id', 'task_followers', ['task_id'])
    op.create_index('ix_task_followers_user_id', 'task_followers', ['user_id'])

    # 8. task_tags table
    op.create_table(
        'task_tags',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('name', sa.String(50), nullable=False, unique=True),
        sa.Column('color', sa.String(20), nullable=False, server_default='#3B82F6'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False)
    )
    op.create_index('ix_task_tags_name', 'task_tags', ['name'])

    # 9. task_tag_mappings table
    op.create_table(
        'task_tag_mappings',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('task_id', sa.Integer(), sa.ForeignKey('tasks.id', name='fk_ttm_task_id', ondelete='CASCADE'), nullable=False),
        sa.Column('tag_id', sa.Integer(), sa.ForeignKey('task_tags.id', name='fk_ttm_tag_id', ondelete='CASCADE'), nullable=False),
        sa.UniqueConstraint('task_id', 'tag_id', name='uq_task_tag_map')
    )
    op.create_index('ix_task_tag_mappings_task_id', 'task_tag_mappings', ['task_id'])
    op.create_index('ix_task_tag_mappings_tag_id', 'task_tag_mappings', ['tag_id'])

    # 10. task_checklists table
    op.create_table(
        'task_checklists',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('task_id', sa.Integer(), sa.ForeignKey('tasks.id', name='fk_tc_task_id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(150), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False)
    )
    op.create_index('ix_task_checklists_task_id', 'task_checklists', ['task_id'])

    # 11. task_checklist_items table
    op.create_table(
        'task_checklist_items',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('checklist_id', sa.Integer(), sa.ForeignKey('task_checklists.id', name='fk_tci_checklist_id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(250), nullable=False),
        sa.Column('is_completed', sa.Boolean(), nullable=False, server_default=sa.text('FALSE')),
        sa.Column('assignee_id', sa.Integer(), sa.ForeignKey('users.id', name='fk_tci_assignee_id', ondelete='SET NULL'), nullable=True),
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_by', sa.Integer(), sa.ForeignKey('users.id', name='fk_tci_completed_by', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False)
    )
    op.create_index('ix_task_checklist_items_checklist_id', 'task_checklist_items', ['checklist_id'])

    # 12. task_time_entries table
    op.create_table(
        'task_time_entries',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('task_id', sa.Integer(), sa.ForeignKey('tasks.id', name='fk_tte_task_id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', name='fk_tte_user_id', ondelete='CASCADE'), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration_minutes', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False)
    )
    op.create_index('ix_task_time_entries_task_id', 'task_time_entries', ['task_id'])
    op.create_index('ix_task_time_entries_user_id', 'task_time_entries', ['user_id'])

    # 13. Alter task_attachments table
    with op.batch_alter_table('task_attachments', schema=None) as batch_op:
        batch_op.add_column(sa.Column('uploaded_by', sa.Integer(), sa.ForeignKey('users.id', name='fk_tatt_uploaded_by', ondelete='SET NULL'), nullable=True))
        batch_op.add_column(sa.Column('mime_type', sa.String(100), nullable=True))
        batch_op.add_column(sa.Column('storage_path', sa.String(500), nullable=True))

    # 14. Alter task_comments table
    with op.batch_alter_table('task_comments', schema=None) as batch_op:
        batch_op.add_column(sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))

    # 15. task_dependencies table
    op.create_table(
        'task_dependencies',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('task_id', sa.Integer(), sa.ForeignKey('tasks.id', name='fk_tdep_task_id', ondelete='CASCADE'), nullable=False),
        sa.Column('depends_on_task_id', sa.Integer(), sa.ForeignKey('tasks.id', name='fk_tdep_depends_id', ondelete='CASCADE'), nullable=False),
        sa.Column('dependency_type', sa.String(30), nullable=False, server_default='BLOCKS'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False),
        sa.UniqueConstraint('task_id', 'depends_on_task_id', name='uq_task_dependency')
    )
    op.create_index('ix_task_dependencies_task_id', 'task_dependencies', ['task_id'])
    op.create_index('ix_task_dependencies_depends_on_task_id', 'task_dependencies', ['depends_on_task_id'])

    # 16. task_relationships table
    op.create_table(
        'task_relationships',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('task_id', sa.Integer(), sa.ForeignKey('tasks.id', name='fk_trel_task_id', ondelete='CASCADE'), nullable=False),
        sa.Column('related_task_id', sa.Integer(), sa.ForeignKey('tasks.id', name='fk_trel_related_id', ondelete='CASCADE'), nullable=False),
        sa.Column('relationship_type', sa.String(30), nullable=False, server_default='RELATED'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False),
        sa.UniqueConstraint('task_id', 'related_task_id', name='uq_task_relationship')
    )
    op.create_index('ix_task_relationships_task_id', 'task_relationships', ['task_id'])
    op.create_index('ix_task_relationships_related_task_id', 'task_relationships', ['related_task_id'])

    # 17. task_activities table
    op.create_table(
        'task_activities',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('task_id', sa.Integer(), sa.ForeignKey('tasks.id', name='fk_tact_task_id', ondelete='CASCADE'), nullable=False),
        sa.Column('actor_id', sa.Integer(), sa.ForeignKey('users.id', name='fk_tact_actor_id', ondelete='SET NULL'), nullable=True),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('field_name', sa.String(100), nullable=True),
        sa.Column('old_value', sa.Text(), nullable=True),
        sa.Column('new_value', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False)
    )
    op.create_index('ix_task_activities_task_id', 'task_activities', ['task_id'])
    op.create_index('ix_task_activities_created_at', 'task_activities', ['created_at'])

    # 18. task_templates table
    op.create_table(
        'task_templates',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('name', sa.String(150), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('template_data', sa.JSON(), nullable=False),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id', name='fk_ttmpl_created_by', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False)
    )

    # 19. task_automations table
    op.create_table(
        'task_automations',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('project_id', sa.Integer(), sa.ForeignKey('projects.id', name='fk_tauto_project_id', ondelete='CASCADE'), nullable=True),
        sa.Column('trigger_event', sa.String(50), nullable=False),
        sa.Column('conditions', sa.JSON(), nullable=True),
        sa.Column('actions', sa.JSON(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('TRUE')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False)
    )
    op.create_index('ix_task_automations_project_id', 'task_automations', ['project_id'])


def downgrade() -> None:
    op.drop_table('task_automations')
    op.drop_table('task_templates')
    op.drop_table('task_activities')
    op.drop_table('task_relationships')
    op.drop_table('task_dependencies')
    
    with op.batch_alter_table('task_comments', schema=None) as batch_op:
        batch_op.drop_column('deleted_at')
        batch_op.drop_column('updated_at')

    with op.batch_alter_table('task_attachments', schema=None) as batch_op:
        batch_op.drop_column('storage_path')
        batch_op.drop_column('mime_type')
        batch_op.drop_column('uploaded_by')

    op.drop_table('task_time_entries')
    op.drop_table('task_checklist_items')
    op.drop_table('task_checklists')
    op.drop_table('task_tag_mappings')
    op.drop_table('task_tags')
    op.drop_table('task_followers')
    op.drop_table('task_assignees')

    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.drop_index('ix_tasks_created_at')
        batch_op.drop_index('ix_tasks_cost_center_id')
        batch_op.drop_index('ix_tasks_department_id')
        batch_op.drop_index('ix_tasks_branch_id')
        batch_op.drop_index('ix_tasks_company_id')
        batch_op.drop_index('ix_tasks_is_deleted')
        batch_op.drop_index('ix_tasks_is_archived')
        batch_op.drop_index('ix_tasks_is_completed')
        batch_op.drop_index('ix_tasks_due_date')
        batch_op.drop_index('ix_tasks_phase_id')
        batch_op.drop_index('ix_tasks_task_number')

        batch_op.drop_column('recurrence_rule')
        batch_op.drop_column('cost_center_id')
        batch_op.drop_column('department_id')
        batch_op.drop_column('branch_id')
        batch_op.drop_column('company_id')
        batch_op.drop_column('is_deleted')
        batch_op.drop_column('is_archived')
        batch_op.drop_column('is_completed')
        batch_op.drop_column('progress_percentage')
        batch_op.drop_column('actual_minutes')
        batch_op.drop_column('estimated_minutes')
        batch_op.drop_column('completed_at')
        batch_op.drop_column('due_time')
        batch_op.drop_column('start_time')
        batch_op.drop_column('completed_by')
        batch_op.drop_column('updated_by')
        batch_op.drop_column('created_by')
        batch_op.drop_column('phase_id')
        batch_op.drop_column('task_number')

    with op.batch_alter_table('task_statuses', schema=None) as batch_op:
        batch_op.drop_column('is_active')
        batch_op.drop_column('category')

    op.drop_table('project_phases')
    op.drop_table('branches')
    op.drop_table('cost_centers')
