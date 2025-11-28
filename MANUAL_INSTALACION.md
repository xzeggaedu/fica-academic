# Manual de Instalación y Configuración - Sistema FICA Academics

Este documento proporciona las instrucciones necesarias para la instalación y configuración del sistema FICA Academics en entornos de producción sobre servidores Windows Server y Linux. El presente manual asume que el servidor objetivo se encuentra completamente instalado y configurado con un nombre de dominio válido: `proyectosfica.utec.edu.sv`.

______________________________________________________________________

## Tabla de Contenidos

1. [Visión General del Sistema](#visi%C3%B3n-general-del-sistema)
1. [Proceso de Integración Continua y Despliegue Continuo](#proceso-de-integraci%C3%B3n-continua-y-despliegue-continuo)
1. [Archivos Necesarios para la Instalación](#archivos-necesarios-para-la-instalaci%C3%B3n)
1. [Instalación en Windows Server](#instalaci%C3%B3n-en-windows-server)
1. [Instalación en Linux](#instalaci%C3%B3n-en-linux)
1. [Configuración de Servidor Web Reverso](#configuraci%C3%B3n-de-servidor-web-reverso)
1. [Mantenimiento y Actualizaciones](#mantenimiento-y-actualizaciones)

______________________________________________________________________

## Visión General del Sistema

### Arquitectura del Sistema

El sistema FICA Academics se encuentra compuesto por los siguientes componentes principales:

- **Frontend**: Aplicación web desarrollada con React y Vite que se sirve en el puerto 3000
- **Backend API**: Interfaz de programación de aplicaciones desarrollada con FastAPI que se ejecuta en el puerto 8000
- **Worker**: Proceso de ejecución en segundo plano para tareas asíncronas que utiliza la misma imagen del backend
- **PostgreSQL**: Sistema de gestión de bases de datos relacional que opera en el puerto 5432 (acceso interno)
- **Redis**: Sistema de almacenamiento en memoria utilizado para caché y cola de mensajes en el puerto 6379 (acceso interno)

### Flujo de Comunicación

El flujo de peticiones del sistema se estructura de la siguiente manera:

```
Internet → proyectosfica.utec.edu.sv (Puerto 80/443) → Servidor Web Reverso → Contenedores Docker
```

Todos los servicios se encuentran contenedorizados utilizando Docker y se gestionan mediante Docker Compose.

______________________________________________________________________

## Proceso de Integración Continua y Despliegue Continuo

### Descripción del Flujo de Trabajo

El sistema implementa un proceso automatizado de integración continua y despliegue continuo (CI/CD, por sus siglas en inglés Continuous Integration/Continuous Deployment) mediante GitHub Actions. Este proceso se activa cuando se realiza una solicitud de extracción (en inglés Pull Request) desde la rama de desarrollo `dev` hacia la rama principal `main`.

**Importante**: No es posible realizar cambios directos mediante push a la rama `main`. Todos los cambios deben pasar por el proceso de revisión mediante solicitudes de extracción.

### Proceso Completo del Flujo de Trabajo

El flujo de trabajo se ejecuta de la siguiente manera:

1. **Activación del Proceso**: Cuando un desarrollador crea una solicitud de extracción desde la rama `dev` hacia la rama `main`, GitHub Actions detecta el evento y activa el flujo de trabajo correspondiente.

1. **Ejecución de Pruebas Automatizadas**:

   - **Pruebas del Frontend**: Se ejecutan automáticamente los tests del frontend para verificar que el código funciona correctamente
   - **Pruebas del Backend**: Se ejecutan automáticamente los tests unitarios del backend para validar la funcionalidad

1. **Revisión y Aprobación**: Una vez que las pruebas pasan exitosamente, la solicitud de extracción puede ser revisada y aprobada por los mantenedores del proyecto.

1. **Fusión a la Rama Principal**: Al fusionar (en inglés merge) la solicitud de extracción a la rama `main`, se activa automáticamente el proceso de construcción y publicación.

1. **Construcción de Imágenes Docker**:

   - **Backend**: Se construye la imagen Docker utilizando el archivo `Dockerfile.prod` ubicado en el directorio `./backend/`
   - **Frontend**: Se construye la imagen Docker utilizando el archivo `Dockerfile.prod` ubicado en el directorio `./frontend/` con las rutas configuradas específicamente para producción

1. **Publicación en Registro de Contenedores**: Las imágenes construidas se etiquetan con los siguientes identificadores:

   - `ghcr.io/xzeggaedu/fica-academic-backend:latest`
   - `ghcr.io/xzeggaedu/fica-academic-frontend:latest`
     Posteriormente, se publican automáticamente en GitHub Container Registry (GHCR) para que estén disponibles para su descarga.

1. **Disponibilidad en Producción**: Una vez completado el proceso, las nuevas imágenes están disponibles en el registro de contenedores y pueden ser descargadas en los servidores de producción mediante el comando `docker compose pull`.

### Consideraciones Importantes

- El flujo de trabajo se ejecuta únicamente cuando se fusiona una solicitud de extracción a la rama `main`
- Las imágenes siempre se etiquetan como `latest` para facilitar su identificación
- Para obtener nuevas versiones en producción, es necesario descargar las imágenes actualizadas desde GHCR utilizando el comando `docker compose pull`

______________________________________________________________________

## Archivos Necesarios para la Instalación

### Resumen de Archivos Requeridos

Para realizar la instalación del sistema, se requieren los siguientes archivos:

1. **docker-compose.prod.yml**: Archivo de configuración de Docker Compose que define los servicios y su configuración

   - Ubicación: Raíz del proyecto
   - Descarga directa: https://raw.githubusercontent.com/xzeggaedu/fica-academic/main/docker-compose.prod.yml

1. **backend/src/.env.production**: Archivo de variables de entorno que debe ser creado manualmente

   - Ubicación: `backend/src/.env.production`
   - Contiene todas las configuraciones necesarias para el funcionamiento del sistema en producción

### Estructura de Directorios

La estructura de directorios requerida es la siguiente:

```
/opt/fica-academics-prod/          (Linux)
C:\fica-academics-prod\            (Windows)
├── docker-compose.prod.yml        # Archivo principal de Docker Compose
└── backend/
    └── src/
        └── .env.production        # Variables de entorno (crear manualmente)
```

### Variables de Entorno Requeridas

El archivo `.env.production` debe contener las siguientes variables de configuración:

#### Variables Obligatorias

```env
# Configuración de la Aplicación
APP_NAME="Academics 1.0 | UTEC"
ENVIRONMENT="production"

# Configuración de Base de Datos
POSTGRES_USER=utec_fica
POSTGRES_PASSWORD=TU_PASSWORD_SEGURO
POSTGRES_SERVER=db
POSTGRES_PORT=5432
POSTGRES_DB=fica_academic

# Configuración de Seguridad
SECRET_KEY=TU_SECRET_KEY_MUY_SEGURO
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Configuración de Redis
REDIS_CACHE_HOST=redis
REDIS_CACHE_PORT=6379
REDIS_QUEUE_HOST=redis
REDIS_QUEUE_PORT=6379

# Configuración de Usuario Administrador
ADMIN_NAME="Administrador"
ADMIN_EMAIL=admin@utec.edu.sv
ADMIN_USERNAME=admin
ADMIN_PASSWORD=TU_PASSWORD_ADMIN_SEGURO
```

#### Variables Opcionales

```env
# Usuarios de Demostración (Opcional)
DEMO_PASSWORD=password_demo_seguro
VICERRECTOR_USER=vicerrector
DECANO_USER=decano
DIRECTOR_USER_1=director1
DIRECTOR_USER_2=director2

# Configuración de Docker Compose (Opcional)
# Ruta al archivo docker-compose.prod.yml en el host
# Por defecto: /opt/fica-academics-prod (Linux) o C:\fica-academics-prod (Windows)
COMPOSE_FILE_PATH=/opt/fica-academics-prod
```

______________________________________________________________________

## Instalación en Windows Server

### Prerrequisitos

- Windows Server 2019 o versión superior
- Permisos de administrador en el sistema
- Conexión a Internet estable
- Nombre de dominio configurado: `proyectosfica.utec.edu.sv`

### Paso 1: Instalación de Docker Desktop

#### Método 1: Instalación mediante Interfaz Gráfica de Usuario

1. **Descargar Docker Desktop**:

   - Acceder al sitio web oficial: https://www.docker.com/products/docker-desktop
   - Descargar la versión correspondiente para Windows Server

1. **Ejecutar el Instalador**:

   - Ejecutar el archivo instalador descargado
   - Seguir las instrucciones del asistente de instalación
   - Asegurarse de que la opción "Start Docker Desktop when you log in" esté marcada

1. **Verificar la Instalación**:

   - Abrir Docker Desktop desde el menú de inicio
   - Verificar que el estado del sistema indique "Docker Desktop is running"

#### Método 2: Instalación mediante PowerShell

1. **Descargar el Instalador**:

   ```powershell
   # Descargar Docker Desktop para Windows Server
   Invoke-WebRequest -Uri "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe" -OutFile "$env:TEMP\DockerDesktopInstaller.exe"
   ```

1. **Ejecutar la Instalación**:

   ```powershell
   # Ejecutar el instalador en modo silencioso
   Start-Process -FilePath "$env:TEMP\DockerDesktopInstaller.exe" -ArgumentList "install", "--quiet" -Wait
   ```

1. **Verificar la Instalación**:

   ```powershell
   # Verificar versión de Docker
   docker --version

   # Verificar versión de Docker Compose
   docker compose version
   ```

### Paso 2: Configuración de Docker Compose

Docker Compose se incluye automáticamente con Docker Desktop. Para verificar su funcionamiento:

```powershell
docker compose version
```

### Paso 3: Autenticación en GitHub Container Registry

#### 3.1 Creación de Token de Acceso Personal

1. Acceder a la sección de configuración de tokens de GitHub: https://github.com/settings/tokens
1. Seleccionar "Generate new token" → "Generate new token (classic)"
1. Configurar los siguientes parámetros:
   - **Note**: `FICA Academics - GHCR Access`
   - **Expiration**: Seleccionar según las necesidades (recomendado: 90 días o sin expiración)
   - **Scopes**: Seleccionar `read:packages`
1. Seleccionar "Generate token"
1. **IMPORTANTE**: Copiar el token inmediatamente, ya que no se mostrará nuevamente

#### 3.2 Autenticación con GHCR

Abrir PowerShell como administrador y ejecutar:

```powershell
# Reemplazar 'xzeggaedu' con el usuario de GitHub y el token con el PAT creado
echo "ghp_TU_TOKEN_AQUI" | docker login ghcr.io -u xzeggaedu --password-stdin
```

**Ejemplo**:

```powershell
echo "ghp_TU_TOKEN_AQUI" | docker login ghcr.io -u xzeggaedu --password-stdin
```

Si el comando es exitoso, se mostrará el mensaje: `Login Succeeded`

### Paso 4: Preparación del Entorno

#### 4.1 Creación del Directorio de Trabajo

```powershell
# Crear directorio
New-Item -ItemType Directory -Path "C:\fica-academics-prod" -Force
cd C:\fica-academics-prod
```

#### 4.2 Copia del Archivo docker-compose.prod.yml

Copiar el archivo `docker-compose.prod.yml` desde el repositorio al directorio creado:

```powershell
# Si se tiene el repositorio clonado localmente
Copy-Item "C:\ruta\al\repositorio\docker-compose.prod.yml" -Destination "C:\fica-academics-prod\"

# O descargar directamente desde GitHub
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/xzeggaedu/fica-academic/main/docker-compose.prod.yml" -OutFile "docker-compose.prod.yml"
```

#### 4.3 Creación de la Estructura de Directorios

```powershell
New-Item -ItemType Directory -Path "backend\src" -Force
```

#### 4.4 Actualización de docker-compose.prod.yml para Windows

Editar el archivo `docker-compose.prod.yml` y actualizar la ruta del volumen en el servicio `api`:

```yaml
api:
  volumes:
    # Para Windows Server, usar formato de ruta de Windows
    - C:\fica-academics-prod:/host:ro
```

### Paso 5: Configuración de Variables de Entorno

#### 5.1 Creación del Archivo .env.production

```powershell
# Crear el archivo
New-Item -ItemType File -Path "backend\src\.env.production"
```

#### 5.2 Configuración de Variables

Abrir el archivo `backend\src\.env.production` con un editor de texto y configurar las variables según se especifica en la sección "Archivos Necesarios para la Instalación".

#### 5.3 Generación de SECRET_KEY Seguro

Ejecutar en PowerShell:

```powershell
# Opción 1: Utilizando .NET
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 }))

# Opción 2: Utilizando OpenSSL (si está instalado)
openssl rand -hex 32
```

Copiar el resultado y utilizarlo como valor de `SECRET_KEY`.

#### 5.4 Configuración de Permisos del Archivo

```powershell
# Restringir acceso al archivo .env.production
icacls "backend\src\.env.production" /inheritance:r
icacls "backend\src\.env.production" /grant:r "$env:USERNAME:R"
```

### Paso 6: Descarga de Imágenes Docker

```powershell
# Asegurarse de estar en el directorio correcto
cd C:\fica-academics-prod

# Descargar las imágenes desde GHCR
docker compose -f docker-compose.prod.yml pull
```

Este comando descargará las siguientes imágenes:

- `ghcr.io/xzeggaedu/fica-academic-backend:latest`
- `ghcr.io/xzeggaedu/fica-academic-frontend:latest`
- `postgres:13`
- `redis:alpine`

### Paso 7: Ejecución de Contenedores

#### 7.1 Inicio de los Contenedores

```powershell
# Iniciar todos los servicios
docker compose -f docker-compose.prod.yml up -d

# Verificar que estén en ejecución
docker compose -f docker-compose.prod.yml ps
```

Deberían observarse los siguientes contenedores:

- `fica_api_prod`
- `fica_frontend_prod`
- `fica_worker_prod`
- `fica_db_prod`
- `fica_redis_prod`
- `fica_init_permissions` (se ejecuta y termina)

#### 7.2 Verificación de Logs

```powershell
# Ver logs de todos los servicios
docker compose -f docker-compose.prod.yml logs -f

# Ver logs de un servicio específico
docker compose -f docker-compose.prod.yml logs -f api
```

### Paso 8: Inicialización de Base de Datos

#### 8.1 Ejecución de Migraciones

Esperar unos segundos para que la base de datos esté lista, luego ejecutar:

```powershell
docker compose -f docker-compose.prod.yml exec api alembic upgrade head
```

#### 8.2 Creación de Usuario Administrador

```powershell
docker compose -f docker-compose.prod.yml exec api python -m src.scripts.create_first_superuser
```

#### 8.3 Ejecución de Seeders (Opcional)

Para cargar datos iniciales:

```powershell
docker compose -f docker-compose.prod.yml exec api python -m src.scripts.run_all_seeders
```

### Paso 9: Verificación de Funcionamiento

```powershell
# Verificar que el backend responda
curl http://localhost:8000/docs

# Verificar que el frontend responda
curl http://localhost:3000
```

Los servicios deberían estar accesibles en:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Documentación API: `http://localhost:8000/docs`

______________________________________________________________________

## Instalación en Linux

### Prerrequisitos

- Ubuntu Server 20.04 LTS o versión superior (recomendado: 22.04 LTS)
- Permisos de sudo en el sistema
- Conexión a Internet estable
- Nombre de dominio configurado: `proyectosfica.utec.edu.sv`

### Paso 1: Instalación de Docker Engine

#### 1.1 Actualización del Sistema

```bash
sudo apt-get update
sudo apt-get upgrade -y
```

#### 1.2 Instalación de Dependencias

```bash
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release
```

#### 1.3 Agregar Repositorio de Docker

```bash
# Crear directorio para claves GPG
sudo mkdir -p /etc/apt/keyrings

# Descargar y agregar la clave GPG oficial de Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Agregar el repositorio de Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

#### 1.4 Instalación de Docker Engine

```bash
# Actualizar lista de paquetes
sudo apt-get update

# Instalar Docker Engine, Docker CLI y Docker Compose
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

#### 1.5 Verificación de Instalación

```bash
# Verificar versión de Docker
docker --version

# Verificar que Docker está funcionando
sudo docker run hello-world

# Verificar Docker Compose
docker compose version
```

#### 1.6 Configuración de Docker para Usuario No-Root (Recomendado)

```bash
# Agregar el usuario al grupo docker
sudo usermod -aG docker $USER

# Nota: Es necesario cerrar sesión y volver a iniciar sesión para que los cambios surtan efecto
# O ejecutar: newgrp docker
```

#### 1.7 Configuración de Docker para Inicio Automático

```bash
# Verificar que el servicio de Docker esté habilitado para iniciar automáticamente
sudo systemctl enable docker

# Verificar estado del servicio
sudo systemctl status docker
```

### Paso 2: Autenticación en GitHub Container Registry

#### 2.1 Creación de Token de Acceso Personal

Seguir los mismos pasos que en la sección de Windows Server (Paso 3.1).

#### 2.2 Autenticación con GHCR

```bash
# Reemplazar 'xzeggaedu' con el usuario de GitHub y el token con el PAT creado
echo "ghp_TU_TOKEN_AQUI" | docker login ghcr.io -u xzeggaedu --password-stdin
```

**Ejemplo**:

```bash
echo "ghp_TU_TOKEN_AQUI" | docker login ghcr.io -u xzeggaedu --password-stdin
```

### Paso 3: Preparación del Entorno

#### 3.1 Creación del Directorio de Trabajo

```bash
# Crear directorio para el despliegue
sudo mkdir -p /opt/fica-academics-prod
cd /opt/fica-academics-prod

# Cambiar propietario al usuario actual
sudo chown -R $USER:$USER /opt/fica-academics-prod
```

#### 3.2 Copia del Archivo docker-compose.prod.yml

```bash
# Si se tiene el repositorio clonado localmente
cp /ruta/al/repositorio/docker-compose.prod.yml /opt/fica-academics-prod/

# O descargar desde el repositorio
wget https://raw.githubusercontent.com/xzeggaedu/fica-academic/main/docker-compose.prod.yml
```

#### 3.3 Creación de la Estructura de Directorios

```bash
mkdir -p backend/src
```

#### 3.4 Verificación de Configuración de docker-compose.prod.yml

El archivo `docker-compose.prod.yml` debería estar configurado para Linux. Verificar que el volumen en el servicio `api` esté configurado así:

```yaml
api:
  volumes:
    - /opt/fica-academics-prod:/host:ro
```

O explícitamente:

```yaml
api:
  volumes:
    - /opt/fica-academics-prod:/host:ro
```

### Paso 4: Configuración de Variables de Entorno

#### 4.1 Creación del Archivo .env.production

```bash
# Crear el archivo
nano backend/src/.env.production
# O utilizar vim: vim backend/src/.env.production
```

#### 4.2 Configuración de Variables

Utilizar la misma configuración que en Windows Server. Las variables son idénticas.

#### 4.3 Generación de SECRET_KEY Seguro

```bash
# Opción 1: Utilizando openssl (recomendado)
openssl rand -hex 32

# Opción 2: Utilizando /dev/urandom
cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 64 | head -n 1

# Opción 3: Utilizando Python
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

#### 4.4 Configuración de Permisos del Archivo

```bash
# Restringir acceso al archivo .env.production
chmod 600 backend/src/.env.production
```

### Paso 5: Descarga de Imágenes Docker

```bash
# Asegurarse de estar en el directorio correcto
cd /opt/fica-academics-prod

# Descargar las imágenes desde GHCR
docker compose -f docker-compose.prod.yml pull
```

### Paso 6: Ejecución de Contenedores

#### 6.1 Inicio de los Contenedores

```bash
# Iniciar todos los servicios
docker compose -f docker-compose.prod.yml up -d

# Verificar que estén en ejecución
docker compose -f docker-compose.prod.yml ps
```

#### 6.2 Verificación de Logs

```bash
# Ver logs de todos los servicios
docker compose -f docker-compose.prod.yml logs -f

# Ver logs de un servicio específico
docker compose -f docker-compose.prod.yml logs -f api
```

### Paso 7: Inicialización de Base de Datos

Seguir los mismos pasos que en Windows Server (Paso 8):

```bash
# Ejecutar migraciones
docker compose -f docker-compose.prod.yml exec api alembic upgrade head

# Crear usuario administrador
docker compose -f docker-compose.prod.yml exec api python -m src.scripts.create_first_superuser

# (Opcional) Ejecutar seeders
docker compose -f docker-compose.prod.yml exec api python -m src.scripts.run_all_seeders
```

### Paso 8: Verificación de Funcionamiento

```bash
# Verificar que el backend responda
curl -I http://localhost:8000/docs

# Verificar que el frontend responda
curl -I http://localhost:3000
```

______________________________________________________________________

## Configuración de Servidor Web Reverso

Esta sección describe cómo configurar un servidor web reverso (reverse proxy) para redirigir el tráfico desde `proyectosfica.utec.edu.sv` hacia los contenedores Docker que se ejecutan en localhost.

### Opción A: Configuración con Nginx (Recomendado)

#### A.1 Instalación de Nginx

**En Linux**:

```bash
sudo apt-get update
sudo apt-get install -y nginx

# Iniciar y habilitar Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

**En Windows Server**:

- Nginx no está disponible nativamente en Windows Server como servicio
- Se recomienda utilizar IIS (ver Opción C) o instalar Nginx manualmente

#### A.2 Configuración de Nginx para ProyectosFICA

Crear el archivo de configuración:

**En Linux**:

```bash
sudo nano /etc/nginx/sites-available/proyectosfica
```

Agregar la siguiente configuración:

```nginx
# Redirección HTTP a HTTPS
server {
    listen 80;
    server_name proyectosfica.utec.edu.sv;
    return 301 https://$server_name$request_uri;
}

# Configuración HTTPS
server {
    listen 443 ssl http2;
    server_name proyectosfica.utec.edu.sv;

    # Certificados SSL (configurar según el método de obtención)
    # Si se utiliza Let's Encrypt, Certbot configurará estas líneas automáticamente
    # ssl_certificate /etc/letsencrypt/live/proyectosfica.utec.edu.sv/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/proyectosfica.utec.edu.sv/privkey.pem;

    # Configuración SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Configuración de log
    access_log /var/log/nginx/proyectosfica-access.log;
    error_log /var/log/nginx/proyectosfica-error.log;

    # Frontend - Ruta base /academics
    # El frontend está construido con VITE_BASE_PATH=/academics
    # Los archivos están en la raíz de dist, pero las referencias tienen el prefijo /academics
    # Por lo tanto, se envía la ruta sin el prefijo al contenedor
    location /academics/ {
        proxy_pass http://localhost:3000/academics/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API - Ruta /academics/api
    location /academics/api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout para operaciones largas
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;

        # Remover /academics del path antes de enviar al backend
        rewrite ^/academics/api(.*)$ /api$1 break;
    }

    # Documentación API
    location /academics/docs {
        proxy_pass http://localhost:8000/docs;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # OpenAPI JSON
    location /academics/openapi.json {
        proxy_pass http://localhost:8000/openapi.json;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

#### A.3 Habilitación del Sitio

```bash
# Crear enlace simbólico
sudo ln -s /etc/nginx/sites-available/proyectosfica /etc/nginx/sites-enabled/

# Eliminar el sitio por defecto (opcional)
sudo rm /etc/nginx/sites-enabled/default

# Verificar configuración
sudo nginx -t

# Si la verificación es exitosa, recargar Nginx
sudo systemctl reload nginx
```

#### A.4 Obtención de Certificado SSL con Let's Encrypt (Recomendado)

```bash
# Instalar Certbot
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Obtener certificado SSL
sudo certbot --nginx -d proyectosfica.utec.edu.sv

# Certbot automáticamente:
# - Obtendrá el certificado SSL
# - Configurará Nginx para usar HTTPS
# - Configurará la redirección de HTTP a HTTPS
# - Configurará la renovación automática
```

#### A.5 Verificación de Configuración SSL

```bash
# Verificar configuración de Nginx
sudo nginx -t

# Recargar Nginx
sudo systemctl reload nginx

# Verificar que Certbot configuró la renovación automática
sudo certbot renew --dry-run
```

### Opción B: Configuración con Apache

#### B.1 Instalación de Apache

**En Linux**:

```bash
sudo apt-get update
sudo apt-get install -y apache2

# Habilitar módulos necesarios
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod rewrite
sudo a2enmod ssl
sudo a2enmod headers

# Reiniciar Apache
sudo systemctl restart apache2
```

**En Windows Server**:

- Apache no está disponible nativamente. Se recomienda utilizar IIS.

#### B.2 Configuración de Apache para ProyectosFICA

Crear el archivo de configuración:

```bash
sudo nano /etc/apache2/sites-available/proyectosfica.conf
```

Agregar la siguiente configuración:

```apache
<VirtualHost *:80>
    ServerName proyectosfica.utec.edu.sv
    Redirect permanent / https://proyectosfica.utec.edu.sv/
</VirtualHost>

<VirtualHost *:443>
    ServerName proyectosfica.utec.edu.sv

    # Certificados SSL
    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/proyectosfica.crt
    SSLCertificateKeyFile /etc/ssl/private/proyectosfica.key

    # Configuración SSL
    SSLProtocol all -SSLv2 -SSLv3
    SSLCipherSuite HIGH:!aNULL:!MD5

    # Frontend - Ruta base /academics
    # El frontend está construido con VITE_BASE_PATH=/academics
    # Los archivos están en la raíz de dist, pero las referencias tienen el prefijo /academics
    <Location /academics>
        ProxyPass http://localhost:3000/academics
        ProxyPassReverse http://localhost:3000/academics
        ProxyPreserveHost On
        RequestHeader set X-Forwarded-Proto "https"
        RequestHeader set X-Forwarded-Port "443"
    </Location>

    # Backend API - Ruta /academics/api
    <Location /academics/api>
        ProxyPass http://localhost:8000/api
        ProxyPassReverse http://localhost:8000/api
        ProxyPreserveHost On
        RequestHeader set X-Forwarded-Proto "https"
        RequestHeader set X-Forwarded-Port "443"
    </Location>

    # Documentación API
    <Location /academics/docs>
        ProxyPass http://localhost:8000/docs
        ProxyPassReverse http://localhost:8000/docs
        ProxyPreserveHost On
    </Location>

    # Logs
    ErrorLog ${APACHE_LOG_DIR}/proyectosfica-error.log
    CustomLog ${APACHE_LOG_DIR}/proyectosfica-access.log combined
</VirtualHost>
```

#### B.3 Habilitación del Sitio

```bash
# Habilitar el sitio
sudo a2ensite proyectosfica.conf

# Deshabilitar el sitio por defecto (opcional)
sudo a2dissite 000-default.conf

# Verificar configuración
sudo apache2ctl configtest

# Si la verificación es exitosa, recargar Apache
sudo systemctl reload apache2
```

### Opción C: Configuración con IIS (Windows Server)

#### C.1 Instalación de IIS

```powershell
# Instalar IIS con el módulo de proxy
Install-WindowsFeature -name Web-Server -IncludeManagementTools
Install-WindowsFeature -name Web-Application-Proxy
```

#### C.2 Instalación de URL Rewrite y ARR

1. Descargar **URL Rewrite** desde: https://www.iis.net/downloads/microsoft/url-rewrite
1. Descargar **Application Request Routing (ARR)** desde: https://www.iis.net/downloads/microsoft/application-request-routing
1. Instalar ambos módulos

#### C.3 Configuración de IIS como Servidor Web Reverso

1. Abrir **IIS Manager**
1. Seleccionar el servidor en el panel izquierdo
1. Hacer doble clic en **Application Request Routing Cache**
1. Hacer clic en **Server Proxy Settings** en el panel derecho
1. Marcar **Enable proxy**
1. Hacer clic en **Apply**

#### C.4 Creación de Sitio Web en IIS

1. En IIS Manager, hacer clic derecho en **Sites** → **Add Website**
1. Configurar:
   - **Site name**: `proyectosfica`
   - **Binding**:
     - Type: `http`
     - IP address: `All Unassigned`
     - Port: `80`
     - Host name: `proyectosfica.utec.edu.sv`
1. **Physical path**: Crear una carpeta (ej: `C:\inetpub\proyectosfica`)
1. Hacer clic en **OK**

#### C.5 Configuración de URL Rewrite

1. Seleccionar el sitio `proyectosfica` en IIS Manager
1. Hacer doble clic en **URL Rewrite**
1. Hacer clic en **Add Rule** → **Reverse Proxy**
1. Configurar:
   - **Inbound rule**: `(.*)`
   - **Rewrite URL**: `https://IP_DEL_SERVIDOR_LINUX/{R:1}`
     - Reemplazar `IP_DEL_SERVIDOR_LINUX` con la IP del servidor donde se ejecutan los contenedores
   - Marcar **Append query string**
   - Marcar **Stop processing of subsequent rules**
1. Hacer clic en **OK**

#### C.6 Configuración de Headers HTTP

1. En **URL Rewrite**, seleccionar la regla que se acaba de crear
1. Hacer clic en **Edit** → **Server Variables**
1. Agregar las siguientes variables:
   - `HTTP_X-Forwarded-Proto` = `https`
   - `HTTP_X-Forwarded-Host` = `{HTTP_HOST}`
   - `HTTP_X-Real-IP` = `{REMOTE_ADDR}`
1. Hacer clic en **OK**

______________________________________________________________________

## Mantenimiento y Actualizaciones

### Actualización de Imágenes Docker

Cuando hay nuevas versiones disponibles en GHCR:

#### 1. Autenticación con GHCR (si es necesario)

```bash
# Linux
echo "tu-personal-access-token" | docker login ghcr.io -u xzeggaedu --password-stdin
```

```powershell
# Windows
echo "tu-personal-access-token" | docker login ghcr.io -u xzeggaedu --password-stdin
```

#### 2. Descarga de Nuevas Imágenes

```bash
# Desde el directorio donde está docker-compose.prod.yml
cd /opt/fica-academics-prod  # Linux
# cd C:\fica-academics-prod  # Windows

# Descargar las nuevas imágenes
docker compose -f docker-compose.prod.yml pull
```

#### 3. Reinicio de Servicios con Nuevas Imágenes

```bash
# Opción 1: Reiniciar todos los servicios
docker compose -f docker-compose.prod.yml up -d

# Opción 2: Reiniciar servicios específicos
docker compose -f docker-compose.prod.yml up -d --no-deps api frontend worker
```

#### 4. Verificación de Actualización

```bash
# Ver logs para verificar que todo funciona
docker compose -f docker-compose.prod.yml logs -f api

# Verificar versión de las imágenes
docker images | grep fica-academic
```

### Respaldo de Base de Datos

#### Respaldo Manual

```bash
# Crear respaldo
docker compose -f docker-compose.prod.yml exec db pg_dump -U utec_fica fica_academic > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar respaldo
cat backup.sql | docker compose -f docker-compose.prod.yml exec -T db psql -U utec_fica -d fica_academic
```

### Comandos Útiles de Mantenimiento

#### Ver Logs

```bash
# Todos los servicios
docker compose -f docker-compose.prod.yml logs -f

# Servicio específico
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f worker
```

#### Ver Estado de Contenedores

```bash
docker compose -f docker-compose.prod.yml ps
```

#### Ver Uso de Recursos

```bash
docker stats
```

#### Detener Servicios

```bash
docker compose -f docker-compose.prod.yml stop
```

#### Iniciar Servicios

```bash
docker compose -f docker-compose.prod.yml start
```

#### Reiniciar un Servicio Específico

```bash
docker compose -f docker-compose.prod.yml restart api
```

#### Acceder a un Contenedor

```bash
# Acceder al contenedor del backend
docker compose -f docker-compose.prod.yml exec api bash

# Acceder a la base de datos
docker compose -f docker-compose.prod.yml exec db psql -U utec_fica -d fica_academic
```

### Actualización del Sistema Operativo

#### Linux

```bash
# Actualizar sistema
sudo apt-get update
sudo apt-get upgrade -y

# Actualizar Docker
sudo apt-get update
sudo apt-get upgrade docker-ce docker-ce-cli containerd.io

# Reiniciar si es necesario
sudo reboot
```

#### Windows Server

- Utilizar Windows Update para mantener el sistema actualizado
- Actualizar Docker Desktop desde la aplicación

______________________________________________________________________

## Notas Importantes

1. **Seguridad**:

   - Nunca incluir el archivo `.env.production` en el repositorio de código
   - Mantener las contraseñas seguras y únicas
   - Generar un `SECRET_KEY` único y seguro
   - Configurar certificados SSL para HTTPS

1. **Respaldo**:

   - Configurar respaldos regulares de la base de datos
   - Mantener respaldos de los archivos de configuración
   - Probar la restauración de respaldos periódicamente

1. **Actualizaciones**:

   - Mantener Docker y las imágenes actualizadas
   - Revisar los logs después de cada actualización
   - Probar en un ambiente de pruebas antes de producción si es posible

1. **Monitoreo**:

   - Monitorear el uso de recursos (`docker stats`)
   - Revisar los logs regularmente
   - Configurar alertas para servicios críticos

1. **Permisos**:

   - Asegurarse de que los volúmenes de Docker tengan los permisos correctos
   - Restringir el acceso al archivo `.env.production`

______________________________________________________________________

**Última actualización**: 2025-01-XX

**Versión del Manual**: 1.0
