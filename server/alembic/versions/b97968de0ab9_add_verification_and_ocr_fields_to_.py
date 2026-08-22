"""add_verification_and_ocr_fields_to_custom_values

Revision ID: b97968de0ab9
Revises: a8e9f01c2b3d
Create Date: 2026-08-22 14:59:35.382160

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b97968de0ab9'
down_revision: Union[str, None] = 'a8e9f01c2b3d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('crm_lead_custom_field_values', sa.Column('quality_score', sa.Integer(), nullable=True))
    op.add_column('crm_lead_custom_field_values', sa.Column('quality_analysis', sa.JSON(), nullable=True))
    op.add_column('crm_lead_custom_field_values', sa.Column('is_verified', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    op.add_column('crm_lead_custom_field_values', sa.Column('verified_by_id', sa.Integer(), nullable=True))
    op.add_column('crm_lead_custom_field_values', sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('crm_lead_custom_field_values', 'verified_at')
    op.drop_column('crm_lead_custom_field_values', 'verified_by_id')
    op.drop_column('crm_lead_custom_field_values', 'is_verified')
    op.drop_column('crm_lead_custom_field_values', 'quality_analysis')
    op.drop_column('crm_lead_custom_field_values', 'quality_score')
