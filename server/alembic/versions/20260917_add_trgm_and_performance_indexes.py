"""add pg_trgm and performance indexes for high-scale search

Revision ID: 20260917_perf_indexes
Revises: 20260916_auto_sched
Create Date: 2026-09-17
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '20260917_perf_indexes'
down_revision: Union[str, None] = '20260916_auto_sched'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    dialect = conn.dialect.name

    if dialect == 'postgresql':
        # Enable trigram extension for fast LIKE '%q%' search
        op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")

        # GIN Trigram indexes for fast text searching across 100k+ rows
        op.execute("CREATE INDEX IF NOT EXISTS idx_applications_customer_name_trgm ON applications USING gin (customer_name gin_trgm_ops);")
        op.execute("CREATE INDEX IF NOT EXISTS idx_applications_app_no_trgm ON applications USING gin (app_no gin_trgm_ops);")
        op.execute("CREATE INDEX IF NOT EXISTS idx_applications_vehicle_trgm ON applications USING gin (vehicle gin_trgm_ops);")
        op.execute("CREATE INDEX IF NOT EXISTS idx_tasks_title_trgm ON tasks USING gin (title gin_trgm_ops);")
        op.execute("CREATE INDEX IF NOT EXISTS idx_projects_name_trgm ON projects USING gin (name gin_trgm_ops);")

    # Composite B-tree indexes for fast filtered listing & pipeline queries
    try:
        op.create_index(
            'idx_applications_status_created',
            'applications',
            ['status', 'created_at'],
            if_not_exists=True,
        )
    except Exception:
        pass

    try:
        op.create_index(
            'idx_tasks_project_deleted',
            'tasks',
            ['project_id', 'is_deleted'],
            if_not_exists=True,
        )
    except Exception:
        pass


def downgrade() -> None:
    conn = op.get_bind()
    dialect = conn.dialect.name

    try:
        op.drop_index('idx_tasks_project_deleted', table_name='tasks')
        op.drop_index('idx_applications_status_created', table_name='applications')
    except Exception:
        pass

    if dialect == 'postgresql':
        op.execute("DROP INDEX IF EXISTS idx_applications_customer_name_trgm;")
        op.execute("DROP INDEX IF EXISTS idx_applications_app_no_trgm;")
        op.execute("DROP INDEX IF EXISTS idx_applications_vehicle_trgm;")
        op.execute("DROP INDEX IF EXISTS idx_tasks_title_trgm;")
        op.execute("DROP INDEX IF EXISTS idx_projects_name_trgm;")
