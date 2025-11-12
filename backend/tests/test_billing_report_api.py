"""Tests for complete billing report API endpoint."""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


class TestBillingReportAPI:
    """Tests for GET /academic-load-files/{file_id}/billing-report endpoint."""

    async def test_get_billing_report_success(self, client: AsyncClient, admin_headers: dict):
        """Test successful retrieval of complete billing report."""
        file_id = 1

        response = await client.get(f"/v1/academic-load-files/{file_id}/billing-report", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()

        # Verify all blocks are present
        assert "schedule_blocks" in data
        assert "payment_summary" in data
        assert "monthly_budget" in data

        assert isinstance(data["schedule_blocks"], list)
        assert isinstance(data["payment_summary"], list)
        assert isinstance(data["monthly_budget"], list)

    async def test_get_billing_report_file_not_found(self, client: AsyncClient, admin_headers: dict):
        """Test 404 when file doesn't exist."""
        file_id = 99999

        response = await client.get(f"/v1/academic-load-files/{file_id}/billing-report", headers=admin_headers)

        assert response.status_code == 404
        assert "no encontrado" in response.json()["detail"].lower()

    async def test_get_billing_report_unauthenticated(self, client: AsyncClient):
        """Test that unauthenticated requests are rejected."""
        file_id = 1

        response = await client.get(f"/v1/academic-load-files/{file_id}/billing-report")

        assert response.status_code == 401

    async def test_billing_report_all_blocks_same_length(self, client: AsyncClient, admin_headers: dict):
        """Test that all blocks have the same number of items."""
        file_id = 1

        response = await client.get(f"/v1/academic-load-files/{file_id}/billing-report", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()

        schedule_count = len(data["schedule_blocks"])
        payment_count = len(data["payment_summary"])
        budget_count = len(data["monthly_budget"])

        assert schedule_count == payment_count == budget_count

    async def test_billing_report_schedule_blocks_structure(self, client: AsyncClient, admin_headers: dict):
        """Test that schedule_blocks have correct structure."""
        file_id = 1

        response = await client.get(f"/v1/academic-load-files/{file_id}/billing-report", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()

        if data["schedule_blocks"]:
            block = data["schedule_blocks"][0]
            assert "class_days" in block
            assert "class_schedule" in block
            assert "class_duration" in block

    async def test_billing_report_payment_summary_structure(self, client: AsyncClient, admin_headers: dict):
        """Test that payment_summary has correct structure."""
        file_id = 1

        response = await client.get(f"/v1/academic-load-files/{file_id}/billing-report", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()

        if data["payment_summary"]:
            summary = data["payment_summary"][0]
            assert "class_days" in summary
            assert "class_schedule" in summary
            assert "class_duration" in summary
            assert "payment_rates_by_level" in summary

            rates = summary["payment_rates_by_level"]
            assert "grado" in rates
            assert "maestria_1" in rates
            assert "maestria_2" in rates
            assert "doctor" in rates
            assert "bilingue" in rates

    async def test_billing_report_monthly_budget_structure(self, client: AsyncClient, admin_headers: dict):
        """Test that monthly_budget has correct structure."""
        file_id = 1

        response = await client.get(f"/v1/academic-load-files/{file_id}/billing-report", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()

        if data["monthly_budget"]:
            budget = data["monthly_budget"][0]
            assert "class_days" in budget
            assert "class_schedule" in budget
            assert "class_duration" in budget
            assert "months" in budget

            if budget["months"]:
                month = budget["months"][0]
                assert "year" in month
                assert "month" in month
                assert "month_name" in month
                assert "sessions" in month
                assert "real_time_minutes" in month
                assert "total_class_hours" in month
                assert "total_dollars" in month

    async def test_billing_report_blocks_are_ordered(self, client: AsyncClient, admin_headers: dict):
        """Test that blocks are consistently ordered across all sections."""
        file_id = 1

        response = await client.get(f"/v1/academic-load-files/{file_id}/billing-report", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()

        # Verify that blocks are in the same order across all sections
        for i in range(len(data["schedule_blocks"])):
            schedule_block = data["schedule_blocks"][i]
            payment_block = data["payment_summary"][i]
            budget_block = data["monthly_budget"][i]

            assert schedule_block["class_days"] == payment_block["class_days"]
            assert schedule_block["class_schedule"] == payment_block["class_schedule"]
            assert schedule_block["class_duration"] == payment_block["class_duration"]

            assert schedule_block["class_days"] == budget_block["class_days"]
            assert schedule_block["class_schedule"] == budget_block["class_schedule"]
            assert schedule_block["class_duration"] == budget_block["class_duration"]
