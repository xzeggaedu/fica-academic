"""Tests for Faculty endpoints.

NOTA: Estas son pruebas de integración que requieren conexión a PostgreSQL.
Para ejecutar solo pruebas unitarias, usar: pytest -m "not integration"
"""


import pytest
from fastapi.testclient import TestClient

from src.app.api.dependencies import get_current_superuser
from src.app.models.role import UserRoleEnum


@pytest.mark.integration
class TestFacultyEndpoints:
    """Test suite for Faculty CRUD endpoints.

    Estas son pruebas de integración que requieren:
    - Conexión a PostgreSQL
    - Conexión a Redis
    - TestClient de FastAPI con lifespan completo
    """

    @pytest.fixture
    def admin_user(self):
        """Mock admin user for testing."""
        return {
            "user_id": 1,
            "username": "admin",
            "email": "admin@utec.edu.sv",
            "name": "Admin User",
            "role": UserRoleEnum.ADMIN,
        }

    @pytest.fixture
    def faculty_data(self):
        """Sample faculty data for testing."""
        return {"name": "Facultad de Ingeniería", "is_active": True}

    def test_create_faculty_as_admin(self, client: TestClient, admin_user, faculty_data, override_dependency):
        """Test creating a faculty as admin."""
        override_dependency(get_current_superuser, admin_user)

        response = client.post("/v1/faculty", json=faculty_data)

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == faculty_data["name"]
        assert data["is_active"] == faculty_data["is_active"]
        assert "id_faculty" in data
        assert "created_at" in data

    def test_create_duplicate_faculty_name(self, client: TestClient, admin_user, faculty_data, override_dependency):
        """Test creating a faculty with duplicate name fails."""
        override_dependency(get_current_superuser, admin_user)

        # Create first faculty
        client.post("/v1/faculty", json=faculty_data)

        # Try to create duplicate
        response = client.post("/v1/faculty", json=faculty_data)

        assert response.status_code == 409  # Conflict

    def test_list_faculties_as_admin(self, client: TestClient, admin_user, override_dependency):
        """Test listing faculties as admin."""
        override_dependency(get_current_superuser, admin_user)

        response = client.get("/v1/faculties")

        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data
        assert "page" in data
        assert "items_per_page" in data

    def test_get_faculty_by_id(self, client: TestClient, admin_user, faculty_data, override_dependency):
        """Test getting a specific faculty by UUID."""
        override_dependency(get_current_superuser, admin_user)

        # Create faculty
        create_response = client.post("/v1/faculty", json=faculty_data)
        faculty_id = create_response.json()["id_faculty"]

        # Get faculty
        response = client.get(f"/v1/faculty/{faculty_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id_faculty"] == faculty_id
        assert data["name"] == faculty_data["name"]

    def test_update_faculty(self, client: TestClient, admin_user, faculty_data, override_dependency):
        """Test updating a faculty."""
        override_dependency(get_current_superuser, admin_user)

        # Create faculty
        create_response = client.post("/v1/faculty", json=faculty_data)
        faculty_id = create_response.json()["id_faculty"]

        # Update faculty
        update_data = {"name": "Facultad de Ciencias", "is_active": False}
        response = client.patch(f"/v1/faculty/{faculty_id}", json=update_data)

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["is_active"] == update_data["is_active"]

    def test_delete_faculty(self, client: TestClient, admin_user, faculty_data, override_dependency):
        """Test deleting a faculty."""
        override_dependency(get_current_superuser, admin_user)

        # Create faculty
        create_response = client.post("/v1/faculty", json=faculty_data)
        faculty_id = create_response.json()["id_faculty"]

        # Delete faculty
        response = client.delete(f"/v1/faculty/{faculty_id}")

        assert response.status_code == 204

        # Verify faculty is deleted
        get_response = client.get(f"/v1/faculty/{faculty_id}")
        assert get_response.status_code == 404

    def test_faculty_endpoints_require_admin(self, client: TestClient):
        """Test that faculty endpoints require admin privileges."""
        # Try to create without auth
        response = client.post("/v1/faculty", json={"name": "Test Faculty"})
        assert response.status_code == 401  # Unauthorized

        # Try to list without auth
        response = client.get("/v1/faculties")
        assert response.status_code == 401
