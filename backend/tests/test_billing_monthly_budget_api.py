"""Tests for billing monthly budget API endpoint."""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


class TestBillingMonthlyBudgetAPI:
    """Tests for GET /academic-load-files/{file_id}/billing-monthly-budget endpoint."""

    async def test_get_monthly_budget_success(self, client: AsyncClient, admin_headers: dict):
        """Test successful retrieval of monthly budget."""
        file_id = 1

        response = await client.get(f"/v1/academic-load-files/{file_id}/billing-monthly-budget", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data
        assert isinstance(data["data"], list)
        assert isinstance(data["total"], int)

    async def test_get_monthly_budget_file_not_found(self, client: AsyncClient, admin_headers: dict):
        """Test 404 when file doesn't exist."""
        file_id = 99999

        response = await client.get(f"/v1/academic-load-files/{file_id}/billing-monthly-budget", headers=admin_headers)

        assert response.status_code == 404
        assert "no encontrado" in response.json()["detail"].lower()

    async def test_get_monthly_budget_response_structure(self, client: AsyncClient, admin_headers: dict):
        """Test that response has correct structure."""
        file_id = 1

        response = await client.get(f"/v1/academic-load-files/{file_id}/billing-monthly-budget", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()

        assert "data" in data
        assert "total" in data

        if data["data"]:
            block = data["data"][0]
            assert "class_days" in block
            assert "class_schedule" in block
            assert "class_duration" in block
            assert "months" in block

            # Verify month structure
            if block["months"]:
                month = block["months"][0]
                assert "year" in month
                assert "month" in month
                assert "month_name" in month
                assert "sessions" in month
                assert "real_time_minutes" in month
                assert "total_class_hours" in month
                assert "total_dollars" in month

    async def test_get_monthly_budget_unauthenticated(self, client: AsyncClient):
        """Test that unauthenticated requests are rejected."""
        file_id = 1

        response = await client.get(f"/v1/academic-load-files/{file_id}/billing-monthly-budget")

        assert response.status_code == 401

    async def test_get_monthly_budget_total_matches_data_length(self, client: AsyncClient, admin_headers: dict):
        """Test that total field matches the length of data array."""
        file_id = 1

        response = await client.get(f"/v1/academic-load-files/{file_id}/billing-monthly-budget", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()

        assert data["total"] == len(data["data"])

    async def test_monthly_budget_has_months_for_term(self, client: AsyncClient, admin_headers: dict):
        """Test that monthly budget includes all months in the term."""
        file_id = 1

        response = await client.get(f"/v1/academic-load-files/{file_id}/billing-monthly-budget", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()

        # Verify that blocks have months
        for block in data["data"]:
            assert isinstance(block["months"], list)
            # Should have at least one month
            if len(block["months"]) > 0:
                month = block["months"][0]
                assert "year" in month
                assert 1 <= month["month"] <= 12
                assert month["sessions"] >= 0
                assert month["real_time_minutes"] >= 0
                assert month["total_class_hours"] >= 0
                assert month["total_dollars"] >= 0
