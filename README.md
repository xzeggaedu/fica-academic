# FICA Academics - Sistema de Gestión de Carga Académica

Sistema para la gestión, registro y presupuesto de la carga académica universitaria.

## 🚀 Inicio Rápido

### Prerrequisitos

- Docker y Docker Compose
- Git

### Configuración

1. **Clonar el repositorio**:

   ```bash
   git clone <repository-url>
   cd fica-academics-v1.0
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

### Modo de Desarrollo con Reload

Por defecto, el servidor API se ejecuta **sin modo reload** para evitar problemas de memoria en sistemas con recursos limitados.

Si necesitas habilitar el modo reload para desarrollo (hot-reload de código), puedes:

1. **Opción 1: Usar variable de entorno** (recomendado):

   ```bash
   RELOAD_MODE=true docker-compose up -d
   ```

1. **Opción 2: Modificar docker-compose.yml temporalmente**:

   ```yaml
   command: uvicorn src.app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

**Nota**: El modo reload puede causar problemas de memoria (`OSError: [Errno 12] Cannot allocate memory`) en sistemas con poca RAM o muchos archivos. Si experimentas este error, deshabilita el reload.

## 🌐 Acceso a la Aplicación

- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **Documentación API**: http://localhost:8000/docs
- **Base de datos**: localhost:5432
- **Redis**: localhost:6379
- **PGAdmin**: http://localhost:5050

## 📝 Notas Importantes

- Los directorios de uploads se crean automáticamente al iniciar la aplicación
- Si cambias código durante el desarrollo sin reload, necesitarás reiniciar el contenedor: `docker-compose restart api`
- Para ver logs: `docker-compose logs -f api`
