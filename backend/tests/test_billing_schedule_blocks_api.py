"""Tests for billing schedule blocks API endpoint."""

import pytest
from httpx import AsyncClient

pytestmark = [pytest.mark.asyncio, pytest.mark.integration]


class TestBillingScheduleBlocksAPI:
    """Tests for GET /academic-load-files/{file_id}/billing-schedule-blocks endpoint."""

    async def test_get_schedule_blocks_success(self, client: AsyncClient, admin_headers: dict):
        """Test successful retrieval of schedule blocks."""
        # TODO: Mock or create test data
        # This will need actual file_id that exists in test DB
        file_id = 1

        response = await client.get(f"/v1/academic-load-files/{file_id}/billing-schedule-blocks", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data
        assert isinstance(data["data"], list)
        assert isinstance(data["total"], int)

    async def test_get_schedule_blocks_file_not_found(self, client: AsyncClient, admin_headers: dict):
        """Test 404 when file doesn't exist."""
        file_id = 99999

        response = await client.get(f"/v1/academic-load-files/{file_id}/billing-schedule-blocks", headers=admin_headers)

        assert response.status_code == 404
        assert "no encontrado" in response.json()["detail"].lower()

    async def test_get_schedule_blocks_returns_unique_blocks(self, client: AsyncClient, admin_headers: dict):
        """Test that returned blocks are unique."""
        file_id = 1

        response = await client.get(f"/v1/academic-load-files/{file_id}/billing-schedule-blocks", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()

        # Verify no duplicate blocks
        schedule_keys = []
        for block in data["data"]:
            key = (block["class_days"], block["class_schedule"], block["class_duration"])
            assert key not in schedule_keys, f"Duplicate block found: {key}"
            schedule_keys.append(key)

    async def test_get_schedule_blocks_response_structure(self, client: AsyncClient, admin_headers: dict):
        """Test that response has correct structure."""
        file_id = 1

        response = await client.get(f"/v1/academic-load-files/{file_id}/billing-schedule-blocks", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()

        assert "data" in data
        assert "total" in data

        if data["data"]:
            block = data["data"][0]
            assert "class_days" in block
            assert "class_schedule" in block
            assert "class_duration" in block
            assert isinstance(block["class_days"], str)
            assert isinstance(block["class_schedule"], str)
            assert isinstance(block["class_duration"], int)

    async def test_get_schedule_blocks_unauthenticated(self, client: AsyncClient):
        """Test that unauthenticated requests are rejected."""
        file_id = 1

        response = await client.get(f"/v1/academic-load-files/{file_id}/billing-schedule-blocks")

        assert response.status_code == 401

    async def test_get_schedule_blocks_total_matches_data_length(self, client: AsyncClient, admin_headers: dict):
        """Test that total field matches the length of data array."""
        file_id = 1

        response = await client.get(f"/v1/academic-load-files/{file_id}/billing-schedule-blocks", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()

        assert data["total"] == len(data["data"])
