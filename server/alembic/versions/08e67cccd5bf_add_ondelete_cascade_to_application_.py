"""add ondelete cascade to application foreign keys

Revision ID: 08e67cccd5bf
Revises: 4a7c9d1e2f3b
Create Date: 2026-08-13 14:55:27.369943

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '08e67cccd5bf'
down_revision: Union[str, None] = '4a7c9d1e2f3b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
