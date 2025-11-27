# Variables de Entorno para el Sistema de Actualizaciones

Este documento describe las variables de entorno necesarias para el sistema de actualizaciones del sistema.

## Archivo de Configuración

Las variables deben agregarse al archivo `backend/src/.env.production` (para producción) o `backend/src/.env` (para desarrollo local).

## Variables Requeridas

### 1. GitHub Container Registry (GHCR) - Configuración

Estas variables definen las imágenes que se usarán para verificar y actualizar:

```bash
# URL del registro de contenedores (por defecto: https://ghcr.io)
GHCR_REGISTRY_URL=https://ghcr.io

# Imagen completa del backend en GHCR
GHCR_BACKEND_IMAGE=ghcr.io/xzeggaedu/fica-academic-backend:latest

# Imagen completa del frontend en GHCR
GHCR_FRONTEND_IMAGE=ghcr.io/xzeggaedu/fica-academic-frontend:latest
```

**Nota**: Si usas las imágenes por defecto (`ghcr.io/xzeggaedu/fica-academic-backend:latest` y `ghcr.io/xzeggaedu/fica-academic-frontend:latest`), estas variables son opcionales ya que tienen valores por defecto.

### 2. Autenticación con GHCR (Opcional)

```bash
# Token de GitHub para autenticación con GHCR
# Solo necesario si las imágenes son privadas o si tienes límites de rate
GITHUB_TOKEN=ghp_tu_token_aqui
```

**Cómo obtener un token**:

1. Ve a GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
1. Crea un nuevo token con el scope `read:packages` (para leer imágenes)
1. Copia el token y agrégalo aquí

**Importante**: Si las imágenes son públicas, este token no es necesario.

### 3. Digests Locales de Imágenes (Opcional - Solo Fallback)

**IMPORTANTE**: Los digests locales se almacenan automáticamente en **Redis** después de cada actualización exitosa. Las variables de entorno `BACKEND_IMAGE_DIGEST` y `FRONTEND_IMAGE_DIGEST` son solo un **fallback** si Redis no está disponible.

**Sistema Automático (Recomendado)**:

- Después de cada actualización exitosa, el worker externo obtiene los nuevos digests y los almacena en Redis
- El endpoint de verificación lee los digests desde Redis (siempre actualizados)
- No necesitas configurar estas variables manualmente

**Fallback Manual** (solo si Redis no está disponible):

```bash
# Digest SHA256 de la imagen backend local actual (solo fallback)
BACKEND_IMAGE_DIGEST=sha256:abc123def456...

# Digest SHA256 de la imagen frontend local actual (solo fallback)
FRONTEND_IMAGE_DIGEST=sha256:xyz789uvw012...
```

**Cómo obtener estos valores** (solo para fallback inicial):

1. **Método manual** (usando el script helper):

   ```bash
   ./scripts/get_local_digests.sh
   ```

   Esto mostrará los digests y comandos para exportarlos.

1. **Método manual** (comandos Docker directos):

   ```bash
   # Backend
   docker image inspect ghcr.io/xzeggaedu/fica-academic-backend:latest --format '{{index .RepoDigests 0}}' | grep -o 'sha256:[a-f0-9]*'

   # Frontend
   docker image inspect ghcr.io/xzeggaedu/fica-academic-frontend:latest --format '{{index .RepoDigests 0}}' | grep -o 'sha256:[a-f0-9]*'
   ```

**Nota**: En producción, estas variables son opcionales. El sistema funciona mejor usando Redis, que se actualiza automáticamente después de cada actualización.

### 4. Ruta del Docker Compose (Opcional)

```bash
# Ruta al archivo docker-compose.prod.yml en el host
# Por defecto: /host/docker-compose.prod.yml
COMPOSE_FILE_PATH=/host/docker-compose.prod.yml
```

**Nota**: Esta variable se usa principalmente por el worker externo. El valor por defecto debería funcionar si montaste el directorio correctamente en `docker-compose.prod.yml`.

## Ejemplo Completo de Configuración

