"""add dependent_rules to crm_tab_fields

Revision ID: 20260828_add_dependent_rules
Revises: 20260826_create_stage_automove_rules
Create Date: 2026-08-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '20260828_add_dependent_rules'
down_revision: Union[str, None] = 'b8e9f02c3b4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('crm_tab_fields', sa.Column('dependent_rules', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('crm_tab_fields', 'dependent_rules')
