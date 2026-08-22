"""add financier document token tables

Revision ID: c7d8e9f01a2b
Revises: b97968de0ab9
Create Date: 2026-08-22 16:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c7d8e9f01a2b'
down_revision: Union[str, None] = 'b97968de0ab9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'financier_document_access_tokens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('token_hash', sa.String(length=64), nullable=False),
        sa.Column('application_id', sa.Integer(), nullable=False),
        sa.Column('financier_id', sa.Integer(), nullable=True),
        sa.Column('financier_name', sa.String(length=120), nullable=False),
        sa.Column('financier_email', sa.String(length=120), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=False, server_default='ACTIVE'),
        sa.Column('sent_by_user_id', sa.Integer(), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('last_accessed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('access_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['application_id'], ['applications.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['financier_id'], ['finance_companies.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['sent_by_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_financier_document_access_tokens_application_id'), 'financier_document_access_tokens', ['application_id'], unique=False)
    op.create_index(op.f('ix_financier_document_access_tokens_expires_at'), 'financier_document_access_tokens', ['expires_at'], unique=False)
    op.create_index(op.f('ix_financier_document_access_tokens_status'), 'financier_document_access_tokens', ['status'], unique=False)
    op.create_index(op.f('ix_financier_document_access_tokens_token_hash'), 'financier_document_access_tokens', ['token_hash'], unique=True)

    op.create_table(
        'financier_document_send_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('token_id', sa.Integer(), nullable=False),
        sa.Column('custom_field_value_id', sa.Integer(), nullable=True),
        sa.Column('field_name', sa.String(length=120), nullable=False),
        sa.Column('field_label', sa.String(length=120), nullable=False),
        sa.Column('file_name', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.Text(), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('mime_type', sa.String(length=120), nullable=True),
        sa.Column('is_mandatory', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('quality_status', sa.String(length=30), nullable=False, server_default='NOT_CHECKED'),
        sa.Column('quality_score', sa.Integer(), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('verified_by_name', sa.String(length=120), nullable=True),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['custom_field_value_id'], ['crm_lead_custom_field_values.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['token_id'], ['financier_document_access_tokens.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_financier_document_send_items_token_id'), 'financier_document_send_items', ['token_id'], unique=False)

    op.create_table(
        'financier_document_access_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('token_id', sa.Integer(), nullable=True),
        sa.Column('application_id', sa.Integer(), nullable=True),
        sa.Column('financier_email', sa.String(length=120), nullable=True),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('send_item_id', sa.Integer(), nullable=True),
        sa.Column('ip_address', sa.String(length=60), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('accessed_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('success', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('failure_reason', sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(['application_id'], ['applications.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['send_item_id'], ['financier_document_send_items.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['token_id'], ['financier_document_access_tokens.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_financier_document_access_logs_application_id'), 'financier_document_access_logs', ['application_id'], unique=False)
    op.create_index(op.f('ix_financier_document_access_logs_token_id'), 'financier_document_access_logs', ['token_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_financier_document_access_logs_token_id'), table_name='financier_document_access_logs')
    op.drop_index(op.f('ix_financier_document_access_logs_application_id'), table_name='financier_document_access_logs')
    op.drop_table('financier_document_access_logs')

    op.drop_index(op.f('ix_financier_document_send_items_token_id'), table_name='financier_document_send_items')
    op.drop_table('financier_document_send_items')

    op.drop_index(op.f('ix_financier_document_access_tokens_token_hash'), table_name='financier_document_access_tokens')
    op.drop_index(op.f('ix_financier_document_access_tokens_status'), table_name='financier_document_access_tokens')
    op.drop_index(op.f('ix_financier_document_access_tokens_expires_at'), table_name='financier_document_access_tokens')
    op.drop_index(op.f('ix_financier_document_access_tokens_application_id'), table_name='financier_document_access_tokens')
    op.drop_table('financier_document_access_tokens')
