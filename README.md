# fica-academic

FICA Academic API es el backend desarrollado en FastAPI para el Sistema de Estadísticos de la Carga Académica de la Facultad de Informática y Ciencias Aplicadas (FICA) de la Universidad Tecnológica de El Salvador.

Este repositorio contiene el entorno completo para el desarrollo del sistema FICA Academic, incluyendo backend (FastAPI) y próximamente frontend. Aquí encontrarás todo lo necesario para configurar y trabajar como developer en este proyecto.

## Requisitos generales

- Docker y Docker Compose
- Python 3.11 (recomendado instalar con pyenv)
- Node.js y npm (para el frontend, próximamente)

## Estructura del proyecto

```
fica-academic/
│── backend/
│   │── app/
│   │── requirements.txt
│   │── Dockerfile
│   │── .env
│── frontend/   # (próximamente)
│── docker-compose.yml
│── .env
```

---

## Configuración del entorno de desarrollo

### Opción 1: Usando Docker (recomendado)

1. Clona el repositorio y entra al directorio:
   ```bash
   git clone https://github.com/xzeggaedu/fica-academic.git
   cd fica-academic
   ```
2. Crea manualmente el archivo `.env` en la raíz del proyecto con las variables necesarias. Ejemplo:
   ```env
   # .env (global) - ejemplo
   POSTGRES_USER=your_db_user
   POSTGRES_PASSWORD=your_db_password
   POSTGRES_DB=your_db_name
   PGADMIN_EMAIL=your_pgadmin_email@example.com
   PGADMIN_PASSWORD=your_pgadmin_password
   ```
   Para el backend, crea manualmente `backend/.env` así:
   ```env
   # backend/.env - ejemplo
   DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
   SECRET_KEY=your_secret_key
   DEBUG=True
   ```
3. Levanta los servicios:
   ```bash
   docker-compose up --build
   ```
   Esto levantará:
   - Backend API en `http://localhost:3025`
   - Frontend en `http://localhost:3000`
   - PostgreSQL en `localhost:5432` (puerto configurable)
   - pgAdmin en `http://localhost:5050`

## Visualización de la aplicación en producción

Para levantar el entorno de producción, usa:

```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

Esto levantará:

- Backend API en `http://localhost:3025`
- Frontend en `http://localhost:3000`
- PostgreSQL en `localhost:5432`
- pgAdmin en `http://localhost:5050`

Accede al frontend desde tu navegador en `http://localhost:3000` y al backend en `http://localhost:3025`.

---

## Buenas prácticas para developers

- Usa siempre un entorno virtual para Python.
- Ejecuta los linters y pre-commit antes de cada commit para mantener la calidad del código.
- Si usas Docker, asegúrate de que los puertos necesarios estén libres.
- Mantén tus archivos `.env` seguros y nunca los subas a repositorios públicos.
- Documenta cualquier cambio relevante en el README o en los archivos de configuración.

---

## Endpoints principales del backend

- `/` - Mensaje de bienvenida
- `/api/health` - Verifica el estado de la API

---

## Contacto y soporte

Para dudas técnicas, sugerencias o soporte, contacta a los responsables del proyecto o abre un issue en GitHub.
