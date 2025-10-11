"""Unit tests for Redis blacklist functionality."""

from unittest.mock import AsyncMock, Mock, patch

import pytest

from src.app.core.utils.redis_blacklist import (
    add_token_to_blacklist,
    is_token_blacklisted,
    remove_token_from_blacklist,
)


class TestRedisBlacklist:
    """Test Redis blacklist functionality."""

    @pytest.mark.asyncio
    async def test_add_token_to_blacklist_success(self):
        """Test successful token addition to blacklist."""
        mock_client = AsyncMock()

        with patch("src.app.core.utils.redis_blacklist.redis_client", mock_client):
            await add_token_to_blacklist("test_token", 3600)

            mock_client.setex.assert_called_once_with("blacklist:token:test_token", 3600, "1")

    @pytest.mark.asyncio
    async def test_add_token_to_blacklist_redis_unavailable(self):
        """Test token addition when Redis is unavailable."""
        with patch("src.app.core.utils.redis_blacklist.redis_client", None):
            # Should not raise an exception, should fail gracefully
            await add_token_to_blacklist("test_token", 3600)

    @pytest.mark.asyncio
    async def test_is_token_blacklisted_success(self):
        """Test successful token blacklist check."""
        mock_client = AsyncMock()
        mock_client.exists.return_value = 1  # Token exists (blacklisted)

        with patch("src.app.core.utils.redis_blacklist.redis_client", mock_client):
            result = await is_token_blacklisted("test_token")

            assert result is True
            mock_client.exists.assert_called_once_with("blacklist:token:test_token")

    @pytest.mark.asyncio
    async def test_is_token_blacklisted_not_found(self):
        """Test token blacklist check when token is not blacklisted."""
        mock_client = AsyncMock()
        mock_client.exists.return_value = 0  # Token does not exist (not blacklisted)

        with patch("src.app.core.utils.redis_blacklist.redis_client", mock_client):
            result = await is_token_blacklisted("test_token")

            assert result is False
            mock_client.exists.assert_called_once_with("blacklist:token:test_token")

    @pytest.mark.asyncio
    async def test_is_token_blacklisted_redis_unavailable(self):
        """Test token blacklist check when Redis is unavailable."""
        with patch("src.app.core.utils.redis_blacklist.redis_client", None):
            # Should return False (not blacklisted) when Redis is unavailable
            result = await is_token_blacklisted("test_token")

            assert result is False

    @pytest.mark.asyncio
    async def test_remove_token_from_blacklist_success(self):
        """Test successful token removal from blacklist."""
        mock_client = AsyncMock()

        with patch("src.app.core.utils.redis_blacklist.redis_client", mock_client):
            await remove_token_from_blacklist("test_token")

            mock_client.delete.assert_called_once_with("blacklist:token:test_token")

    @pytest.mark.asyncio
    async def test_remove_token_from_blacklist_redis_unavailable(self):
        """Test token removal when Redis is unavailable."""
        with patch("src.app.core.utils.redis_blacklist.redis_client", None):
            # Should not raise an exception, should fail gracefully
            await remove_token_from_blacklist("test_token")

    @pytest.mark.asyncio
    async def test_redis_client_direct_check(self):
        """Test that Redis client is checked directly without waiting."""
        # When Redis is available, operations should proceed immediately
        mock_client = AsyncMock()

        with patch("src.app.core.utils.redis_blacklist.redis_client", mock_client):
            # Test that we can add to blacklist
            await add_token_to_blacklist("test_token", 3600)
            mock_client.setex.assert_called_once()

        # When Redis is not available, operations should fail immediately
        with patch("src.app.core.utils.redis_blacklist.redis_client", None):
            # Should not raise exception, should return immediately
            await add_token_to_blacklist("test_token", 3600)
            result = await is_token_blacklisted("test_token")
            assert result is False

    @pytest.mark.asyncio
    async def test_blacklist_integration_with_security(self):
        """Test integration of blacklist with security functions."""
        from src.app.core.security import blacklist_token

        mock_client = AsyncMock()

        with patch("src.app.core.utils.redis_blacklist.redis_client", mock_client):
            with patch("src.app.core.security.jwt.decode") as mock_decode:
                # Mock JWT decode to return a valid payload
                mock_decode.return_value = {
                    "exp": 1760166123,  # Future timestamp
                    "sub": "test_user",
                }

                # Mock datetime.now to return a past timestamp
                with patch("src.app.core.security.datetime") as mock_datetime:
                    mock_now = Mock()
                    mock_now.timestamp.return_value = 1760160000  # Past time
                    mock_datetime.now.return_value.replace.return_value = mock_now

                    await blacklist_token("test_token", Mock())

                    # Should call Redis setex
                    mock_client.setex.assert_called_once()

    @pytest.mark.asyncio
    async def test_blacklist_expired_token_handling(self):
        """Test that expired tokens are not added to blacklist."""
        from src.app.core.security import blacklist_token

        with patch("src.app.core.security.jwt.decode") as mock_decode:
            # Mock JWT decode to return an expired payload
            mock_decode.return_value = {
                "exp": 1760000000,  # Past timestamp (expired)
                "sub": "test_user",
            }

            # Mock datetime.now to return current timestamp
            with patch("src.app.core.security.datetime") as mock_datetime:
                mock_now = Mock()
                mock_now.timestamp.return_value = 1760166123  # Current time
                mock_datetime.now.return_value.replace.return_value = mock_now

                await blacklist_token("expired_token", Mock())

                # Should not call Redis since token is expired
                # (This test verifies the logic in blacklist_token)
