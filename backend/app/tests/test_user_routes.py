"""
Pruebas unitarias para las rutas de gestión de usuarios.

Se comprueba el correcto funcionamiento de los endpoints de listado,
creación, eliminación y consulta de usuarios. Para aislar las
pruebas de la lógica de acceso a datos, se emplea `monkeypatch` a
fin de reemplazar los métodos del servicio de usuarios con
implementaciones simuladas.
"""

from typing import Optional

import pytest
from fastapi.testclient import TestClient

from app.auth.routes.auth_router import get_current_user
from app.main import app
from app.user.models.user import UserRoleEnum
from app.user.routes.user_router import require_admin


def test_users_list_endpoint(monkeypatch: pytest.MonkeyPatch) -> None:
    """Comprueba que GET /api/users devuelve una lista
    vacía cuando no hay usuarios."""

    # Función simulada para devolver una lista vacía
    def fake_list(*_args, **_kwargs) -> list:
        return []

    monkeypatch.setattr(
        "app.user.services.user_service.UserService.list",
        fake_list,
    )

    with TestClient(app) as client:
        response = client.get("/api/users/")
        assert response.status_code == 200
        assert response.json() == []


def test_create_user_endpoint(monkeypatch: pytest.MonkeyPatch) -> None:
    """Verifica que POST /api/users crea un usuario y devuelve
    los datos apropiados."""

    # Clase simulada de usuario
    class DummyUser:
        id: int = 1
        email: str = "new@example.com"
        role: str = "director"
        is_active: bool = True
        created_at = "2025-01-01T00:00:00"
        updated_at = "2025-01-01T00:00:00"

    # Simular inexistencia del correo y creación del usuario
    def fake_get_by_email(*_args, **_kwargs) -> Optional[object]:
        return None

    def fake_create(*_args, **_kwargs) -> object:
        return DummyUser()

    monkeypatch.setattr(
        "app.user.services.user_service.UserService.get_by_email",
        fake_get_by_email,
    )

    # DummyUser con rol de administrador
    class DummyAdmin:
        id = 1
        role = "admin"

    # Añade overrides
    app.dependency_overrides[require_admin] = lambda: None
    app.dependency_overrides[get_current_user] = DummyAdmin

    monkeypatch.setattr(
        "app.user.services.user_service.UserService.create",
        fake_create,
    )

    with TestClient(app) as client:
        payload = {
            "email": "new@example.com",
            "password": "pass123",
            "role": "director",
        }
        response = client.post("/api/users/", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["id"] == 1
        assert data["email"] == "new@example.com"
        assert data["role"] == "director"
        assert data["is_active"] is True


def test_delete_user_endpoint(monkeypatch: pytest.MonkeyPatch) -> None:
    """Comprueba que DELETE /api/users/{user_id} devuelve 204
    cuando existe el usuario."""

    # Clase simulada de usuario
    class DummyUser:
        id: int = 2
        role: str = UserRoleEnum.DIRECTOR.value

    def fake_get(*_args, **_kwargs) -> Optional[object]:
        return DummyUser() if _args and _args[-1] == 2 else None

    def fake_delete(*_args, **_kwargs) -> None:
        return None

    # DummyUser con rol de administrador
    class DummyAdmin:
        id = 1
        role = "admin"

    # Añade overrides
    app.dependency_overrides[require_admin] = lambda: None
    app.dependency_overrides[get_current_user] = DummyAdmin

    monkeypatch.setattr(
        "app.user.services.user_service.UserService.get",
        fake_get,
    )
    monkeypatch.setattr(
        "app.user.services.user_service.UserService.delete",
        fake_delete,
    )

    with TestClient(app) as client:
        response = client.delete("/api/users/2")
        assert response.status_code == 204


def test_get_user_not_found(monkeypatch: pytest.MonkeyPatch) -> None:
    """Valida que GET /api/users/{user_id} retorna 404 cuando
    el usuario no existe."""

    def fake_get(*_args, **_kwargs) -> Optional[object]:
        return None

    monkeypatch.setattr(
        "app.user.services.user_service.UserService.get",
        fake_get,
    )

    with TestClient(app) as client:
        response = client.get("/api/users/99")
        assert response.status_code == 404
        assert response.json()["detail"] == "User not found"
