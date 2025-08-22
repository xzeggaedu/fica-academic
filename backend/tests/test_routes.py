# filepath: backend/tests/test_routes.py
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_root_endpoint_ok():
    """El endpoint raíz debe responder 200 y el JSON esperado."""
    resp = client.get("/")
    assert resp.status_code == 200
    response = {"message": "Bienvenido a la FICA Academic API V1.0 🚀"}
    assert resp.json() == response
