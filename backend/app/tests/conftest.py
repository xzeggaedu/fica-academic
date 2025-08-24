"""
Archivo de configuración de pruebas para Pytest.

Este módulo define un fixture de sesión que se aplica de forma
automática a todas las pruebas (`autouse=True`). Su propósito es
proporcionar un entorno de pruebas coherente y aislado, sin
dependencias de servicios externos como Redis. Para ello, establece
variables de entorno mínimas requeridas por la aplicación, anula la
creación de instancias de Redis y desactiva la inicialización del
limitador de tasa de FastAPI. De esta forma, cada test se ejecuta en
un contexto controlado e independiente, facilitando el uso de
mocks adicionales en los ficheros de pruebas.
"""

import pytest


@pytest.fixture(autouse=True)
def configure_test_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    """Configura variables de entorno y anula servicios externos.

    - Establece valores para las variables de entorno necesarias,
      evitando que Pydantic lance excepciones por datos ausentes.
    - Reemplaza ``Redis.from_url`` para devolver un objeto simulado que
      define un método ``close`` sin realizar operaciones de red.
    - Sobrescribe las funciones ``init`` y ``close`` del
      ``FastAPILimiter`` con corutinas vacías. Esto evita que la
      aplicación intente conectarse a un servidor Redis durante el
      ciclo de vida de FastAPI.
    Al emplear ``autouse=True``, este fixture se aplica
    automáticamente a cada función de prueba sin necesidad de
    importarlo explícitamente.
    """
    import os
    from redis.asyncio import Redis as AsyncRedis
    from fastapi_limiter import FastAPILimiter

    # Variables de entorno mínimas para la configuración de la app
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/0")
    monkeypatch.setenv("POSTGRESQL_USERNAME", "test")
    monkeypatch.setenv("POSTGRESQL_PASSWORD", "test")
    monkeypatch.setenv("POSTGRESQL_DATABASE", "test")
    monkeypatch.setenv("POSTGRESQL_SERVER", "localhost")
    monkeypatch.setenv("JWT_SECRET_KEY", "supersecret")

    # Definición de clase simulada para Redis
    class DummyRedis:
        async def close(self) -> None:  # type: ignore[override]
            return None

    # Sustituir el método from_url para que devuelva DummyRedis
    monkeypatch.setattr(
        AsyncRedis,
        "from_url",
        lambda *args, **kwargs: DummyRedis(),
        raising=False,
    )

    # Corutinas vacías para FastAPILimiter
    async def dummy_init(_: object) -> None:
        return None

    async def dummy_close() -> None:
        return None

    # Sobrescribir las funciones init y close del limitador
    monkeypatch.setattr(
        FastAPILimiter, "init", staticmethod(dummy_init), raising=False
    )  # noqa: E501
    monkeypatch.setattr(
        FastAPILimiter, "close", staticmethod(dummy_close), raising=False
    )

    yield
