# FICA Academic Backend API

Backend API del Sistema de Estadísticos de la Carga Académica de la Facultad de Informática y Ciencias Aplicadas (FICA) de la Universidad Tecnológica de El Salvador.

## 🏗️ Arquitectura del Proyecto

Este backend forma parte de un **monorepo** que incluye:

- **Backend**: API FastAPI (este directorio)
- **Frontend**: Aplicación React/Vite
- **Infraestructura**: Docker Compose para desarrollo y producción

## 🚀 Tecnologías

- **FastAPI**: Framework web moderno y rápido para APIs
- **PostgreSQL**: Base de datos relacional
- **Redis**: Cache y cola de mensajes
- **SQLAlchemy 2.0**: ORM para Python
- **Pydantic V2**: Validación de datos
- **Alembic**: Migraciones de base de datos
- **Docker**: Containerización

## 📁 Estructura del Backend

```
backend/
├── src/                    # Código fuente
│   ├── app/               # Aplicación principal
│   │   ├── api/          # Endpoints de la API
│   │   ├── core/         # Configuración y utilidades
│   │   ├── crud/         # Operaciones de base de datos
│   │   ├── models/       # Modelos SQLAlchemy
│   │   ├── schemas/      # Esquemas Pydantic
│   │   └── main.py       # Punto de entrada
│   ├── migrations/       # Migraciones de Alembic
│   └── scripts/          # Scripts de utilidad
├── tests/                # Tests unitarios
├── docs/                 # Documentación
├── Dockerfile           # Imagen Docker
└── pyproject.toml       # Dependencias Python
```

## 🛠️ Desarrollo Local

### Prerrequisitos

- Python 3.11+
- Docker y Docker Compose
- Git

### Configuración del Entorno

1. **Clonar el repositorio**:

   ```bash
   git clone https://github.com/xzeggaedu/fica-academic.git
   cd fica-academic
   ```

1. **Configurar variables de entorno**:

   ```bash
   # Crear archivo .env en backend/src/
   cp backend/src/.env.example backend/src/.env
   # Editar las variables según tu entorno
   ```

1. **Levantar servicios con Docker**:

   ```bash
   # Desde el root del proyecto
   docker-compose up -d
   ```

### Desarrollo sin Docker

1. **Crear entorno virtual**:

   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # En macOS/Linux
   ```

1. **Instalar dependencias**:

   ```bash
   pip install -r requirements.txt
   # O usando uv (recomendado)
   uv sync
   ```

1. **Configurar base de datos**:

   ```bash
   # Ejecutar migraciones
   alembic upgrade head

   # Crear superusuario inicial
   python -m src.scripts.create_first_superuser
   ```

1. **Ejecutar la aplicación**:

   ```bash
   uvicorn src.app.main:app --reload
   ```

## 🌐 Acceso a la Aplicación

- **API**: http://localhost:8000
- **Documentación**: http://localhost:8000/docs
- **Admin Panel**: http://localhost:8000/admin
- **Base de datos**: localhost:5432
- **Redis**: localhost:6379
- **PGAdmin**: http://localhost:5050

## 📊 Endpoints Principales

### Autenticación

- `POST /api/v1/login` - Iniciar sesión
- `POST /api/v1/logout` - Cerrar sesión
- `POST /api/v1/refresh` - Renovar token

### Usuarios

- `GET /api/v1/users` - Listar usuarios
- `POST /api/v1/users` - Crear usuario
- `GET /api/v1/users/{id}` - Obtener usuario
- `PUT /api/v1/users/{id}` - Actualizar usuario
- `DELETE /api/v1/users/{id}` - Eliminar usuario

### Tareas

- `GET /api/v1/tasks` - Listar tareas
- `POST /api/v1/tasks` - Crear tarea
- `GET /api/v1/tasks/{id}` - Obtener tarea

## 🔧 Configuración

### Variables de Entorno

```bash
# Base de datos
POSTGRES_USER=utec_fica
POSTGRES_PASSWORD=tu_password
POSTGRES_DB=fica_academic
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432

# Redis
REDIS_CACHE_HOST=localhost
REDIS_CACHE_PORT=6379

# Seguridad
SECRET_KEY=tu_secret_key_muy_largo
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Admin
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@utec.edu.sv
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin_password

# Entorno
ENVIRONMENT=local  # local, staging, production
```

## 🧪 Testing

```bash
# Ejecutar todos los tests
pytest

# Ejecutar tests con coverage
pytest --cov=src

# Ejecutar tests específicos
pytest tests/test_user.py
```

## 🚀 Producción

### Docker Compose de Producción

```bash
# Levantar en producción
docker-compose -f docker-compose.prod.yml up -d

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f

# Detener servicios
docker-compose -f docker-compose.prod.yml down
```

### GitHub Actions

El proyecto incluye CI/CD con GitHub Actions que:

- Ejecuta tests automáticamente
- Construye imágenes Docker
- Despliega a producción

## 📚 Documentación

- **API Docs**: http://localhost:8000/docs (Swagger UI)
- **ReDoc**: http://localhost:8000/redoc
- **Documentación completa**: Ver `docs/` directory

## 🤝 Contribución

1. Fork el proyecto
1. Crea una branch para tu feature (`git checkout -b feature/nueva-funcionalidad`)
1. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
1. Push a la branch (`git push origin feature/nueva-funcionalidad`)
1. Abre un Pull Request

### Estándares de Código

- **Pre-commit hooks**: Configurados para mantener calidad
- **Black**: Formateo de código
- **Flake8**: Linting
- **Pylint**: Análisis estático
- **Tests**: Cobertura mínima requerida

## 📞 Soporte

Para dudas técnicas o soporte:

- **Issues**: [GitHub Issues](https://github.com/xzeggaedu/fica-academic/issues)
- **Email**: \[Contacto del proyecto\]

## 📄 Licencia

Este proyecto está bajo la Licencia Apache 2.0 - ver el archivo [LICENSE](LICENSE) para más detalles.

______________________________________________________________________

**Desarrollado para la Universidad Tecnológica de El Salvador - Facultad de Informática y Ciencias Aplicadas (FICA)**
