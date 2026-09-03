import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core import face_index
from app.core.config import settings
from app.core.database import Base
from app.core.rate_limit import limiter
from app.main import app

TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    """The rate limiter keys on client IP, and TestClient always uses the
    same IP -- without a reset, limits accumulate across the whole test
    session instead of resetting per test, causing unrelated tests to fail
    with 429s once enough tests have run before them."""
    limiter.reset()
    yield
    limiter.reset()


@pytest.fixture(autouse=True)
def isolated_face_store(tmp_path, monkeypatch):
    """face_templates.db is a real SQLite file (not the in-memory Postgres
    substitute), and the FAISS index is a module-level singleton -- both
    need resetting per test or templates leak across tests."""
    monkeypatch.setattr(
        settings, "face_template_db_path", str(tmp_path / "face_templates.db")
    )
    face_index._index = None
    yield
    face_index._index = None


@pytest.fixture()
def db_session():
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session):
    from fastapi.testclient import TestClient

    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
