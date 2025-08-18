# fica-academic

FICA Academic API es el backend desarrollado en FastAPI para el Sistema de Estadísticos de la Carga Académica de la Facultad de Informática y Ciencias Aplicadas (FICA) de la Universidad Tecnológica de El Salvador.

## Requisitos

- Docker y Docker Compose
- Python 3.11
- (Opcional) PostgreSQL local si no usas Docker

## Configuración rápida con Docker

1. Clona el repositorio y entra al directorio:
   ```bash
   git clone https://github.com/xzeggaedu/fica-academic.git
   cd fica-academic
   ```
2. Configura el archivo `.env` en la raíz del proyecto con las variables necesarias (puedes copiar el ejemplo de `backend/.env`).
3. Construye y levanta los servicios:
   ```bash
   docker-compose up --build
   ```
   Esto levantará:
   - API en `localhost:3025`
   - PostgreSQL en `localhost:5432` (puerto configurable)
   - pgAdmin en `localhost:5050`

## Configuración manual (sin Docker)

1. Instala Python 3.11 y crea un entorno virtual:
   ```bash
   python3.11 -m venv .venv
   source .venv/bin/activate
   ```
2. Instala las dependencias:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Configura el archivo `backend/.env` con tus variables de entorno.
4. Ejecuta la API:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8080
   ```

## Estructura del proyecto

```
fica-academic/
│── backend/
│   │── app/
│   │   │── __init__.py
│   │   │── main.py
│   │   │── api/
│   │   │   │── __init__.py
│   │   │   │── routes.py
│   │   │── core/
│   │   │   │── config.py
│   │── requirements.txt
│   │── Dockerfile
│   │── .env
│── docker-compose.yml
```

## Notas

- Si el puerto 5432 está ocupado, cambia el mapeo en `docker-compose.yml` (por ejemplo, `5433:5432`).
- pgAdmin es opcional, pero útil para administrar la base de datos.
- Las variables de entorno deben estar correctamente configuradas para conectar la API con la base de datos.

## Endpoints principales

- `/` - Mensaje de bienvenida
- `/api/health` - Verifica el estado de la API

## Contacto

Para soporte o dudas, contacta a los responsables del proyecto.
