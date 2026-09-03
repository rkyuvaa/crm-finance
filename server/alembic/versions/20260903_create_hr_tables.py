"""Create HR module tables for attendance, leave, payroll, and performance reviews

Revision ID: 20260903_create_hr_tables
Revises: 20260903_reorganize_tabs
Create Date: 2026-09-03
"""

from alembic import op
import sqlalchemy as sa

revision = '20260903_create_hr_tables'
down_revision = '20260903_reorganize_tabs'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create hr_attendance table
    op.create_table(
        'hr_attendance',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('attendance_date', sa.Date(), nullable=False),
        sa.Column('check_in_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('check_out_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('hours_worked', sa.Float(), nullable=True),
        sa.Column('status', sa.String(50), server_default='ABSENT', nullable=False),
        sa.Column('notes', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False),
        sa.UniqueConstraint('user_id', 'attendance_date', name='uq_user_attendance_date')
    )
    op.create_index('ix_hr_attendance_user_id', 'hr_attendance', ['user_id'])
    op.create_index('ix_hr_attendance_date', 'hr_attendance', ['attendance_date'])

    # 2. Create hr_leave_requests table
    op.create_table(
        'hr_leave_requests',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('leave_type', sa.String(50), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('reason', sa.String(500), nullable=False),
        sa.Column('status', sa.String(50), server_default='PENDING', nullable=False),
        sa.Column('approved_by_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('approval_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rejection_reason', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False)
    )
    op.create_index('ix_hr_leave_requests_user_id', 'hr_leave_requests', ['user_id'])
    op.create_index('ix_hr_leave_requests_status', 'hr_leave_requests', ['status'])

    # 3. Create hr_payroll table
    op.create_table(
        'hr_payroll',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('payroll_month', sa.Date(), nullable=False),
        sa.Column('base_salary', sa.Float(), nullable=False),
        sa.Column('allowances', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('deductions', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('net_salary', sa.Float(), nullable=False),
        sa.Column('status', sa.String(50), server_default='DRAFT', nullable=False),
        sa.Column('remarks', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False),
        sa.UniqueConstraint('user_id', 'payroll_month', name='uq_user_payroll_month')
    )
    op.create_index('ix_hr_payroll_user_id', 'hr_payroll', ['user_id'])
    op.create_index('ix_hr_payroll_status', 'hr_payroll', ['status'])

    # 4. Create hr_performance_reviews table
    op.create_table(
        'hr_performance_reviews',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('reviewer_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('review_date', sa.Date(), nullable=False),
        sa.Column('rating', sa.Float(), nullable=False),
        sa.Column('comments', sa.String(2000), nullable=True),
        sa.Column('status', sa.String(50), server_default='COMPLETED', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False)
    )
    op.create_index('ix_hr_performance_reviews_user_id', 'hr_performance_reviews', ['user_id'])
    op.create_index('ix_hr_performance_reviews_reviewer_id', 'hr_performance_reviews', ['reviewer_id'])


def downgrade() -> None:
    op.drop_table('hr_performance_reviews')
    op.drop_table('hr_payroll')
    op.drop_table('hr_leave_requests')
    op.drop_table('hr_attendance')
