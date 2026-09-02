"""Add stage_key to applications and module & target_stage_key to stage_automove_rules

Revision ID: 20260902_add_app_stage_key
Revises: 20260902_add_stage_module
Create Date: 2026-09-02
"""

from alembic import op
import sqlalchemy as sa

revision = '20260902_add_app_stage_key'
down_revision = '20260902_add_stage_module'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add stage_key column to applications table
    op.add_column(
        'applications',
        sa.Column('stage_key', sa.String(40), server_default='new', nullable=True)
    )
    op.create_index('ix_applications_stage_key', 'applications', ['stage_key'])

    # Update existing non-LEAD applications to stage_key = 'applications'
    op.execute("UPDATE applications SET stage_key = 'applications' WHERE status != 'LEAD';")
    op.execute("UPDATE applications SET stage_key = 'new' WHERE status = 'LEAD' OR stage_key IS NULL;")

    # 2. Add module and target_stage_key columns to stage_automove_rules table
    op.add_column(
        'stage_automove_rules',
        sa.Column('module', sa.String(20), server_default='LEAD', nullable=False)
    )
    op.add_column(
        'stage_automove_rules',
        sa.Column('target_stage_key', sa.String(40), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('stage_automove_rules', 'target_stage_key')
    op.drop_column('stage_automove_rules', 'module')
    op.drop_index('ix_applications_stage_key', table_name='applications')
    op.drop_column('applications', 'stage_key')