```bash
# ============================================
# Sistema de Actualizaciones
# ============================================

# GHCR Configuration (opcional si usas valores por defecto)
GHCR_REGISTRY_URL=https://ghcr.io
GHCR_BACKEND_IMAGE=ghcr.io/xzeggaedu/fica-academic-backend:latest
GHCR_FRONTEND_IMAGE=ghcr.io/xzeggaedu/fica-academic-frontend:latest

# GitHub Token (opcional, solo para repos privados o rate limits)
GITHUB_TOKEN=ghp_tu_token_aqui

# Local Image Digests (obtener con: ./scripts/get_local_digests.sh)
BACKEND_IMAGE_DIGEST=sha256:abc123def456789...
FRONTEND_IMAGE_DIGEST=sha256:xyz789uvw012345...

# Docker Compose Path (opcional, valor por defecto debería funcionar)
COMPOSE_FILE_PATH=/host/docker-compose.prod.yml
```

## Configuración Mínima

Para que el sistema funcione básicamente, solo necesitas:

```bash
# Si las imágenes son públicas, no necesitas GITHUB_TOKEN
# Los digests locales se almacenan automáticamente en Redis después de la primera actualización
```

El sistema funcionará sin estas variables usando valores por defecto, pero:

- **Sin `GITHUB_TOKEN`**: Puede haber límites de rate al consultar GHCR (si las imágenes son públicas, generalmente no es problema)
- **Sin digests en Redis ni variables de entorno**: El sistema no podrá comparar versiones locales vs remotas en la primera verificación, pero después de la primera actualización, los digests se almacenarán automáticamente en Redis

## Flujo Automático de Digests

1. **Primera vez**: Si no hay digests en Redis ni en variables de entorno, el sistema mostrará un mensaje informativo
1. **Después de actualizar**: El worker externo obtiene los nuevos digests y los almacena en Redis automáticamente
1. **Siguientes verificaciones**: El sistema lee los digests desde Redis (siempre actualizados) y compara con los remotos
1. **Fallback**: Si Redis no está disponible, usa las variables de entorno como respaldo

## Actualización Automática de Digests

**El sistema actualiza los digests automáticamente** después de cada actualización exitosa:

1. El worker externo ejecuta la actualización (pull, up, migrations)
1. Después de actualizar, obtiene los nuevos digests locales usando `docker image inspect`
1. Almacena los digests en Redis bajo las claves:
   - `system:update:backend_digest`
   - `system:update:frontend_digest`
1. La próxima verificación lee estos valores desde Redis (siempre actualizados)

**No necesitas hacer nada manualmente** - el sistema se mantiene actualizado automáticamente.

**Nota**: Si necesitas actualizar los digests manualmente (por ejemplo, después de una actualización manual fuera del sistema), puedes ejecutar `./scripts/get_local_digests.sh` y actualizar las variables de entorno como fallback.

## Verificación

Para verificar que las variables están configuradas correctamente:

1. Reinicia el contenedor del API:

   ```bash
   docker-compose -f docker-compose.prod.yml restart api
   ```

1. Verifica los logs:

   ```bash
   docker logs fica_api_prod | grep -i "update\|ghcr"
   ```

1. Prueba el endpoint desde la UI en `/configuration/system-update`

## Troubleshooting

### "No se pudieron obtener los digests remotos desde GHCR"

- Verifica que `GHCR_REGISTRY_URL` sea correcto
- Si las imágenes son privadas, asegúrate de tener `GITHUB_TOKEN` configurado
- Verifica conectividad a internet desde el contenedor

### "No se pudieron obtener los digests locales"

- Ejecuta `./scripts/get_local_digests.sh` para obtener los valores
- Asegúrate de que las imágenes estén presentes localmente: `docker images | grep fica-academic`
- Verifica que las variables estén en el archivo `.env.production` correcto

### "Timeout querying GHCR API"

- Verifica conectividad a internet
- Verifica que `GHCR_REGISTRY_URL` sea accesible
- Si persiste, puede ser un problema temporal de GHCR
