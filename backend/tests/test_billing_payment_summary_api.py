"""Tests for billing payment summary API endpoint."""

import pytest
from httpx import AsyncClient

pytestmark = [pytest.mark.asyncio, pytest.mark.integration]


class TestBillingPaymentSummaryAPI:
    """Tests for GET /academic-load-files/{file_id}/billing-payment-summary endpoint."""

    async def test_get_payment_summary_success(self, client: AsyncClient, admin_headers: dict):
        """Test successful retrieval of payment summary."""
        file_id = 1

        response = await client.get(f"/v1/academic-load-files/{file_id}/billing-payment-summary", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data
        assert isinstance(data["data"], list)
        assert isinstance(data["total"], int)

    async def test_get_payment_summary_file_not_found(self, client: AsyncClient, admin_headers: dict):
        """Test 404 when file doesn't exist."""
        file_id = 99999

        response = await client.get(f"/v1/academic-load-files/{file_id}/billing-payment-summary", headers=admin_headers)

        assert response.status_code == 404
        assert "no encontrado" in response.json()["detail"].lower()

    async def test_get_payment_summary_response_structure(self, client: AsyncClient, admin_headers: dict):
        """Test that response has correct structure."""
        file_id = 1

        response = await client.get(f"/v1/academic-load-files/{file_id}/billing-payment-summary", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()

        assert "data" in data
        assert "total" in data

        if data["data"]:
            summary = data["data"][0]
            assert "class_days" in summary
            assert "class_schedule" in summary
            assert "class_duration" in summary
            assert "payment_rates_by_level" in summary

            # Verify payment rates structure
            rates = summary["payment_rates_by_level"]
            assert "grado" in rates
            assert "maestria_1" in rates
            assert "maestria_2" in rates
            assert "doctor" in rates
            assert "bilingue" in rates

    async def test_get_payment_summary_unauthenticated(self, client: AsyncClient):
        """Test that unauthenticated requests are rejected."""
        file_id = 1

        response = await client.get(f"/v1/academic-load-files/{file_id}/billing-payment-summary")

        assert response.status_code == 401

    async def test_get_payment_summary_total_matches_data_length(self, client: AsyncClient, admin_headers: dict):
        """Test that total field matches the length of data array."""
        file_id = 1

        response = await client.get(f"/v1/academic-load-files/{file_id}/billing-payment-summary", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()

        assert data["total"] == len(data["data"])

    async def test_payment_rates_are_decimals(self, client: AsyncClient, admin_headers: dict):
        """Test that payment rates are returned as decimal/float values."""
        file_id = 1

        response = await client.get(f"/v1/academic-load-files/{file_id}/billing-payment-summary", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()

        if data["data"]:
            rates = data["data"][0]["payment_rates_by_level"]
            assert isinstance(rates["grado"], int | float)
            assert isinstance(rates["maestria_1"], int | float)
            assert isinstance(rates["maestria_2"], int | float)
            assert isinstance(rates["doctor"], int | float)
            assert isinstance(rates["bilingue"], int | float)
