"""
Pruebas unitarias para las rutas de autenticación de la aplicación.

Incluye verificaciones para los endpoints de registro de usuarios
(`POST /api/auth/register`) y de inicio de sesión (`POST /api/auth/login`).
Se utilizan parches de `monkeypatch` para simular el comportamiento
del servicio de autenticación y evitar dependencias en la base de
datos o en la lógica interna de la aplicación.
"""

from typing import Optional, Tuple

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app


def test_auth_register_endpoint(monkeypatch: pytest.MonkeyPatch) -> None:
    """Verifica que el endpoint POST /api/auth/register devuelve tokens.

    Se sustituye `AuthService.register_user` por una función que
    devuelve tokens predeterminados para evitar interacción con la
    base de datos. Con ello se comprueba que la ruta existe y que
    codifica la respuesta correctamente.
    """
    # Tokens de ejemplo
    access_token = "access-token"
    refresh_token = "refresh-token"

    # Función simulada para register_user
    def fake_register_user(
        self: object,
        schema: object,
        ip: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Tuple[str, str]:
        return access_token, refresh_token

    # Sustituir el método register_user
    monkeypatch.setattr(
        "app.auth.services.auth_service.AuthService.register_user",
        fake_register_user,
    )

    with TestClient(app) as client:
        payload = {"email": "user@example.com", "password": "secret"}
        response = client.post("/api/auth/register", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["access_token"] == access_token
        assert data["refresh_token"] == refresh_token
        assert data["token_type"] == "bearer"


def test_auth_login_invalid_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    """Comprueba que el endpoint POST /api/auth/login
    devuelve 401 ante credenciales incorrectas.

    Se anula `AuthService.authenticate` para lanzar una `HTTPException` con
    código 401. Esto valida que la ruta captura y propaga la excepción.
    """

    # Función simulada para authenticate
    def fake_authenticate(
        self: object,
        email: str,
        password: str,
        ip: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Tuple[str, str]:
        raise HTTPException(
            status_code=401, detail="Incorrect email or password"
        )  # noqa: E501

    monkeypatch.setattr(
        "app.auth.services.auth_service.AuthService.authenticate",
        fake_authenticate,
    )

    with TestClient(app) as client:
        payload = {"email": "bad@example.com", "password": "bad"}
        response = client.post("/api/auth/login", json=payload)
        assert response.status_code == 401
        assert response.json()["detail"] == "Incorrect email or password"
