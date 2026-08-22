"""add contact and address to finance companies

Revision ID: e9f01a2b3c4d
Revises: d8e9f01a2b3c
Create Date: 2026-08-22 17:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e9f01a2b3c4d'
down_revision: Union[str, None] = 'd8e9f01a2b3c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('finance_companies', sa.Column('contact_number', sa.String(length=30), nullable=True))
    op.add_column('finance_companies', sa.Column('address', sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column('finance_companies', 'address')
    op.drop_column('finance_companies', 'contact_number')
