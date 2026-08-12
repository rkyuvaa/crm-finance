import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import FinanceCompany, User, UserRole

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)

DEFAULT_PASSWORD = "testpass123"


def make_user(email, role: UserRole, name="Test User") -> User:
    return User(
        email=email,
        full_name=name,
        role=role,
        password_hash=hash_password(DEFAULT_PASSWORD),
    )


@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture
def db():
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def seeded_client(db, client):
    sales = make_user("sales@kim.com", UserRole.SALES_EXECUTIVE, "Ramesh")
    finance = make_user("finance@kim.com", UserRole.FINANCE_OFFICER, "Sneha K")
    admin = make_user("admin@kim.com", UserRole.ADMIN, "Admin")
    db.add_all([sales, finance, admin])
    db.add_all(
        [
            FinanceCompany(name="ABC Finance", total_apps=48, approved=39, rejected=4, avg_time_days=1.4),
            FinanceCompany(name="XYZ Finance", total_apps=35, approved=27, rejected=5, avg_time_days=1.8),
        ]
    )
    db.commit()
    return client


def login(client, email="sales@kim.com", password=DEFAULT_PASSWORD) -> str:
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
