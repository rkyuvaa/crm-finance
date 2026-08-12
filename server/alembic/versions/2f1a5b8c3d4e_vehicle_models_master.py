"""vehicle models master

Revision ID: 2f1a5b8c3d4e
Revises: 35044419c45f
Create Date: 2026-08-12 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '2f1a5b8c3d4e'
down_revision: Union[str, None] = '35044419c45f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('vehicle_models',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=120), nullable=False),
    sa.Column('vehicle_price', sa.Numeric(precision=14, scale=2), nullable=False),
    sa.Column('down_payment', sa.Numeric(precision=14, scale=2), nullable=False),
    sa.Column('loan_amount', sa.Numeric(precision=14, scale=2), nullable=False),
    sa.Column('finance_company_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['finance_company_id'], ['finance_companies.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_vehicle_models_name'), 'vehicle_models', ['name'], unique=True)

    with op.batch_alter_table('applications') as batch_op:
        batch_op.add_column(sa.Column('vehicle_model_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('vehicle_price', sa.Numeric(precision=14, scale=2), nullable=True))
        batch_op.add_column(sa.Column('down_payment', sa.Numeric(precision=14, scale=2), nullable=True))
        batch_op.create_index(op.f('ix_applications_vehicle_model_id'), ['vehicle_model_id'], unique=False)
        batch_op.create_foreign_key(
            'fk_applications_vehicle_model_id', 'vehicle_models',
            ['vehicle_model_id'], ['id'],
        )


def downgrade() -> None:
    with op.batch_alter_table('applications') as batch_op:
        batch_op.drop_constraint('fk_applications_vehicle_model_id', type_='foreignkey')
        batch_op.drop_index(op.f('ix_applications_vehicle_model_id'))
        batch_op.drop_column('down_payment')
        batch_op.drop_column('vehicle_price')
        batch_op.drop_column('vehicle_model_id')
    op.drop_index(op.f('ix_vehicle_models_name'), table_name='vehicle_models')
    op.drop_table('vehicle_models')
