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
    # Create attendance status enum
    op.execute(
        sa.text("""
            CREATE TABLE IF NOT EXISTS hr_attendance (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                attendance_date DATE NOT NULL,
                check_in_time DATETIME,
                check_out_time DATETIME,
                hours_worked FLOAT,
                status VARCHAR NOT NULL DEFAULT 'ABSENT',
                notes VARCHAR(500),
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_hr_attendance_user_id ON hr_attendance (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_hr_attendance_date ON hr_attendance (attendance_date)")

    # Create leave requests table
    op.execute(
        sa.text("""
            CREATE TABLE IF NOT EXISTS hr_leave_requests (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                leave_type VARCHAR NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                reason VARCHAR(500) NOT NULL,
                status VARCHAR NOT NULL DEFAULT 'PENDING',
                approved_by_id INTEGER,
                approval_date DATETIME,
                rejection_reason VARCHAR(500),
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY(approved_by_id) REFERENCES users (id) ON DELETE SET NULL
            )
        """)
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_hr_leave_requests_user_id ON hr_leave_requests (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_hr_leave_requests_status ON hr_leave_requests (status)")

    # Create payroll records table
    op.execute(
        sa.text("""
            CREATE TABLE IF NOT EXISTS hr_payroll (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                payroll_month DATE NOT NULL,
                base_salary FLOAT NOT NULL,
                allowances FLOAT NOT NULL DEFAULT 0.0,
                deductions FLOAT NOT NULL DEFAULT 0.0,
                net_salary FLOAT NOT NULL,
                status VARCHAR NOT NULL DEFAULT 'DRAFT',
                remarks VARCHAR(500),
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_hr_payroll_user_id ON hr_payroll (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_hr_payroll_status ON hr_payroll (status)")

    # Create performance reviews table
    op.execute(
        sa.text("""
            CREATE TABLE IF NOT EXISTS hr_performance_reviews (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                reviewer_id INTEGER NOT NULL,
                review_date DATE NOT NULL,
                rating FLOAT NOT NULL,
                comments VARCHAR(2000),
                status VARCHAR NOT NULL DEFAULT 'COMPLETED',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY(reviewer_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_hr_performance_reviews_user_id ON hr_performance_reviews (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_hr_performance_reviews_reviewer_id ON hr_performance_reviews (reviewer_id)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS hr_performance_reviews")
    op.execute("DROP TABLE IF EXISTS hr_payroll")
    op.execute("DROP TABLE IF EXISTS hr_leave_requests")
    op.execute("DROP TABLE IF EXISTS hr_attendance")
