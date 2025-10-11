"""Tests for School endpoints."""

import uuid

import pytest
from fastapi.testclient import TestClient

from src.app.api.dependencies import get_current_superuser
from src.app.models.role import UserRoleEnum


class TestSchoolEndpoints:
    """Test suite for School CRUD endpoints."""

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
    def faculty_id(self, client: TestClient, admin_user, override_dependency):
        """Create a faculty and return its UUID."""
        override_dependency(get_current_superuser, admin_user)

        faculty_data = {"name": "Test Faculty", "is_active": True}
        response = client.post("/v1/faculty", json=faculty_data)
        return response.json()["id_faculty"]

    @pytest.fixture
    def school_data(self, faculty_id):
        """Sample school data for testing."""
        return {"name": "Escuela de Informática", "fk_faculty": faculty_id, "is_active": True}

    def test_create_school_as_admin(self, client: TestClient, admin_user, school_data, override_dependency):
        """Test creating a school as admin."""
        override_dependency(get_current_superuser, admin_user)

        response = client.post("/v1/school", json=school_data)

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == school_data["name"]
        assert data["fk_faculty"] == school_data["fk_faculty"]
        assert data["is_active"] == school_data["is_active"]
        assert "id_school" in data
        assert "created_at" in data

    def test_create_school_with_invalid_faculty(self, client: TestClient, admin_user, override_dependency):
        """Test creating a school with invalid faculty fails."""
        override_dependency(get_current_superuser, admin_user)

        invalid_data = {"name": "Test School", "fk_faculty": str(uuid.uuid4()), "is_active": True}

        response = client.post("/v1/school", json=invalid_data)

        assert response.status_code == 404  # Faculty not found

    def test_list_schools_as_admin(self, client: TestClient, admin_user, override_dependency):
        """Test listing schools as admin."""
        override_dependency(get_current_superuser, admin_user)

        response = client.get("/v1/schools")

        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data
        assert "page" in data
        assert "items_per_page" in data

    def test_list_schools_filtered_by_faculty(self, client: TestClient, admin_user, faculty_id, override_dependency):
        """Test listing schools filtered by faculty."""
        override_dependency(get_current_superuser, admin_user)

        response = client.get(f"/v1/schools?faculty_id={faculty_id}")

        assert response.status_code == 200
        data = response.json()
        # All returned schools should belong to the specified faculty
        for school in data.get("data", []):
            assert school["fk_faculty"] == faculty_id

    def test_get_school_by_id(self, client: TestClient, admin_user, school_data, override_dependency):
        """Test getting a specific school by UUID."""
        override_dependency(get_current_superuser, admin_user)

        # Create school
        create_response = client.post("/v1/school", json=school_data)
        school_id = create_response.json()["id_school"]

        # Get school
        response = client.get(f"/v1/school/{school_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id_school"] == school_id
        assert data["name"] == school_data["name"]
        assert "faculty" in data  # Should include related faculty

    def test_update_school(self, client: TestClient, admin_user, school_data, override_dependency):
        """Test updating a school."""
        override_dependency(get_current_superuser, admin_user)

        # Create school
        create_response = client.post("/v1/school", json=school_data)
        school_id = create_response.json()["id_school"]

        # Update school
        update_data = {"name": "Escuela de Sistemas", "is_active": False}
        response = client.patch(f"/v1/school/{school_id}", json=update_data)

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["is_active"] == update_data["is_active"]

    def test_delete_school(self, client: TestClient, admin_user, school_data, override_dependency):
        """Test deleting a school."""
        override_dependency(get_current_superuser, admin_user)

        # Create school
        create_response = client.post("/v1/school", json=school_data)
        school_id = create_response.json()["id_school"]

        # Delete school
        response = client.delete(f"/v1/school/{school_id}")

        assert response.status_code == 204

        # Verify school is deleted
        get_response = client.get(f"/v1/school/{school_id}")
        assert get_response.status_code == 404

    def test_school_endpoints_require_admin(self, client: TestClient):
        """Test that school endpoints require admin privileges."""
        # Try to create without auth
        response = client.post("/v1/school", json={"name": "Test School", "fk_faculty": str(uuid.uuid4())})
        assert response.status_code == 401  # Unauthorized

        # Try to list without auth
        response = client.get("/v1/schools")
        assert response.status_code == 401
