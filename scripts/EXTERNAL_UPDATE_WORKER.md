# External Update Worker

## Descripción

El `external_update_worker.py` es un worker que se ejecuta **fuera de los contenedores Docker** (en el host) y tiene acceso al socket de Docker. Este worker procesa tareas de actualización del sistema desde la cola ARQ/Redis.

## Arquitectura de Seguridad

Esta implementación sigue la **Opción 7: Sistema de colas (Redis/ARQ) + Worker externo**, que es más segura que montar `/var/run/docker.sock` dentro del contenedor del API.

### Ventajas de seguridad:

1. **Separación de privilegios**: El contenedor del API no tiene acceso directo al socket de Docker
1. **Aislamiento**: El worker externo se ejecuta en el host con permisos controlados
1. **Auditoría**: Los comandos Docker se ejecutan desde un proceso separado y pueden ser auditados
1. **Control de acceso**: El worker puede tener permisos específicos sin exponer el socket a todos los contenedores

## Requisitos

- Python 3.11+ con las dependencias del backend instaladas
- Docker y Docker Compose instalados en el host
- Acceso al socket de Docker (`/var/run/docker.sock`)
- Redis accesible (puede ser el contenedor Redis del proyecto)

## Instalación

1. Asegúrate de tener las dependencias del backend instaladas:

   ```bash
   cd backend
   uv sync  # o pip install -r requirements.txt
   ```

1. El script está en `scripts/external_update_worker.py` y es ejecutable.

## Configuración

El worker lee las siguientes variables de entorno:

- `REDIS_QUEUE_HOST`: Host de Redis (default: `localhost`)
- `REDIS_QUEUE_PORT`: Puerto de Redis (default: `6379`)
- `GITHUB_TOKEN`: Token de GitHub para autenticación con GHCR (opcional, se puede pasar al worker)
- `COMPOSE_FILE_PATH`: Ruta al archivo `docker-compose.prod.yml` (default: `./docker-compose.prod.yml`)

## Ejecución

### Opción 1: Ejecución directa

```bash
cd /ruta/al/proyecto
python3 scripts/external_update_worker.py
```

### Opción 2: Como servicio systemd (recomendado para producción)

Crea un archivo `/etc/systemd/system/fica-update-worker.service`:

```ini
[Unit]
Description=FICA External Update Worker
After=network.target docker.service redis.service
Requires=docker.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/fica-academics-prod
Environment="REDIS_QUEUE_HOST=localhost"
Environment="REDIS_QUEUE_PORT=6379"
Environment="GITHUB_TOKEN=tu_token_aqui"
Environment="COMPOSE_FILE_PATH=/opt/fica-academics-prod/docker-compose.prod.yml"
ExecStart=/usr/bin/python3 /opt/fica-academics-prod/scripts/external_update_worker.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Luego:

```bash
sudo systemctl daemon-reload
sudo systemctl enable fica-update-worker
sudo systemctl start fica-update-worker
sudo systemctl status fica-update-worker
```

### Opción 3: Con screen/tmux (para desarrollo)

```bash
screen -S fica-update-worker
python3 scripts/external_update_worker.py
# Presiona Ctrl+A luego D para detach
```

## Verificación

Para verificar que el worker está funcionando:

1. **Ver logs del worker**:

   ```bash
   # Si está como servicio systemd
   sudo journalctl -u fica-update-worker -f

   # Si está ejecutándose directamente
   # Los logs aparecerán en stdout
   ```

1. **Verificar que está conectado a Redis**:

   ```bash
   redis-cli
   > KEYS arq:*
   ```

1. **Probar una actualización desde la UI**:

   - Ve a `/configuration/system-update`
   - Haz clic en "Verificar Actualizaciones"
   - Si hay actualizaciones, haz clic en "Actualizar Sistema"
   - El worker debería procesar la tarea

## Funcionamiento

1. **El API encola la tarea**: Cuando un administrador inicia una actualización desde la UI, el endpoint `/system/update/trigger` encola una tarea en ARQ con los parámetros necesarios.

1. **El worker procesa la tarea**: El worker externo, que está escuchando en Redis, recibe la tarea y la procesa:

   - Autentica con GHCR (si `GITHUB_TOKEN` está disponible)
   - Ejecuta `docker compose pull` para obtener nuevas imágenes
   - Ejecuta `docker compose up -d` para actualizar los contenedores
   - Espera a que los contenedores estén listos
   - Ejecuta migraciones de base de datos (si se solicitó)

1. **El API consulta el estado**: El endpoint `/system/update/status` consulta el estado de la tarea en ARQ y lo muestra en la UI.

## Solución de Problemas

### El worker no se conecta a Redis

- Verifica que Redis esté corriendo: `docker ps | grep redis`
- Verifica la conectividad: `redis-cli -h localhost -p 6379 ping`
- Verifica las variables de entorno `REDIS_QUEUE_HOST` y `REDIS_QUEUE_PORT`

### El worker no puede ejecutar comandos Docker

- Verifica que Docker esté instalado: `docker --version`
- Verifica permisos: El usuario que ejecuta el worker debe tener acceso a `/var/run/docker.sock`
- Si es necesario, agrega el usuario al grupo `docker`: `sudo usermod -aG docker $USER`

### El worker no puede encontrar docker-compose

- Verifica que Docker Compose esté instalado: `docker compose version` o `docker-compose --version`
- Verifica que `COMPOSE_FILE_PATH` apunte al archivo correcto

### Las actualizaciones fallan

- Revisa los logs del worker para ver el error específico
- Verifica que `GITHUB_TOKEN` sea válido si estás usando imágenes privadas
- Verifica que el archivo `docker-compose.prod.yml` esté en la ruta correcta
- Verifica que los contenedores estén corriendo antes de intentar actualizar

## Seguridad Adicional

Para mayor seguridad, considera:

1. **Ejecutar el worker con un usuario no-root** (si es posible):

   ```ini
   User=fica-worker
   Group=fica-worker
   ```

1. **Limitar permisos del usuario**:

   ```bash
   sudo useradd -r -s /bin/false fica-worker
   sudo usermod -aG docker fica-worker
   ```

1. **Usar un token de GitHub con permisos limitados** (solo lectura de paquetes)

1. **Monitorear los logs** del worker para detectar actividad sospechosa

1. **Implementar rate limiting** en el endpoint de actualización

## Notas

- El worker procesa una tarea a la vez (`max_jobs=1`) para evitar conflictos
- El timeout de las tareas es de 30 minutos (`job_timeout=1800`)
- Los logs se escriben en `/var/log/fica-external-update-worker.log` si el directorio existe, de lo contrario en stdout
