"""Create a single admin user after database reset."""
from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import User, UserRole


def create_admin():
    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            print("[create_admin] user already exists — skipping")
            return

        password = settings.seed_default_password
        admin = User(
            email="admin@kim.com",
            password_hash=hash_password(password),
            full_name="Admin",
            role=UserRole.ADMIN,
        )
        db.add(admin)
        db.commit()
        print(f"[create_admin] created admin@kim.com / {password}")
    finally:
        db.close()


if __name__ == "__main__":
    create_admin()
