#!/bin/bash

# Script para desplegar FICA Academics en Azure Container Apps
# Asegúrate de tener Azure CLI instalado y configurado

set -e  # Exit on any error

# Variables de configuración
RESOURCE_GROUP="fica-academics-rg"
LOCATION="East US"
ACR_NAME="ficaacademicsacr"
ENVIRONMENT_NAME="fica-academics-env"
BACKEND_APP_NAME="fica-backend"
FRONTEND_APP_NAME="fica-frontend"
DB_NAME="fica-academics-db"
REDIS_NAME="fica-academics-redis"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Iniciando despliegue de FICA Academics en Azure Container Apps${NC}"

# Función para verificar si Azure CLI está instalado
check_azure_cli() {
    if ! command -v az &> /dev/null; then
        echo -e "${RED}❌ Azure CLI no está instalado. Por favor instálalo primero.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Azure CLI está instalado${NC}"
}

# Función para verificar y configurar suscripción
check_subscription() {
    echo -e "${YELLOW}🔍 Verificando suscripción actual...${NC}"

    # Mostrar suscripción actual
    CURRENT_SUBSCRIPTION=$(az account show --query "name" -o tsv)
    CURRENT_SUBSCRIPTION_ID=$(az account show --query "id" -o tsv)

    echo -e "${GREEN}📋 Suscripción actual: ${CURRENT_SUBSCRIPTION}${NC}"
    echo -e "${GREEN}📋 ID: ${CURRENT_SUBSCRIPTION_ID}${NC}"

    # Preguntar si quiere cambiar de suscripción
    echo -e "${YELLOW}¿Quieres usar esta suscripción o cambiar a otra?${NC}"
    read -p "Presiona Enter para continuar con la actual, o escribe 'cambiar' para seleccionar otra: " response

    if [ "$response" = "cambiar" ] || [ "$response" = "c" ]; then
        echo -e "${YELLOW}📋 Suscripciones disponibles:${NC}"
        az account list --output table

        read -p "Ingresa el nombre o ID de la suscripción que quieres usar: " selected_subscription

        echo -e "${YELLOW}🔄 Cambiando a la suscripción seleccionada...${NC}"
        az account set --subscription "$selected_subscription"

        # Verificar el cambio
        NEW_SUBSCRIPTION=$(az account show --query "name" -o tsv)
        echo -e "${GREEN}✅ Suscripción cambiada a: ${NEW_SUBSCRIPTION}${NC}"
    else
        echo -e "${GREEN}✅ Continuando con la suscripción actual: ${CURRENT_SUBSCRIPTION}${NC}"
    fi
}

# Función para verificar si Docker está instalado
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker no está instalado. Por favor instálalo primero.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Docker está instalado${NC}"
}

# Función para crear grupo de recursos
create_resource_group() {
    echo -e "${YELLOW}📦 Creando grupo de recursos...${NC}"
    az group create --name "$RESOURCE_GROUP" --location "$LOCATION"
    echo -e "${GREEN}✅ Grupo de recursos creado${NC}"
}

# Función para crear Azure Container Registry
create_acr() {
    echo -e "${YELLOW}📦 Creando Azure Container Registry...${NC}"
    az acr create --resource-group "$RESOURCE_GROUP" \
                  --name "$ACR_NAME" \
                  --sku Basic \
                  --admin-enabled true
    echo -e "${GREEN}✅ Azure Container Registry creado${NC}"
}

# Función para crear PostgreSQL
create_postgresql() {
    echo -e "${YELLOW}🗄️ Creando servidor PostgreSQL...${NC}"
    read -p "Ingresa una contraseña segura para PostgreSQL: " DB_PASSWORD

    az postgres flexible-server create \
        --resource-group "$RESOURCE_GROUP" \
        --name "$DB_NAME" \
        --location "$LOCATION" \
        --admin-user "ficaadmin" \
        --admin-password "$DB_PASSWORD" \
        --sku-name "Standard_B1ms" \
        --tier "Burstable" \
        --public-access "0.0.0.0-255.255.255.255" \
        --storage-size 32 \
        --version 15

    az postgres flexible-server db create \
        --resource-group "$RESOURCE_GROUP" \
        --server-name "$DB_NAME" \
        --database-name "fica_academics"

    echo -e "${GREEN}✅ PostgreSQL creado${NC}"
}

# Función para crear Redis
create_redis() {
    echo -e "${YELLOW}🔴 Creando Redis Cache...${NC}"
    az redis create \
        --resource-group "$RESOURCE_GROUP" \
        --name "$REDIS_NAME" \
        --location "$LOCATION" \
        --sku "Basic" \
        --vm-size "c0"
    echo -e "${GREEN}✅ Redis Cache creado${NC}"
}

# Función para crear Container Apps Environment
create_environment() {
    echo -e "${YELLOW}🌍 Creando Container Apps Environment...${NC}"
    az containerapp env create \
        --name "$ENVIRONMENT_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --location "$LOCATION"
    echo -e "${GREEN}✅ Container Apps Environment creado${NC}"
}

