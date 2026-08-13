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
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == 'sqlite':
        op.drop_constraint('activities_application_id_fkey', 'activities', type_='foreignkey')
        op.create_foreign_key('activities_application_id_fkey', 'activities', 'applications', ['application_id'], ['id'], ondelete='CASCADE')
        op.drop_constraint('deliveries_application_id_fkey', 'deliveries', type_='foreignkey')
        op.create_foreign_key('deliveries_application_id_fkey', 'deliveries', 'applications', ['application_id'], ['id'], ondelete='CASCADE')
        op.drop_constraint('disbursements_application_id_fkey', 'disbursements', type_='foreignkey')
        op.create_foreign_key('disbursements_application_id_fkey', 'disbursements', 'applications', ['application_id'], ['id'], ondelete='CASCADE')
        op.drop_constraint('documents_application_id_fkey', 'documents', type_='foreignkey')
        op.create_foreign_key('documents_application_id_fkey', 'documents', 'applications', ['application_id'], ['id'], ondelete='CASCADE')
        op.drop_constraint('finance_submissions_application_id_fkey', 'finance_submissions', type_='foreignkey')
        op.create_foreign_key('finance_submissions_application_id_fkey', 'finance_submissions', 'applications', ['application_id'], ['id'], ondelete='CASCADE')
        op.drop_constraint('sanctions_application_id_fkey', 'sanctions', type_='foreignkey')
        op.create_foreign_key('sanctions_application_id_fkey', 'sanctions', 'applications', ['application_id'], ['id'], ondelete='CASCADE')
        op.drop_constraint('verifications_application_id_fkey', 'verifications', type_='foreignkey')
        op.create_foreign_key('verifications_application_id_fkey', 'verifications', 'applications', ['application_id'], ['id'], ondelete='CASCADE')
    else:
        op.drop_constraint('activities_application_id_fkey', 'activities', type_='foreignkey')
        op.create_foreign_key('activities_application_id_fkey', 'activities', 'applications', ['application_id'], ['id'], ondelete='CASCADE')
        op.drop_constraint('deliveries_application_id_fkey', 'deliveries', type_='foreignkey')
        op.create_foreign_key('deliveries_application_id_fkey', 'deliveries', 'applications', ['application_id'], ['id'], ondelete='CASCADE')
        op.drop_constraint('disbursements_application_id_fkey', 'disbursements', type_='foreignkey')
        op.create_foreign_key('disbursements_application_id_fkey', 'disbursements', 'applications', ['application_id'], ['id'], ondelete='CASCADE')
        op.drop_constraint('documents_application_id_fkey', 'documents', type_='foreignkey')
        op.create_foreign_key('documents_application_id_fkey', 'documents', 'applications', ['application_id'], ['id'], ondelete='CASCADE')
        op.drop_constraint('finance_submissions_application_id_fkey', 'finance_submissions', type_='foreignkey')
        op.create_foreign_key('finance_submissions_application_id_fkey', 'finance_submissions', 'applications', ['application_id'], ['id'], ondelete='CASCADE')
        op.drop_constraint('sanctions_application_id_fkey', 'sanctions', type_='foreignkey')
        op.create_foreign_key('sanctions_application_id_fkey', 'sanctions', 'applications', ['application_id'], ['id'], ondelete='CASCADE')
        op.drop_constraint('verifications_application_id_fkey', 'verifications', type_='foreignkey')
        op.create_foreign_key('verifications_application_id_fkey', 'verifications', 'applications', ['application_id'], ['id'], ondelete='CASCADE')


def downgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == 'sqlite':
        op.drop_constraint('activities_application_id_fkey', 'activities', type_='foreignkey')
        op.create_foreign_key('activities_application_id_fkey', 'activities', 'applications', ['application_id'], ['id'])
        op.drop_constraint('deliveries_application_id_fkey', 'deliveries', type_='foreignkey')
        op.create_foreign_key('deliveries_application_id_fkey', 'deliveries', 'applications', ['application_id'], ['id'])
        op.drop_constraint('disbursements_application_id_fkey', 'disbursements', type_='foreignkey')
        op.create_foreign_key('disbursements_application_id_fkey', 'disbursements', 'applications', ['application_id'], ['id'])
        op.drop_constraint('documents_application_id_fkey', 'documents', type_='foreignkey')
        op.create_foreign_key('documents_application_id_fkey', 'documents', 'applications', ['application_id'], ['id'])
        op.drop_constraint('finance_submissions_application_id_fkey', 'finance_submissions', type_='foreignkey')
        op.create_foreign_key('finance_submissions_application_id_fkey', 'finance_submissions', 'applications', ['application_id'], ['id'])
        op.drop_constraint('sanctions_application_id_fkey', 'sanctions', type_='foreignkey')
        op.create_foreign_key('sanctions_application_id_fkey', 'sanctions', 'applications', ['application_id'], ['id'])
        op.drop_constraint('verifications_application_id_fkey', 'verifications', type_='foreignkey')
        op.create_foreign_key('verifications_application_id_fkey', 'verifications', 'applications', ['application_id'], ['id'])
    else:
        op.drop_constraint('activities_application_id_fkey', 'activities', type_='foreignkey')
        op.create_foreign_key('activities_application_id_fkey', 'activities', 'applications', ['application_id'], ['id'])
        op.drop_constraint('deliveries_application_id_fkey', 'deliveries', type_='foreignkey')
        op.create_foreign_key('deliveries_application_id_fkey', 'deliveries', 'applications', ['application_id'], ['id'])
        op.drop_constraint('disbursements_application_id_fkey', 'disbursements', type_='foreignkey')
        op.create_foreign_key('disbursements_application_id_fkey', 'disbursements', 'applications', ['application_id'], ['id'])
        op.drop_constraint('documents_application_id_fkey', 'documents', type_='foreignkey')
        op.create_foreign_key('documents_application_id_fkey', 'documents', 'applications', ['application_id'], ['id'])
        op.drop_constraint('finance_submissions_application_id_fkey', 'finance_submissions', type_='foreignkey')
        op.create_foreign_key('finance_submissions_application_id_fkey', 'finance_submissions', 'applications', ['application_id'], ['id'])
        op.drop_constraint('sanctions_application_id_fkey', 'sanctions', type_='foreignkey')
        op.create_foreign_key('sanctions_application_id_fkey', 'sanctions', 'applications', ['application_id'], ['id'])
        op.drop_constraint('verifications_application_id_fkey', 'verifications', type_='foreignkey')
        op.create_foreign_key('verifications_application_id_fkey', 'verifications', 'applications', ['application_id'], ['id'])
