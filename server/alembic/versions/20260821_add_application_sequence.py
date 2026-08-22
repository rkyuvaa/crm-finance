"""add application_sequence table

Revision ID: 20260821_add_application_sequence
Revises: 93491516004c
Create Date: 2026-08-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '20260821_add_application_sequence'
down_revision: Union[str, None] = '93491516004c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'application_sequences',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('last_number', sa.Integer(), nullable=False, server_default='0'),
        sa.PrimaryKeyConstraint('id')
    )
    # Insert initial row
    op.execute("INSERT INTO application_sequences (id, last_number) VALUES (1, 0)")


def downgrade() -> None:
    op.drop_table('application_sequences')