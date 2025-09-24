from collections.abc import Callable, Generator
from typing import Any
from unittest.mock import AsyncMock, Mock

import pytest
from faker import Faker
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm.session import Session

from src.app.core.config import settings
from src.app.main import app
from src.app.models.role import UserRoleEnum
from src.app.schemas.user import UserRead

DATABASE_URI = settings.POSTGRES_URI
DATABASE_PREFIX = settings.POSTGRES_SYNC_PREFIX

sync_engine = create_engine(DATABASE_PREFIX + DATABASE_URI)
local_session = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)


fake = Faker()


@pytest.fixture(scope="session")
def client() -> Generator[TestClient, Any, None]:
    with TestClient(app) as _client:
        yield _client
    app.dependency_overrides = {}
    sync_engine.dispose()


@pytest.fixture
def db() -> Generator[Session, Any, None]:
    session = local_session()
    yield session
    session.close()


def override_dependency(dependency: Callable[..., Any], mocked_response: Any) -> None:
    app.dependency_overrides[dependency] = lambda: mocked_response


@pytest.fixture
def mock_db():
    """Mock database session for unit tests."""
    return Mock(spec=AsyncSession)


@pytest.fixture
def mock_redis():
    """Mock Redis connection for unit tests."""
    mock_redis = Mock()
    mock_redis.get = AsyncMock(return_value=None)
    mock_redis.set = AsyncMock(return_value=True)
    mock_redis.delete = AsyncMock(return_value=True)
    return mock_redis


@pytest.fixture
def sample_user_data():
    """Generate sample user data for tests."""
    return {
        "name": fake.name(),
        "username": fake.user_name(),
        "email": fake.email(),
        "password": fake.password(),
    }


@pytest.fixture
def sample_user_read():
    """Generate a sample UserRead object."""
    from uuid6 import uuid7

    return UserRead(
        id=1,
        uuid=uuid7(),
        name=fake.name(),
        username=fake.user_name(),
        email=fake.email(),
        profile_image_url=fake.image_url(),
        role=UserRoleEnum.UNAUTHORIZED,
        created_at=fake.date_time(),
        updated_at=fake.date_time(),
        tier_id=None,
        hashed_password="hashed_password_for_testing",
    )


@pytest.fixture
def sample_admin_user_read():
    """Generate a sample admin UserRead object."""
    from uuid6 import uuid7

    return UserRead(
        id=2,
        uuid=uuid7(),
        name=fake.name(),
        username=fake.user_name(),
        email=fake.email(),
        profile_image_url=fake.image_url(),
        role=UserRoleEnum.ADMIN,
        created_at=fake.date_time(),
        updated_at=fake.date_time(),
        tier_id=None,
        hashed_password="hashed_password_for_testing",
    )


@pytest.fixture
def current_user_dict():
    """Mock current user from auth dependency."""
    return {
        "id": 1,
        "username": fake.user_name(),
        "email": fake.email(),
        "name": fake.name(),
        "role": UserRoleEnum.UNAUTHORIZED,
    }


@pytest.fixture
def current_admin_user_dict():
    """Mock current admin user from auth dependency."""
    return {
        "id": 2,
        "username": fake.user_name(),
        "email": fake.email(),
        "name": fake.name(),
        "role": UserRoleEnum.ADMIN,
    }


@pytest.fixture
def valid_access_token():
    """Generate a valid access token for testing."""
    from src.app.core.security import create_access_token

    data = {"sub": "test_user", "role": "user"}
    return create_access_token(data)


@pytest.fixture
def valid_refresh_token():
    """Generate a valid refresh token for testing."""
    from src.app.core.security import create_refresh_token

    data = {"sub": "test_user"}
    return create_refresh_token(data)


@pytest.fixture
def mock_queue_pool():
    """Mock ARQ queue pool for testing."""
    mock_pool = Mock()
    mock_pool.enqueue_job = AsyncMock()
    mock_pool.get_job_result = AsyncMock()
    return mock_pool
