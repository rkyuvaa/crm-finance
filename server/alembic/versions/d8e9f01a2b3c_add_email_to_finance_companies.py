"""add email to finance companies

Revision ID: d8e9f01a2b3c
Revises: c7d8e9f01a2b
Create Date: 2026-08-22 16:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd8e9f01a2b3c'
down_revision: Union[str, None] = 'c7d8e9f01a2b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('finance_companies', sa.Column('email', sa.String(length=120), nullable=True))


def downgrade() -> None:
    op.drop_column('finance_companies', 'email')
