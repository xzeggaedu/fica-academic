"""Unit tests for logout endpoint."""

from unittest.mock import AsyncMock, Mock, patch

import pytest

from src.app.api.v1.logout import logout
from src.app.core.exceptions.http_exceptions import UnauthorizedException


class TestLogout:
    """Test logout endpoint."""

    @pytest.mark.asyncio
    async def test_logout_success(self, mock_db):
        """Test successful logout."""
        response = Mock()
        access_token = "valid_access_token"
        refresh_token = "valid_refresh_token"

        with patch("src.app.api.v1.logout.blacklist_tokens", new_callable=AsyncMock) as mock_blacklist:
            result = await logout(response, access_token, refresh_token, mock_db)

            assert result == {"message": "Logged out successfully"}
            mock_blacklist.assert_called_once_with(access_token=access_token, refresh_token=refresh_token, db=mock_db)

            # Verify cookies are cleared
            response.delete_cookie.assert_called_with(key="refresh_token")

    @pytest.mark.asyncio
    async def test_logout_no_refresh_token(self, mock_db):
        """Test logout without refresh token."""
        response = Mock()
        access_token = "valid_access_token"
        refresh_token = None

        with pytest.raises(UnauthorizedException, match="Refresh token not found"):
            await logout(response, access_token, refresh_token, mock_db)

    @pytest.mark.asyncio
    async def test_logout_blacklist_failure(self, mock_db):
        """Test logout when token blacklisting fails."""
        response = Mock()
        access_token = "valid_access_token"
        refresh_token = "valid_refresh_token"

        with patch("src.app.api.v1.logout.blacklist_tokens", new_callable=AsyncMock) as mock_blacklist:
            mock_blacklist.side_effect = Exception("Blacklist failed")

            with pytest.raises(Exception, match="Blacklist failed"):
                await logout(response, access_token, refresh_token, mock_db)
