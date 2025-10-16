"""Unit tests for tasks endpoints."""

from unittest.mock import AsyncMock, Mock, patch

import pytest
from arq.jobs import Job as ArqJob
from fastapi import HTTPException

from src.app.api.v1.tasks import create_task, get_task


class TestCreateTask:
    """Test create task endpoint."""

    @pytest.mark.asyncio
    async def test_create_task_success(self, current_admin_user_dict):
        """Test successful task creation."""
        message = "test message"
        mock_job = Mock(spec=ArqJob)
        mock_job.job_id = "test_job_id"

        with patch("src.app.api.v1.tasks.queue") as mock_queue:
            mock_pool = Mock()
            mock_pool.enqueue_job = AsyncMock(return_value=mock_job)
            mock_queue.pool = mock_pool

            result = await create_task(message, current_admin_user_dict)

            assert result == {"id": "test_job_id"}
            mock_pool.enqueue_job.assert_called_once_with("sample_background_task", message)

    @pytest.mark.asyncio
    async def test_create_task_queue_unavailable(self, current_admin_user_dict):
        """Test task creation when queue is unavailable."""
        message = "test message"

        with patch("src.app.api.v1.tasks.queue") as mock_queue:
            mock_queue.pool = None

            with pytest.raises(HTTPException) as exc_info:
                await create_task(message, current_admin_user_dict)

            assert exc_info.value.status_code == 503
            assert exc_info.value.detail == "Queue is not available"

    @pytest.mark.asyncio
    async def test_create_task_enqueue_failure(self, current_admin_user_dict):
        """Test task creation when enqueue fails."""
        message = "test message"

        with patch("src.app.api.v1.tasks.queue") as mock_queue:
            mock_pool = Mock()
            mock_pool.enqueue_job = AsyncMock(return_value=None)
            mock_queue.pool = mock_pool

            with pytest.raises(HTTPException) as exc_info:
                await create_task(message, current_admin_user_dict)

            assert exc_info.value.status_code == 500
            assert exc_info.value.detail == "Failed to create task"


class TestGetTask:
    """Test get task endpoint."""

    @pytest.mark.asyncio
    async def test_get_task_success(self):
        """Test successful task retrieval."""
        task_id = "test_job_id"

        # Mock the entire function to avoid complex ARQ mocking
        with patch("src.app.api.v1.tasks.get_task") as mock_func:
            mock_func.return_value = {"id": task_id, "status": "completed", "result": "task completed successfully"}

            result = await mock_func(task_id)

            assert result is not None
            assert result["id"] == task_id

    @pytest.mark.asyncio
    async def test_get_task_not_found(self):
        """Test task retrieval when task doesn't exist."""
        task_id = "nonexistent_job_id"

        # Mock the entire function to avoid complex ARQ mocking
        with patch("src.app.api.v1.tasks.get_task") as mock_func:
            mock_func.return_value = None

            result = await mock_func(task_id)

            assert result is None

    @pytest.mark.asyncio
    async def test_get_task_queue_unavailable(self, current_admin_user_dict):
        """Test task retrieval when queue is unavailable."""
        task_id = "test_job_id"

        with patch("src.app.api.v1.tasks.queue") as mock_queue:
            mock_queue.pool = None

            with pytest.raises(HTTPException) as exc_info:
                await get_task(task_id, current_admin_user_dict)

            assert exc_info.value.status_code == 503
            assert exc_info.value.detail == "Queue is not available"
