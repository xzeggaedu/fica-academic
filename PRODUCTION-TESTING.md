# FICA Academics - Production Testing Guide

Este documento explica cómo probar las imágenes de producción de FICA Academics usando Docker Compose.

## 🚀 Imágenes Disponibles

Las siguientes imágenes están disponibles en GitHub Container Registry:

- **Backend**: `ghcr.io/xzeggaedu/fica-academic-backend:latest`
- **Frontend**: `ghcr.io/xzeggaedu/fica-academic-frontend:latest`

## 📋 Prerrequisitos

- Docker y Docker Compose instalados
- Acceso a internet para descargar las imágenes
- Puertos disponibles: 3000, 5432, 6379, 8000

## 🛠️ Configuración de Variables de Entorno

### Archivo de Variables de Entorno

El proyecto usa un archivo `.env.production` en `backend/src/` para manejar todas las variables de entorno de forma segura.

**Pasos de configuración:**

1. **Copiar el archivo de plantilla:**

   ```bash
   cp backend/src/env.production.template backend/src/.env.production
   ```

1. **Editar las variables según tu entorno:**

   ```bash
   nano backend/src/.env.production  # o tu editor preferido
   ```

### Backend (API)

Las siguientes variables de entorno están configuradas en el `backend/src/.env.production`:

```bash
# Application
APP_NAME="Your App Name"
APP_DESCRIPTION="Your app description"
APP_VERSION="1.0.0"

# Database
POSTGRES_USER="your_db_user"
POSTGRES_PASSWORD="your_secure_password"
POSTGRES_SERVER="db"
POSTGRES_PORT=5432
POSTGRES_DB="your_database"

# Security
SECRET_KEY="your_very_long_secret_key_here"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Redis
REDIS_CACHE_HOST="redis"
REDIS_CACHE_PORT=6379
REDIS_QUEUE_HOST="redis"
REDIS_QUEUE_PORT=6379
CLIENT_CACHE_MAX_AGE=30

# Admin User
ADMIN_NAME="Your Admin Name"
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_USERNAME="admin_user"
ADMIN_PASSWORD="your_secure_admin_password"

# Environment
ENVIRONMENT="production"
```

### Frontend

El frontend no requiere variables de entorno específicas ya que es una aplicación estática servida por `serve`.

## 🚀 Inicio Rápido

### Opción 1: Script Automatizado (Recomendado)

```bash
# Ejecutar el script de prueba
./test-prod.sh
```

Este script:

- Descarga las imágenes más recientes
- Inicia todos los servicios
- Verifica el estado de salud
- Muestra las URLs de acceso

### Opción 2: Comandos Manuales

```bash
# Descargar las imágenes
docker pull ghcr.io/xzeggaedu/fica-academic-backend:latest
docker pull ghcr.io/xzeggaedu/fica-academic-frontend:latest

# Iniciar los servicios
docker-compose -f docker-compose.prod.yml up -d

# Verificar el estado
docker-compose -f docker-compose.prod.yml ps
```

## 🌐 Acceso a los Servicios

Una vez iniciados, los servicios estarán disponibles en:

| Servicio        | URL                        | Descripción           |
| --------------- | -------------------------- | --------------------- |
| **Frontend**    | http://localhost:3000      | Aplicación React      |
| **Backend API** | http://localhost:8000      | API FastAPI           |
| **API Docs**    | http://localhost:8000/docs | Documentación Swagger |
| **Database**    | localhost:5432             | PostgreSQL            |
| **Redis**       | localhost:6379             | Cache y Queue         |

## 👤 Usuario Administrador

**Credenciales por defecto:**

- **Username**: `Check your .env.production file`
- **Email**: `Check your .env.production file`
- **Password**: `Check your .env.production file`

## 🔧 Comandos de Gestión

### Ver Logs

```bash
# Todos los servicios
docker-compose -f docker-compose.prod.yml logs -f

# Servicio específico
docker-compose -f docker-compose.prod.yml logs -f api
docker-compose -f docker-compose.prod.yml logs -f frontend
```

### Reiniciar Servicios

```bash
# Todos los servicios
docker-compose -f docker-compose.prod.yml restart

# Servicio específico
docker-compose -f docker-compose.prod.yml restart api
```

### Verificar Estado

```bash
# Estado de contenedores
docker-compose -f docker-compose.prod.yml ps

# Estado de salud
docker-compose -f docker-compose.prod.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
```

## 🧹 Limpieza

### Opción 1: Script Automatizado

```bash
./cleanup-prod.sh
```

### Opción 2: Comandos Manuales

```bash
# Detener servicios (mantener datos)
docker-compose -f docker-compose.prod.yml down

# Detener y eliminar volúmenes (eliminar datos)
docker-compose -f docker-compose.prod.yml down -v

# Eliminar imágenes
docker rmi ghcr.io/xzeggaedu/fica-academic-backend:latest
docker rmi ghcr.io/xzeggaedu/fica-academic-frontend:latest
```

## 🐛 Solución de Problemas

### El API no responde

```bash
# Verificar logs del API
docker-compose -f docker-compose.prod.yml logs api

# Verificar conectividad a la base de datos
docker exec fica_db_prod pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}
```

### El Frontend no carga

```bash
# Verificar logs del frontend
docker-compose -f docker-compose.prod.yml logs frontend

# Verificar que el contenedor esté corriendo
docker ps | grep frontend
```

### Problemas de Base de Datos

```bash
# Verificar estado de PostgreSQL
docker exec fica_db_prod pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}

# Conectar a la base de datos
docker exec -it fica_db_prod psql -U ${POSTGRES_USER} -d ${POSTGRES_DB}
```

### Problemas de Redis

```bash
# Verificar estado de Redis
docker exec fica_redis_prod redis-cli ping

# Conectar a Redis
docker exec -it fica_redis_prod redis-cli
```

## 📊 Monitoreo

### Verificar Salud de Servicios

```bash
# API Health Check
curl -f http://localhost:8000/docs

# Frontend Health Check
curl -f http://localhost:3000

# Database Health Check
docker exec fica_db_prod pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}

# Redis Health Check
docker exec fica_redis_prod redis-cli ping
```

### Métricas de Recursos

```bash
# Uso de recursos por contenedor
docker stats

# Información detallada de contenedores
docker-compose -f docker-compose.prod.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
```

## 🔒 Consideraciones de Seguridad

⚠️ **IMPORTANTE**: Las credenciales en `production.env.example` son para **pruebas únicamente**.

### Seguridad de Variables de Entorno

✅ **Buenas prácticas implementadas:**

- Variables sensibles separadas del código
- Archivo `.env` en `.gitignore` (no se sube al repositorio)
- Plantilla de ejemplo sin valores reales
- Validación de archivo antes de ejecutar

### Para producción real:

1. **Cambiar todas las contraseñas** en `production.env`
1. **Usar secretos seguros** (no valores de ejemplo)
1. **Configurar HTTPS** con certificados válidos
1. **Implementar autenticación adicional** (2FA, OAuth, etc.)
1. **Configurar firewall y red segura**
1. **Rotar claves regularmente**
1. **Monitorear accesos y logs**
1. **Usar un gestor de secretos** (HashiCorp Vault, AWS Secrets Manager, etc.)

### Archivos sensibles:

- `production.env` - **NO debe subirse al repositorio**
- `production.env.example` - Plantilla segura para compartir

## 📝 Notas Adicionales

- Las imágenes se actualizan automáticamente con cada push al repositorio
- Los datos se persisten en volúmenes Docker
- El worker de background tasks se ejecuta automáticamente
- La inicialización de la base de datos es automática
