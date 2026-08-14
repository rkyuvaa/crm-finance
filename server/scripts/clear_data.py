"""Clear all sample data from every table, then restore the admin user.

Run via: python -m scripts.clear_data
"""
from app.core.security import hash_password
from app.core.config import settings
from app.db.session import SessionLocal
from app.models import (
    Activity,
    Application,
    Delivery,
    Disbursement,
    Document,
    FinanceCompany,
    FinanceSubmission,
    Notification,
    PipelineStage,
    Sanction,
    User,
    UserRole,
    VehicleModel,
    Verification,
)

TABLES_IN_ORDER = [
    Activity,
    Delivery,
    Disbursement,
    Document,
    FinanceSubmission,
    Sanction,
    Verification,
    Notification,
    Application,
    FinanceCompany,
    VehicleModel,
    PipelineStage,
    User,
]


def clear_data():
    db = SessionLocal()
    try:
        for model in TABLES_IN_ORDER:
            deleted = db.query(model).delete(synchronize_session=False)
            print(f"[clear_data] deleted {deleted} rows from {model.__tablename__}")
        db.commit()

        if db.query(User).count() == 0:
            password = settings.seed_default_password
            db.add(
                User(
                    email="admin@kim.com",
                    password_hash=hash_password(password),
                    full_name="Admin",
                    role=UserRole.ADMIN,
                )
            )
            db.commit()
            print(f"[clear_data] restored admin@kim.com / {password}")
    finally:
        db.close()


if __name__ == "__main__":
    clear_data()
