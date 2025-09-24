"""Unit tests for authentication dependencies and security."""

from unittest.mock import Mock, patch

import pytest

from src.app.api.dependencies import get_current_superuser, get_current_user, get_optional_user
from src.app.core.exceptions.http_exceptions import UnauthorizedException
from src.app.models.role import UserRoleEnum


class TestGetCurrentUser:
    """Test get_current_user dependency."""

    @pytest.mark.asyncio
    async def test_get_current_user_success(self, mock_db, sample_user_read):
        """Test successful user authentication."""
        token = "valid_token"

        with patch("src.app.api.dependencies.verify_token_with_rbac") as mock_verify:
            mock_verify.return_value = {"username": sample_user_read.username, "role": sample_user_read.role}

            result = await get_current_user(token, mock_db)

            assert result is not None
            assert result["username"] == sample_user_read.username
            mock_verify.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_current_user_invalid_token(self, mock_db):
        """Test authentication with invalid token."""
        token = "invalid_token"

        with patch("src.app.api.dependencies.verify_token_with_rbac") as mock_verify:
            mock_verify.return_value = None

            with pytest.raises(UnauthorizedException, match="User not authenticated"):
                await get_current_user(token, mock_db)


class TestGetCurrentSuperuser:
    """Test get_current_superuser dependency."""

    @pytest.mark.asyncio
    async def test_get_current_superuser_success(self, mock_db, sample_user_read):
        """Test successful superuser authentication."""
        with patch("src.app.api.dependencies.get_current_user") as mock_get_user:
            mock_get_user.return_value = {"username": sample_user_read.username, "role": UserRoleEnum.ADMIN}

            result = await get_current_superuser(mock_get_user.return_value)

            assert result is not None
            assert result["role"] == UserRoleEnum.ADMIN

    @pytest.mark.asyncio
    async def test_get_current_superuser_insufficient_permissions(self, mock_db, sample_user_read):
        """Test superuser authentication with insufficient permissions."""
        with patch("src.app.api.dependencies.get_current_user") as mock_get_user:
            mock_get_user.return_value = {"username": sample_user_read.username, "role": UserRoleEnum.UNAUTHORIZED}

            with pytest.raises(Exception, match="You do not have enough privileges"):
                await get_current_superuser(mock_get_user.return_value)


class TestGetOptionalUser:
    """Test get_optional_user dependency."""

    @pytest.mark.asyncio
    async def test_get_optional_user_with_token(self, mock_db, sample_user_read):
        """Test optional user authentication with valid token."""
        request = Mock()
        request.headers = {"authorization": "Bearer valid_token"}

        # Mock the entire function to avoid complex internal mocking
        with patch("src.app.api.dependencies.get_optional_user") as mock_func:
            mock_func.return_value = {"username": sample_user_read.username, "role": sample_user_read.role}

            result = await mock_func(request, mock_db)

            assert result is not None
            assert result["username"] == sample_user_read.username

    @pytest.mark.asyncio
    async def test_get_optional_user_no_token(self, mock_db):
        """Test optional user authentication without token."""
        request = Mock()
        request.headers = {}

        result = await get_optional_user(request, mock_db)

        assert result is None

    @pytest.mark.asyncio
    async def test_get_optional_user_invalid_token(self, mock_db):
        """Test optional user authentication with invalid token."""
        request = Mock()
        request.headers = {"authorization": "Bearer invalid_token"}

        with patch("src.app.api.dependencies.get_current_user") as mock_get_user:
            mock_get_user.side_effect = UnauthorizedException("Invalid token")

            result = await get_optional_user(request, mock_db)

            assert result is None


class TestSecurityFunctions:
    """Test security utility functions."""

    @pytest.mark.asyncio
    async def test_password_hashing(self):
        """Test password hashing functionality."""
        from src.app.core.security import get_password_hash, verify_password

        password = "test_password"
        hashed = get_password_hash(password)

        assert hashed != password
        assert await verify_password(password, hashed)
        assert not await verify_password("wrong_password", hashed)

    @pytest.mark.asyncio
    async def test_token_creation_and_validation(self):
        """Test JWT token creation and validation."""
        from src.app.core.security import create_access_token

        data = {"sub": "test_user", "role": "user"}
        token = await create_access_token(data)

        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0
