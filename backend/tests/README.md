# Backend Testing Guide

Este documento describe cómo ejecutar y mantener los tests del backend.

## Configuración

### Dependencias de testing:

- `pytest` - Framework de testing
- `pytest-asyncio` - Soporte para tests asíncronos
- `pytest-cov` - Generación de reportes de cobertura
- `pytest-mock` - Utilidades para mocking
- `faker` - Generación de datos de prueba

## Ejecutar Tests

### Comandos básicos:

```bash
# Ejecutar todos los tests
uv run pytest

# Ejecutar tests con cobertura
uv run pytest --cov=src --cov-report=html

# Ejecutar tests específicos
uv run pytest tests/test_user.py

# Ejecutar tests con verbose output
uv run pytest -v

# Ejecutar tests marcados como unit tests
uv run pytest -m unit
```

### Comandos de cobertura:

```bash
# Generar reporte HTML de cobertura
uv run pytest --cov=src --cov-report=html

# Generar reporte XML (para CI/CD)
uv run pytest --cov=src --cov-report=xml

# Ver cobertura en terminal
uv run pytest --cov=src --cov-report=term-missing
```

## Estructura de Tests

```
tests/
├── conftest.py              # Fixtures globales
├── test_config.py           # Configuración de tests
├── test_user.py             # Tests de endpoints de usuarios
├── test_login.py            # Tests de autenticación
├── test_logout.py           # Tests de logout
├── test_tasks.py            # Tests de tareas en background
├── test_security.py         # Tests de seguridad y dependencias
└── helpers/
    ├── generators.py        # Generadores de datos de prueba
    └── mocks.py            # Utilidades de mocking
```

## Fixtures Disponibles

### Fixtures de Base de Datos:

- `client` - Cliente de prueba FastAPI
- `db` - Sesión de base de datos síncrona
- `mock_db` - Mock de sesión de base de datos asíncrona
- `mock_redis` - Mock de conexión Redis

### Fixtures de Usuarios:

- `sample_user_data` - Datos de usuario de prueba
- `sample_user_read` - Objeto UserRead de prueba
- `sample_admin_user_read` - Objeto UserRead admin de prueba
- `current_user_dict` - Usuario actual mockeado
- `current_admin_user_dict` - Admin actual mockeado

### Fixtures de Autenticación:

- `valid_access_token` - Token de acceso válido
- `valid_refresh_token` - Token de refresh válido

### Fixtures de Servicios:

- `mock_queue_pool` - Mock del pool de colas ARQ

## Marcadores de Tests

Los tests pueden ser marcados para diferentes propósitos:

```python
@pytest.mark.unit
def test_unit_function():
    """Test unitario puro."""
    pass


@pytest.mark.integration
def test_integration_function():
    """Test de integración."""
    pass


@pytest.mark.slow
def test_slow_function():
    """Test que toma mucho tiempo."""
    pass
```

### Ejecutar tests por marcador:

```bash
# Solo tests unitarios
uv run pytest -m unit

# Excluir tests lentos
uv run pytest -m "not slow"

# Solo tests de integración
uv run pytest -m integration
```

## Configuración de Cobertura

La configuración de cobertura está en `pyproject.toml`:

- **Cobertura mínima requerida:** 80%
- **Reportes generados:** HTML, XML, terminal
- **Archivos excluidos:** `node_modules/`, archivos de configuración, etc.

## Mejores Prácticas

### 1. Estructura de Tests:

```python
class TestEndpointName:
    """Test para endpoint específico."""

    @pytest.mark.asyncio
    async def test_success_case(self, mock_db, sample_data):
        """Test del caso exitoso."""
        # Arrange
        # Act
        # Assert
        pass

    @pytest.mark.asyncio
    async def test_error_case(self, mock_db):
        """Test del caso de error."""
        # Arrange
        # Act & Assert
        with pytest.raises(ExpectedException):
            await function_under_test()
```

### 2. Mocking:

- Usar `AsyncMock` para funciones asíncronas
- Mockear dependencias externas (DB, Redis, APIs)
- Usar fixtures para datos de prueba consistentes

### 3. Naming:

- Archivos de test: `test_*.py`
- Clases de test: `Test*`
- Métodos de test: `test_*`
- Fixtures: nombres descriptivos

### 4. Documentación:

- Documentar casos de prueba complejos
- Usar docstrings descriptivos
- Comentar mocks complejos

## Troubleshooting

### Error: "No module named 'src'"

- Asegúrate de ejecutar los tests desde el directorio `backend/`
- Verifica que `test_config.py` esté configurado correctamente

### Error: "Database connection failed"

- Los tests usan mocks, no conexiones reales a DB
- Verifica que las fixtures estén configuradas correctamente

### Error: "AsyncIO not configured"

- Asegúrate de que `pytest-asyncio` esté instalado
- Verifica la configuración en `pyproject.toml`

## CI/CD Integration

Los tests se ejecutan automáticamente en:

- Pre-commit hooks
- GitHub Actions
- Pull requests

La cobertura mínima requerida es 80%. Si no se alcanza, el build fallará.
