"""Unit tests for authentication endpoints."""

from unittest.mock import Mock, patch

import pytest

from src.app.api.v1.login import login_for_access_token, refresh_access_token
from src.app.core.exceptions.http_exceptions import UnauthorizedException


class TestLoginForAccessToken:
    """Test login endpoint."""

    @pytest.mark.asyncio
    async def test_login_success_without_remember_me(self, mock_db, sample_user_read):
        """Test successful login without remember me."""
        form_data = Mock()
        form_data.username = sample_user_read.username
        form_data.password = "test_password"

        response = Mock()

        with patch("src.app.api.v1.login.authenticate_user") as mock_auth:
            mock_auth.return_value = sample_user_read

            with patch("src.app.api.v1.login.create_access_token_with_rbac") as mock_create_token:
                mock_create_token.return_value = "access_token"

                with patch("src.app.api.v1.login.create_refresh_token_with_rbac") as mock_create_refresh:
                    mock_create_refresh.return_value = "refresh_token"

                    result = await login_for_access_token(response, form_data, mock_db, remember_me=False)

                    assert result == {"access_token": "access_token", "token_type": "bearer"}
                    mock_auth.assert_called_once_with(
                        username_or_email=form_data.username, password=form_data.password, db=mock_db
                    )

    @pytest.mark.asyncio
    async def test_login_success_with_remember_me(self, mock_db, sample_user_read):
        """Test successful login with remember me."""
        form_data = Mock()
        form_data.username = sample_user_read.username
        form_data.password = "test_password"

        response = Mock()

        with patch("src.app.api.v1.login.authenticate_user") as mock_auth:
            mock_auth.return_value = sample_user_read

            with patch("src.app.api.v1.login.create_access_token_with_rbac") as mock_create_token:
                mock_create_token.return_value = "access_token_extended"

                with patch("src.app.api.v1.login.create_refresh_token_with_rbac") as mock_create_refresh:
                    mock_create_refresh.return_value = "refresh_token_extended"

                    result = await login_for_access_token(response, form_data, mock_db, remember_me=True)

                    assert result == {"access_token": "access_token_extended", "token_type": "bearer"}
                    mock_auth.assert_called_once_with(
                        username_or_email=form_data.username, password=form_data.password, db=mock_db
                    )

    @pytest.mark.asyncio
    async def test_login_invalid_credentials(self, mock_db):
        """Test login with invalid credentials."""
        form_data = Mock()
        form_data.username = "nonexistent_user"
        form_data.password = "test_password"

        response = Mock()

        with patch("src.app.api.v1.login.authenticate_user") as mock_auth:
            mock_auth.return_value = None

            with pytest.raises(UnauthorizedException, match="Wrong username, email or password"):
                await login_for_access_token(response, form_data, mock_db, remember_me=False)


class TestRefreshAccessToken:
    """Test refresh token endpoint."""

    @pytest.mark.asyncio
    async def test_refresh_token_success(self, mock_db, sample_user_read):
        """Test successful token refresh."""
        request = Mock()
        request.cookies = {"refresh_token": "valid_refresh_token"}

        # Mock response object with set_cookie method
        response = Mock()
        response.set_cookie = Mock()

        with patch("src.app.api.v1.login.verify_token_with_rbac") as mock_verify:
            mock_verify.return_value = {
                "sub": sample_user_read.username,
                "role": sample_user_read.role,
                "username": sample_user_read.username,
                "uuid": str(sample_user_read.uuid),
            }

            with patch("src.app.api.v1.login.create_access_token_with_rbac") as mock_create_token:
                mock_create_token.return_value = "new_access_token"

                with patch("src.app.api.v1.login.create_refresh_token_with_rbac") as mock_create_refresh:
                    mock_create_refresh.return_value = "new_refresh_token"

                    result = await refresh_access_token(request, response, mock_db)

                    assert result == {"access_token": "new_access_token", "token_type": "bearer"}
                    mock_verify.assert_called_once_with("valid_refresh_token", "refresh", mock_db)
                    response.set_cookie.assert_called_once()

    @pytest.mark.asyncio
    async def test_refresh_token_invalid_token(self, mock_db):
        """Test refresh with invalid token."""
        request = Mock()
        request.cookies = {"refresh_token": "invalid_token"}

        with patch("src.app.api.v1.login.verify_token_with_rbac") as mock_verify:
            mock_verify.side_effect = UnauthorizedException("Invalid token")

            with pytest.raises(UnauthorizedException, match="Invalid token"):
                await refresh_access_token(request, mock_db)

    @pytest.mark.asyncio
    async def test_refresh_token_no_cookie(self, mock_db):
        """Test refresh with no refresh token cookie."""
        request = Mock()
        request.cookies = {}

        with pytest.raises(UnauthorizedException, match="Refresh token missing"):
            await refresh_access_token(request, mock_db)
