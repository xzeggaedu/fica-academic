"""Integration tests for Annual Holidays API endpoints."""

from datetime import datetime

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.models.holiday import Holiday


class TestAnnualHolidaysAPI:
    """Integration tests for Annual Holidays API endpoints."""

    pytestmark = pytest.mark.skip_db_tests

    @pytest.mark.asyncio
    async def test_create_annual_holiday_api(self, client: AsyncClient, db_session: AsyncSession, auth_headers):
        """Test creating an annual holiday via API."""
        # Create a holiday year first
        holiday = Holiday(year=2025, description="Asuetos 2025", created_at=datetime.utcnow())
        db_session.add(holiday)
        await db_session.commit()
        await db_session.refresh(holiday)

        # Create annual holiday data
        holiday_data = {
            "holiday_id": holiday.id,
            "date": "2025-05-01",
            "name": "Día del Trabajo",
            "type": "Asueto Nacional",
        }

        # Make API request
        response = await client.post("/api/v1/annual-holidays/", json=holiday_data, headers=auth_headers)

        # Assertions
        assert response.status_code == 201
        data = response.json()
        assert data["holiday_id"] == holiday.id
        assert data["date"] == "2025-05-01"
        assert data["name"] == "Día del Trabajo"
        assert data["type"] == "Asueto Nacional"
        assert "id" in data
        assert "created_at" in data

    @pytest.mark.asyncio
    async def test_get_annual_holidays_api(self, client: AsyncClient, db_session: AsyncSession, auth_headers):
        """Test getting annual holidays via API."""
        # Create a holiday year
        holiday = Holiday(year=2025, description="Asuetos 2025", created_at=datetime.utcnow())
        db_session.add(holiday)
        await db_session.commit()
        await db_session.refresh(holiday)

        # Create annual holidays
        holidays_data = [
            {"holiday_id": holiday.id, "date": "2025-01-01", "name": "Año Nuevo", "type": "Asueto Nacional"},
            {"holiday_id": holiday.id, "date": "2025-05-01", "name": "Día del Trabajo", "type": "Asueto Nacional"},
        ]

        for holiday_data in holidays_data:
            response = await client.post("/api/v1/annual-holidays/", json=holiday_data, headers=auth_headers)
            assert response.status_code == 201

        # Get annual holidays
        response = await client.get(f"/api/v1/annual-holidays/?holiday_id={holiday.id}", headers=auth_headers)

        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert len(data["data"]) == 2
        assert data["total"] == 2

    @pytest.mark.asyncio
    async def test_get_annual_holidays_with_filters_api(
        self, client: AsyncClient, db_session: AsyncSession, auth_headers
    ):
        """Test getting annual holidays with filters via API."""
        # Create a holiday year
        holiday = Holiday(year=2025, description="Asuetos 2025", created_at=datetime.utcnow())
        db_session.add(holiday)
        await db_session.commit()
        await db_session.refresh(holiday)

        # Create annual holidays with different types
        holidays_data = [
            {"holiday_id": holiday.id, "date": "2025-01-01", "name": "Año Nuevo", "type": "Asueto Nacional"},
            {"holiday_id": holiday.id, "date": "2025-12-24", "name": "Cierre Administrativo", "type": "Personalizado"},
        ]

        for holiday_data in holidays_data:
            response = await client.post("/api/v1/annual-holidays/", json=holiday_data, headers=auth_headers)
            assert response.status_code == 201

        # Get national holidays only
        response = await client.get(
            f"/api/v1/annual-holidays/?holiday_id={holiday.id}&type_filter=Asueto Nacional", headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) == 1
        assert data["data"][0]["type"] == "Asueto Nacional"

        # Get custom holidays only
        response = await client.get(
            f"/api/v1/annual-holidays/?holiday_id={holiday.id}&type_filter=Personalizado", headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) == 1
        assert data["data"][0]["type"] == "Personalizado"

    @pytest.mark.asyncio
    async def test_update_annual_holiday_api(self, client: AsyncClient, db_session: AsyncSession, auth_headers):
        """Test updating an annual holiday via API."""
        # Create a holiday year and annual holiday
        holiday = Holiday(year=2025, description="Asuetos 2025", created_at=datetime.utcnow())
        db_session.add(holiday)
        await db_session.commit()
        await db_session.refresh(holiday)

        holiday_data = {
            "holiday_id": holiday.id,
            "date": "2025-05-01",
            "name": "Día del Trabajo",
            "type": "Asueto Nacional",
        }

        # Create annual holiday
        response = await client.post("/api/v1/annual-holidays/", json=holiday_data, headers=auth_headers)
        assert response.status_code == 201
        created_holiday = response.json()

        # Update the holiday
        update_data = {"name": "Día Internacional del Trabajo", "type": "Personalizado"}

        response = await client.put(
            f"/api/v1/annual-holidays/{created_holiday['id']}", json=update_data, headers=auth_headers
        )

        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Día Internacional del Trabajo"
        assert data["type"] == "Personalizado"
        assert data["date"] == "2025-05-01"  # Date should remain unchanged

    @pytest.mark.asyncio
    async def test_delete_annual_holiday_api(self, client: AsyncClient, db_session: AsyncSession, auth_headers):
        """Test deleting an annual holiday via API."""
        # Create a holiday year and annual holiday
        holiday = Holiday(year=2025, description="Asuetos 2025", created_at=datetime.utcnow())
        db_session.add(holiday)
        await db_session.commit()
        await db_session.refresh(holiday)

        holiday_data = {
            "holiday_id": holiday.id,
            "date": "2025-05-01",
            "name": "Día del Trabajo",
            "type": "Asueto Nacional",
        }

        # Create annual holiday
        response = await client.post("/api/v1/annual-holidays/", json=holiday_data, headers=auth_headers)
        assert response.status_code == 201
        created_holiday = response.json()

        # Delete the holiday
        response = await client.delete(f"/api/v1/annual-holidays/{created_holiday['id']}", headers=auth_headers)

        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Annual holiday deleted successfully"

        # Verify it's deleted
        response = await client.get(f"/api/v1/annual-holidays/{created_holiday['id']}", headers=auth_headers)
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_create_annual_holiday_duplicate_date_api(
        self, client: AsyncClient, db_session: AsyncSession, auth_headers
    ):
        """Test creating annual holiday with duplicate date fails via API."""
        # Create a holiday year
        holiday = Holiday(year=2025, description="Asuetos 2025", created_at=datetime.utcnow())
        db_session.add(holiday)
        await db_session.commit()
        await db_session.refresh(holiday)

        holiday_data = {
            "holiday_id": holiday.id,
            "date": "2025-05-01",
            "name": "Día del Trabajo",
            "type": "Asueto Nacional",
        }

        # Create first annual holiday
        response = await client.post("/api/v1/annual-holidays/", json=holiday_data, headers=auth_headers)
        assert response.status_code == 201

        # Try to create second annual holiday with same date
        holiday_data2 = {"holiday_id": holiday.id, "date": "2025-05-01", "name": "Otro Asueto", "type": "Personalizado"}

        response = await client.post("/api/v1/annual-holidays/", json=holiday_data2, headers=auth_headers)

        # Should return 400 Bad Request
        assert response.status_code == 400
        data = response.json()
        assert "Ya existe un asueto para la fecha" in data["detail"]

    @pytest.mark.asyncio
    async def test_create_annual_holiday_wrong_year_api(
        self, client: AsyncClient, db_session: AsyncSession, auth_headers
    ):
        """Test creating annual holiday with wrong year fails via API."""
        # Create a holiday year for 2025
        holiday = Holiday(year=2025, description="Asuetos 2025", created_at=datetime.utcnow())
        db_session.add(holiday)
        await db_session.commit()
        await db_session.refresh(holiday)

        # Try to create annual holiday with 2026 date
        holiday_data = {
            "holiday_id": holiday.id,
            "date": "2026-05-01",
            "name": "Día del Trabajo",
            "type": "Asueto Nacional",
        }

        response = await client.post("/api/v1/annual-holidays/", json=holiday_data, headers=auth_headers)

        # Should return 400 Bad Request
        assert response.status_code == 400
        data = response.json()
        assert "no corresponde al año" in data["detail"]

    @pytest.mark.asyncio
    async def test_get_annual_holiday_not_found_api(self, client: AsyncClient, auth_headers):
        """Test getting non-existent annual holiday via API."""
        response = await client.get("/api/v1/annual-holidays/999", headers=auth_headers)

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_annual_holiday_not_found_api(self, client: AsyncClient, auth_headers):
        """Test updating non-existent annual holiday via API."""
        update_data = {"name": "Updated Name"}

        response = await client.put("/api/v1/annual-holidays/999", json=update_data, headers=auth_headers)

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_annual_holiday_not_found_api(self, client: AsyncClient, auth_headers):
        """Test deleting non-existent annual holiday via API."""
        response = await client.delete("/api/v1/annual-holidays/999", headers=auth_headers)

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_annual_holidays_pagination_api(self, client: AsyncClient, db_session: AsyncSession, auth_headers):
        """Test pagination in annual holidays API."""
        # Create a holiday year
        holiday = Holiday(year=2025, description="Asuetos 2025", created_at=datetime.utcnow())
        db_session.add(holiday)
        await db_session.commit()
        await db_session.refresh(holiday)

        # Create 5 annual holidays
        for i in range(5):
            holiday_data = {
                "holiday_id": holiday.id,
                "date": f"2025-01-{i + 1:02d}",
                "name": f"Asueto {i + 1}",
                "type": "Personalizado",
            }
            response = await client.post("/api/v1/annual-holidays/", json=holiday_data, headers=auth_headers)
            assert response.status_code == 201

        # Test pagination
        response = await client.get(
            f"/api/v1/annual-holidays/?holiday_id={holiday.id}&skip=0&limit=2", headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) == 2

        # Test second page
        response = await client.get(
            f"/api/v1/annual-holidays/?holiday_id={holiday.id}&skip=2&limit=2", headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) == 2

        # Test third page
        response = await client.get(
            f"/api/v1/annual-holidays/?holiday_id={holiday.id}&skip=4&limit=2", headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) == 1
