"""Unit tests for user API endpoints."""

from unittest.mock import AsyncMock, Mock, patch

import pytest

from src.app.api.v1.users import (
    get_current_user_profile,
    read_users,
    write_user,
)
from src.app.core.exceptions.http_exceptions import DuplicateValueException, NotFoundException
from src.app.schemas.user import UserCreate, UserRead


class TestWriteUser:
    """Test user creation endpoint."""

    @pytest.mark.asyncio
    async def test_create_user_success(self, mock_db, sample_user_data, sample_user_read):
        """Test successful user creation."""
        user_create = UserCreate(**sample_user_data)

        with patch("src.app.api.v1.users.crud_users") as mock_crud:
            # Mock that email and username don't exist
            mock_crud.exists = AsyncMock(side_effect=[False, False])  # email, then username
            mock_crud.create = AsyncMock(return_value=Mock(id=1))
            mock_crud.get = AsyncMock(return_value=sample_user_read)

            with patch("src.app.api.v1.users.get_password_hash") as mock_hash:
                mock_hash.return_value = "hashed_password"

                result = await write_user(Mock(), user_create, mock_db)

                assert result == sample_user_read
                mock_crud.exists.assert_any_call(db=mock_db, email=user_create.email)
                mock_crud.exists.assert_any_call(db=mock_db, username=user_create.username)
                mock_crud.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_user_duplicate_email(self, mock_db, sample_user_data):
        """Test user creation with duplicate email."""
        user_create = UserCreate(**sample_user_data)

        with patch("src.app.api.v1.users.crud_users") as mock_crud:
            # Mock that email already exists
            mock_crud.exists = AsyncMock(return_value=True)

            with pytest.raises(DuplicateValueException, match="Email is already registered"):
                await write_user(Mock(), user_create, mock_db)

    @pytest.mark.asyncio
    async def test_create_user_duplicate_username(self, mock_db, sample_user_data):
        """Test user creation with duplicate username."""
        user_create = UserCreate(**sample_user_data)

        with patch("src.app.api.v1.users.crud_users") as mock_crud:
            # Mock email doesn't exist, but username does
            mock_crud.exists = AsyncMock(side_effect=[False, True])

            with pytest.raises(DuplicateValueException, match="Username not available"):
                await write_user(Mock(), user_create, mock_db)


class TestReadUsers:
    """Test users list endpoint."""

    @pytest.mark.asyncio
    async def test_read_users_success(self, mock_db, current_user_dict):
        """Test successful users list retrieval."""
        mock_users_data = {"data": [{"id": 1}, {"id": 2}], "total_count": 2}

        with patch("src.app.api.v1.users.get_non_deleted_users") as mock_get_users:
            mock_get_users.return_value = mock_users_data

            with patch("src.app.api.v1.users.paginated_response") as mock_paginated:
                expected_response = {"data": [{"id": 1}, {"id": 2}], "total_count": 2, "page": 1, "items_per_page": 10}
                mock_paginated.return_value = expected_response

                result = await read_users(Mock(), mock_db, current_user_dict, page=1, items_per_page=10)

                assert result == expected_response
                mock_get_users.assert_called_once()
                mock_paginated.assert_called_once()


class TestGetCurrentUserProfile:
    """Test get current user profile endpoint."""

    @pytest.mark.asyncio
    async def test_get_current_user_profile_success(self, mock_db, current_user_dict, sample_user_read):
        """Test successful retrieval of current user profile from database."""
        with patch("src.app.api.v1.users.crud_users") as mock_crud:
            mock_crud.get = AsyncMock(return_value=sample_user_read)

            result = await get_current_user_profile(current_user_dict, mock_db)

            assert result == sample_user_read
            mock_crud.get.assert_called_once_with(
                db=mock_db,
                uuid=current_user_dict["user_uuid"],
                deleted=False,
                schema_to_select=UserRead,
            )

    @pytest.mark.asyncio
    async def test_get_current_user_profile_not_found(self, mock_db, current_user_dict):
        """Test get current user profile when user doesn't exist in database."""
        with patch("src.app.api.v1.users.crud_users") as mock_crud:
            mock_crud.get = AsyncMock(return_value=None)

            with pytest.raises(NotFoundException, match="User not found"):
                await get_current_user_profile(current_user_dict, mock_db)

    @pytest.mark.asyncio
    async def test_get_current_user_profile_no_uuid(self, mock_db):
        """Test get current user profile when user_uuid is missing from token."""
        from src.app.core.exceptions.http_exceptions import UnauthorizedException

        current_user_without_uuid = {"username": "test_user", "role": "user"}

        with pytest.raises(UnauthorizedException, match="Invalid authentication token"):
            await get_current_user_profile(current_user_without_uuid, mock_db)