# Función para construir y subir imágenes
build_and_push_images() {
    echo -e "${YELLOW}🔨 Construyendo y subiendo imágenes Docker...${NC}"

    # Login to ACR
    az acr login --name "$ACR_NAME"

    # Build and push backend
    echo -e "${YELLOW}📦 Construyendo imagen del backend...${NC}"
    cd backend
    docker build -f Dockerfile.prod -t "$ACR_NAME.azurecr.io/fica-backend:latest" .
    docker push "$ACR_NAME.azurecr.io/fica-backend:latest"

    # Build and push frontend
    echo -e "${YELLOW}📦 Construyendo imagen del frontend...${NC}"
    cd ../frontend
    docker build -f Dockerfile.prod -t "$ACR_NAME.azurecr.io/fica-frontend:latest" .
    docker push "$ACR_NAME.azurecr.io/fica-frontend:latest"

    cd ..
    echo -e "${GREEN}✅ Imágenes construidas y subidas${NC}"
}

# Función para crear Container Apps
create_container_apps() {
    echo -e "${YELLOW}🚀 Creando Container Apps...${NC}"

    # Crear backend Container App
    echo -e "${YELLOW}📦 Creando backend Container App...${NC}"
    az containerapp create \
        --name "$BACKEND_APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --environment "$ENVIRONMENT_NAME" \
        --image "$ACR_NAME.azurecr.io/fica-backend:latest" \
        --target-port 8000 \
        --ingress external \
        --registry-server "$ACR_NAME.azurecr.io" \
        --cpu 1.0 \
        --memory 2.0Gi \
        --min-replicas 1 \
        --max-replicas 10 \
        --env-vars \
            DATABASE_URL="postgresql://ficaadmin:$DB_PASSWORD@$DB_NAME.postgres.database.azure.com:5432/fica_academics?sslmode=require" \
            REDIS_URL="redis://$REDIS_NAME.redis.cache.windows.net:6380" \
            SECRET_KEY="tu-clave-secreta-muy-segura-para-produccion-$(date +%s)" \
            ALGORITHM="HS256" \
            ACCESS_TOKEN_EXPIRE_MINUTES="30" \
            ENVIRONMENT="production"

    # Obtener URL del backend
    BACKEND_URL=$(az containerapp show --name "$BACKEND_APP_NAME" --resource-group "$RESOURCE_GROUP" --query "properties.configuration.ingress.fqdn" -o tsv)

    # Crear frontend Container App
    echo -e "${YELLOW}📦 Creando frontend Container App...${NC}"
    az containerapp create \
        --name "$FRONTEND_APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --environment "$ENVIRONMENT_NAME" \
        --image "$ACR_NAME.azurecr.io/fica-frontend:latest" \
        --target-port 3000 \
        --ingress external \
        --registry-server "$ACR_NAME.azurecr.io" \
        --cpu 0.5 \
        --memory 1.0Gi \
        --min-replicas 1 \
        --max-replicas 5 \
        --env-vars \
            VITE_API_BASE_URL="https://$BACKEND_URL/api/v1" \
            VITE_APP_TITLE="FICA Academics"

    echo -e "${GREEN}✅ Container Apps creados${NC}"
}

# Función para mostrar URLs finales
show_urls() {
    echo -e "${GREEN}🎉 ¡Despliegue completado!${NC}"
    echo -e "${GREEN}📋 URLs de las aplicaciones:${NC}"

    BACKEND_URL=$(az containerapp show --name "$BACKEND_APP_NAME" --resource-group "$RESOURCE_GROUP" --query "properties.configuration.ingress.fqdn" -o tsv)
    FRONTEND_URL=$(az containerapp show --name "$FRONTEND_APP_NAME" --resource-group "$RESOURCE_GROUP" --query "properties.configuration.ingress.fqdn" -o tsv)

    echo -e "${GREEN}🔧 Backend API: https://$BACKEND_URL${NC}"
    echo -e "${GREEN}🔧 Backend Docs: https://$BACKEND_URL/docs${NC}"
    echo -e "${GREEN}🌐 Frontend: https://$FRONTEND_URL${NC}"

    echo -e "${YELLOW}📝 Notas importantes:${NC}"
    echo -e "${YELLOW}- Asegúrate de ejecutar las migraciones de la base de datos${NC}"
    echo -e "${YELLOW}- Configura los usuarios iniciales${NC}"
    echo -e "${YELLOW}- Revisa la configuración de seguridad${NC}"
}

# Función principal
main() {
    echo -e "${GREEN}🚀 Despliegue de FICA Academics en Azure Container Apps${NC}"
    echo -e "${YELLOW}⚠️  Asegúrate de tener Azure CLI y Docker instalados${NC}"

    # Verificaciones
    check_azure_cli
    check_docker
    check_subscription

    # Crear recursos
    create_resource_group
    create_acr
    create_postgresql
    create_redis
    create_environment
    build_and_push_images
    create_container_apps

    # Mostrar resultados
    show_urls
}

# Ejecutar función principal
main "$@"
