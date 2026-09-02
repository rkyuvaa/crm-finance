"""Add module column to pipeline_stages

Revision ID: 20260902_add_stage_module
Revises: 20260828_add_dependent_rules
Create Date: 2026-09-02
"""

from alembic import op
import sqlalchemy as sa

revision = '20260902_add_stage_module'
down_revision = '20260828_add_dependent_rules'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'pipeline_stages',
        sa.Column(
            'module',
            sa.String(20),
            server_default='OPPORTUNITY',
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column('pipeline_stages', 'module')
