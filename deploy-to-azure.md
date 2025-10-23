# 🚀 Despliegue en Azure Container Apps

Esta guía te ayudará a desplegar tu aplicación FICA Academics en Azure Container Apps.

## 📋 Prerrequisitos

1. **Azure CLI** instalado y configurado
1. **Docker** instalado y funcionando
1. **Git** para control de versiones
1. **Cuenta de Azure** con permisos para crear recursos

## 🔧 Pasos para el Despliegue

### 1. Configurar Azure CLI

```bash
# Iniciar sesión en Azure
az login

# Configurar la suscripción (reemplaza con tu Subscription ID)
az account set --subscription "tu-subscription-id"

# Crear un grupo de recursos
az group create --name "fica-academics-rg" --location "East US"
```

### 2. Crear Azure Container Registry (ACR)

```bash
# Crear un registro de contenedores
az acr create --resource-group "fica-academics-rg" \
              --name "ficaacademicsacr" \
              --sku Basic \
              --admin-enabled true

# Obtener las credenciales del ACR
az acr credential show --name "ficaacademicsacr" --resource-group "fica-academics-rg"
```

### 3. Crear Base de Datos PostgreSQL

```bash
# Crear servidor PostgreSQL
az postgres flexible-server create \
    --resource-group "fica-academics-rg" \
    --name "fica-academics-db" \
    --location "East US" \
    --admin-user "ficaadmin" \
    --admin-password "TuPasswordSeguro123!" \
    --sku-name "Standard_B1ms" \
    --tier "Burstable" \
    --public-access "0.0.0.0-255.255.255.255" \
    --storage-size 32 \
    --version 15

# Crear base de datos
az postgres flexible-server db create \
    --resource-group "fica-academics-rg" \
    --server-name "fica-academics-db" \
    --database-name "fica_academics"
```

### 4. Crear Redis Cache

```bash
# Crear Redis Cache
az redis create \
    --resource-group "fica-academics-rg" \
    --name "fica-academics-redis" \
    --location "East US" \
    --sku "Basic" \
    --vm-size "c0"
```

### 5. Crear Container Apps Environment

```bash
# Crear el entorno de Container Apps
az containerapp env create \
    --name "fica-academics-env" \
    --resource-group "fica-academics-rg" \
    --location "East US"
```

### 6. Construir y Subir Imágenes Docker

```bash
# Construir y subir imagen del backend
cd backend
docker build -f Dockerfile.prod -t ficaacademicsacr.azurecr.io/fica-backend:latest .
docker push ficaacademicsacr.azurecr.io/fica-backend:latest

# Construir y subir imagen del frontend
cd ../frontend
docker build -f Dockerfile.prod -t ficaacademicsacr.azurecr.io/fica-frontend:latest .
docker push ficaacademicsacr.azurecr.io/fica-frontend:latest
```

### 7. Crear Container Apps

#### Backend Container App

```bash
az containerapp create \
    --name "fica-backend" \
    --resource-group "fica-academics-rg" \
    --environment "fica-academics-env" \
    --image "ficaacademicsacr.azurecr.io/fica-backend:latest" \
    --target-port 8000 \
    --ingress external \
    --registry-server "ficaacademicsacr.azurecr.io" \
    --cpu 1.0 \
    --memory 2.0Gi \
    --min-replicas 1 \
    --max-replicas 10 \
    --env-vars \
        DATABASE_URL="postgresql://ficaadmin:TuPasswordSeguro123!@fica-academics-db.postgres.database.azure.com:5432/fica_academics?sslmode=require" \
        REDIS_URL="redis://fica-academics-redis.redis.cache.windows.net:6380" \
        SECRET_KEY="tu-clave-secreta-muy-segura-para-produccion" \
        ALGORITHM="HS256" \
        ACCESS_TOKEN_EXPIRE_MINUTES="30" \
        ENVIRONMENT="production"
```

#### Frontend Container App

