"""add smtp settings table

Revision ID: f1a2b3c4d5e6
Revises: e9f01a2b3c4d
Create Date: 2026-08-22 17:21:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = 'e9f01a2b3c4d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'smtp_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('smtp_host', sa.String(length=120), nullable=True),
        sa.Column('smtp_port', sa.Integer(), nullable=False, server_default='587'),
        sa.Column('smtp_security', sa.String(length=20), nullable=False, server_default='TLS'),
        sa.Column('smtp_user', sa.String(length=120), nullable=True),
        sa.Column('smtp_password', sa.String(length=255), nullable=True),
        sa.Column('smtp_from_email', sa.String(length=120), nullable=True),
        sa.Column('smtp_from_name', sa.String(length=120), nullable=False, server_default='CRMFinance'),
        sa.Column('is_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('smtp_settings')
