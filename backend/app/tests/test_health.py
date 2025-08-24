"""
Pruebas para el endpoint de verificación de salud de la aplicación.

Estas pruebas verifican que la ruta `/health` definida en `main.py`
está accesible y responde con el código y contenido esperado. La
configuración y la simulación de servicios externos se realiza en
`conftest.py` mediante un fixture de sesión.
"""

from fastapi.testclient import TestClient

from app.main import app


def test_health_endpoint() -> None:
    """Comprueba que el endpoint /health
    responde con 200 y el cuerpo esperado."""
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"health": "true"}
