# FICA Academic System

Sistema de Estadísticos de la Carga Académica de la Facultad de Informática y Ciencias Aplicadas (FICA) de la Universidad Tecnológica de El Salvador.

## 🏗️ Arquitectura del Proyecto

Este es un **monorepo** que contiene todos los componentes del sistema FICA Academic:

```
fica-academic/
├── backend/               # API Backend (FastAPI)
├── frontend/              # Aplicación Web (React/Vite)
├── docker-compose.yml     # Desarrollo
├── docker-compose.prod.yml # Producción
├── .pre-commit-config.yaml # Calidad de código
└── README.md              # Este archivo
```

## 🚀 Inicio Rápido

### Prerrequisitos

- Docker y Docker Compose
- Git

### Desarrollo

1. **Clonar el repositorio**:

   ```bash
   git clone https://github.com/xzeggaedu/fica-academic.git
   cd fica-academic
   ```

1. **Configurar variables de entorno**:

   ```bash
   # Backend
   cp backend/src/.env.example backend/src/.env
   # Editar las variables según tu entorno
   ```

1. **Levantar todos los servicios**:

   ```bash
   docker-compose up -d
   ```

1. **Acceder a la aplicación**:

   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:8000
   - **API Docs**: http://localhost:8000/docs
   - **PGAdmin**: http://localhost:5050

## 🛠️ Servicios

### Backend (FastAPI)

- **Puerto**: 8000
- **Tecnologías**: FastAPI, PostgreSQL, Redis
- **Documentación**: Ver `backend/README.md`

### Frontend (React/Vite)

- **Puerto**: 3000
- **Tecnologías**: React, TypeScript, Vite
- **Documentación**: Ver `frontend/README.md`

### Base de Datos

- **PostgreSQL**: Puerto 5432
- **Redis**: Puerto 6379
- **PGAdmin**: Puerto 5050

## 🚀 Producción

### Despliegue con Docker

```bash
# Levantar en producción
docker-compose -f docker-compose.prod.yml up -d

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f

# Detener servicios
docker-compose -f docker-compose.prod.yml down
```

### GitHub Actions

El proyecto incluye CI/CD automático que:

- Ejecuta tests en cada push
- Construye imágenes Docker
- Despliega a producción

## 🧪 Testing

```bash
# Tests del backend
cd backend && pytest

# Tests del frontend
cd frontend && npm test

# Tests de todo el proyecto
npm run test:all
```

## 🔧 Desarrollo

### Pre-commit Hooks

El proyecto incluye hooks de pre-commit para mantener la calidad del código:

```bash
# Instalar pre-commit
pip install pre-commit
pre-commit install

# Ejecutar manualmente
pre-commit run --all-files
```

### Estándares de Código

- **Backend**: Black, Flake8, Pylint, Pytest
- **Frontend**: ESLint, Prettier, Vitest
- **Commits**: Conventional Commits

## 📚 Documentación

- **Backend**: [backend/README.md](backend/README.md)
- **Frontend**: [frontend/README.md](frontend/README.md)
- **API Docs**: http://localhost:8000/docs
- **Documentación completa**: Ver `backend/docs/`

## 🤝 Contribución

1. Fork el proyecto
1. Crea una branch (`git checkout -b feature/nueva-funcionalidad`)
1. Commit tus cambios (`git commit -m 'feat: agregar nueva funcionalidad'`)
1. Push a la branch (`git push origin feature/nueva-funcionalidad`)
1. Abre un Pull Request

## 📞 Soporte

- **Issues**: [GitHub Issues](https://github.com/xzeggaedu/fica-academic/issues)
- **Documentación**: Ver directorio `docs/`

## 📄 Licencia

Este proyecto está bajo la Licencia Apache 2.0 - ver el archivo [LICENSE](LICENSE) para más detalles.

______________________________________________________________________

**Desarrollado para la Universidad Tecnológica de El Salvador - Facultad de Informática y Ciencias Aplicadas (FICA)**