```bash
az containerapp create \
    --name "fica-frontend" \
    --resource-group "fica-academics-rg" \
    --environment "fica-academics-env" \
    --image "ficaacademicsacr.azurecr.io/fica-frontend:latest" \
    --target-port 3000 \
    --ingress external \
    --registry-server "ficaacademicsacr.azurecr.io" \
    --cpu 0.5 \
    --memory 1.0Gi \
    --min-replicas 1 \
    --max-replicas 5 \
    --env-vars \
        VITE_API_BASE_URL="https://fica-backend.tu-dominio.azurecontainerapps.io/api/v1" \
        VITE_APP_TITLE="FICA Academics"
```

### 8. Configurar Dominios Personalizados (Opcional)

```bash
# Obtener el dominio del Container App
az containerapp show --name "fica-frontend" --resource-group "fica-academics-rg" --query "properties.configuration.ingress.fqdn" -o tsv

# Configurar dominio personalizado (requiere configuración DNS adicional)
az containerapp hostname add \
    --name "fica-frontend" \
    --resource-group "fica-academics-rg" \
    --hostname "tu-dominio.com"
```

## 🔐 Variables de Entorno Importantes

### Backend

- `DATABASE_URL`: URL de conexión a PostgreSQL
- `REDIS_URL`: URL de conexión a Redis
- `SECRET_KEY`: Clave secreta para JWT (generar una segura)
- `ALGORITHM`: Algoritmo para JWT (HS256)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: Tiempo de expiración del token
- `ENVIRONMENT`: production

### Frontend

- `VITE_API_BASE_URL`: URL base de la API
- `VITE_APP_TITLE`: Título de la aplicación

## 🚀 Verificar el Despliegue

1. Obtener las URLs de los Container Apps:

```bash
az containerapp show --name "fica-backend" --resource-group "fica-academics-rg" --query "properties.configuration.ingress.fqdn" -o tsv
az containerapp show --name "fica-frontend" --resource-group "fica-academics-rg" --query "properties.configuration.ingress.fqdn" -o tsv
```

2. Verificar que las aplicaciones estén funcionando:
   - Backend: `https://tu-backend-url/api/v1/docs`
   - Frontend: `https://tu-frontend-url`

## 🔧 Comandos de Mantenimiento

### Ver logs

```bash
az containerapp logs show --name "fica-backend" --resource-group "fica-academics-rg"
az containerapp logs show --name "fica-frontend" --resource-group "fica-academics-rg"
```

### Actualizar aplicación

```bash
# Construir nueva imagen
docker build -f Dockerfile.prod -t ficaacademicsacr.azurecr.io/fica-backend:latest .
docker push ficaacademicsacr.azurecr.io/fica-backend:latest

# Actualizar Container App
az containerapp update --name "fica-backend" --resource-group "fica-academics-rg" --image "ficaacademicsacr.azurecr.io/fica-backend:latest"
```

### Escalar aplicación

```bash
az containerapp update --name "fica-backend" --resource-group "fica-academics-rg" --min-replicas 2 --max-replicas 20
```

## 💰 Estimación de Costos

- **PostgreSQL Flexible Server**: ~$25-50/mes
- **Redis Cache Basic**: ~$16/mes
- **Container Apps**: ~$0-20/mes (según tráfico)
- **Container Registry**: ~$5/mes

**Total estimado**: ~$50-100/mes

## 🔒 Consideraciones de Seguridad

1. **Cambiar todas las contraseñas por defecto**
1. **Configurar firewall de PostgreSQL para permitir solo tráfico de Container Apps**
1. **Usar HTTPS para todas las conexiones**
1. **Configurar backup automático de la base de datos**
1. **Monitorear logs y métricas de las aplicaciones**

## 📞 Soporte

Si encuentras problemas durante el despliegue, revisa:

1. Los logs de las aplicaciones
1. La configuración de red y firewall
1. Las variables de entorno
1. La conectividad entre servicios
