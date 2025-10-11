"""Tests for User Scope assignment endpoints.

NOTA: Estas son pruebas de integración que requieren conexión a PostgreSQL.
Para ejecutar solo pruebas unitarias, usar: pytest -m "not integration"
"""

import pytest
from fastapi.testclient import TestClient

from src.app.api.dependencies import get_current_superuser
from src.app.models.role import UserRoleEnum


@pytest.mark.integration
class TestUserScopeEndpoints:
    """Test suite for User Scope assignment endpoints.

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
    def decano_user(self, client: TestClient, admin_user, override_dependency):
        """Create a DECANO user and return user data."""
        override_dependency(get_current_superuser, admin_user)

        user_data = {
            "name": "Juan Decano",
            "username": "jdecano",
            "email": "jdecano@utec.edu.sv",
            "password": "Password123!",
            "role": "decano",
        }

        response = client.post("/v1/user/admin", json=user_data)
        return response.json()

    @pytest.fixture
    def director_user(self, client: TestClient, admin_user, override_dependency):
        """Create a DIRECTOR user and return user data."""
        override_dependency(get_current_superuser, admin_user)

        user_data = {
            "name": "Maria Directora",
            "username": "mdirectora",
            "email": "mdirectora@utec.edu.sv",
            "password": "Password123!",
            "role": "director",
        }

        response = client.post("/v1/user/admin", json=user_data)
        return response.json()

    @pytest.fixture
    def faculty_id(self, client: TestClient, admin_user, override_dependency):
        """Create a faculty and return its UUID."""
        override_dependency(get_current_superuser, admin_user)

        faculty_data = {"name": "Test Faculty for Scope", "is_active": True}
        response = client.post("/v1/faculty", json=faculty_data)
        return response.json()["id_faculty"]

    @pytest.fixture
    def school_ids(self, client: TestClient, admin_user, faculty_id, override_dependency):
        """Create multiple schools and return their UUIDs."""
        override_dependency(get_current_superuser, admin_user)

        school1_data = {"name": "School 1", "fk_faculty": faculty_id, "is_active": True}
        school2_data = {"name": "School 2", "fk_faculty": faculty_id, "is_active": True}

        response1 = client.post("/v1/school", json=school1_data)
        response2 = client.post("/v1/school", json=school2_data)

        return [response1.json()["id_school"], response2.json()["id_school"]]

    def test_assign_faculty_scope_to_decano(
        self, client: TestClient, admin_user, decano_user, faculty_id, override_dependency
    ):
        """Test assigning faculty scope to DECANO user."""
        override_dependency(get_current_superuser, admin_user)

        user_id = decano_user["id"]
        assignment_data = {"faculty_id": faculty_id, "school_ids": None}

        response = client.put(f"/v1/user/{user_id}/scope", json=assignment_data)

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["fk_faculty"] == faculty_id
        assert data[0]["fk_school"] is None

    def test_assign_school_scopes_to_director(
        self, client: TestClient, admin_user, director_user, school_ids, override_dependency
    ):
        """Test assigning multiple school scopes to DIRECTOR user."""
        override_dependency(get_current_superuser, admin_user)

        user_id = director_user["id"]
        assignment_data = {"faculty_id": None, "school_ids": school_ids}

        response = client.put(f"/v1/user/{user_id}/scope", json=assignment_data)

        assert response.status_code == 200
        data = response.json()
        assert len(data) == len(school_ids)

        assigned_school_ids = [scope["fk_school"] for scope in data]
        for school_id in school_ids:
            assert school_id in assigned_school_ids

    def test_decano_cannot_have_school_scope(
        self, client: TestClient, admin_user, decano_user, school_ids, override_dependency
    ):
        """Test that DECANO cannot be assigned school scopes."""
        override_dependency(get_current_superuser, admin_user)

        user_id = decano_user["id"]
        assignment_data = {"faculty_id": None, "school_ids": school_ids}

        response = client.put(f"/v1/user/{user_id}/scope", json=assignment_data)

        assert response.status_code == 403  # Forbidden

    def test_director_cannot_have_faculty_scope(
        self, client: TestClient, admin_user, director_user, faculty_id, override_dependency
    ):
        """Test that DIRECTOR cannot be assigned faculty scope."""
        override_dependency(get_current_superuser, admin_user)

        user_id = director_user["id"]
        assignment_data = {"faculty_id": faculty_id, "school_ids": None}

        response = client.put(f"/v1/user/{user_id}/scope", json=assignment_data)

        assert response.status_code == 403  # Forbidden

    def test_unauthorized_user_cannot_have_scope(self, client: TestClient, admin_user, override_dependency):
        """Test that UNAUTHORIZED users cannot have scope assignments."""
        override_dependency(get_current_superuser, admin_user)

        # Create unauthorized user
        user_data = {
            "name": "Test User",
            "username": "testuser",
            "email": "testuser@utec.edu.sv",
            "password": "Password123!",
        }

        create_response = client.post("/v1/user", json=user_data)
        user_id = create_response.json()["id"]

        # Try to assign scope
        assignment_data = {"faculty_id": None, "school_ids": []}
        response = client.put(f"/v1/user/{user_id}/scope", json=assignment_data)

        assert response.status_code == 403  # Forbidden

    def test_get_user_scope_assignments(
        self, client: TestClient, admin_user, decano_user, faculty_id, override_dependency
    ):
        """Test getting user scope assignments."""
        override_dependency(get_current_superuser, admin_user)

        user_id = decano_user["id"]

        # Assign scope
        assignment_data = {"faculty_id": faculty_id, "school_ids": None}
        client.put(f"/v1/user/{user_id}/scope", json=assignment_data)

        # Get scope
        response = client.get(f"/v1/user/{user_id}/scope")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["fk_faculty"] == faculty_id

    def test_reassigning_scope_replaces_previous(
        self, client: TestClient, admin_user, director_user, school_ids, override_dependency
    ):
        """Test that reassigning scope replaces previous assignments."""
        override_dependency(get_current_superuser, admin_user)

        user_id = director_user["id"]

        # First assignment: all schools
        assignment_data1 = {"faculty_id": None, "school_ids": school_ids}
        client.put(f"/v1/user/{user_id}/scope", json=assignment_data1)

        # Second assignment: only first school
        assignment_data2 = {"faculty_id": None, "school_ids": [school_ids[0]]}
        response = client.put(f"/v1/user/{user_id}/scope", json=assignment_data2)

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1  # Only one school now
        assert data[0]["fk_school"] == school_ids[0]

    def test_scope_endpoints_require_admin(self, client: TestClient):
        """Test that scope endpoints require admin privileges."""
        # Try to assign scope without auth
        response = client.put("/v1/user/1/scope", json={"faculty_id": None, "school_ids": []})
        assert response.status_code == 401  # Unauthorized

        # Try to get scope without auth
        response = client.get("/v1/user/1/scope")
        assert response.status_code == 401
