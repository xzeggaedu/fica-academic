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
   - Backend API en `localhost:3025`
   - PostgreSQL en `localhost:5432` (puerto configurable)
   - pgAdmin en `localhost:5050`
   - (Frontend: próximamente)

### Opción 2: Entorno local sin Docker

#### Backend

1. Instala Python 3.11 usando pyenv para asegurar soporte SSL:
   ```bash
   brew install openssl readline zlib xz
   env PYTHON_CONFIGURE_OPTS="--with-openssl=$(brew --prefix openssl)" pyenv install 3.11.0
   pyenv local 3.11.0
   ```
2. Crea el entorno virtual y actívalo:
   ```bash
   python3.11 -m venv .venv
   source .venv/bin/activate
   ```
3. Instala las dependencias y pre-commit:
   ```bash
   pip install --upgrade pip
   pip install -r backend/requirements.txt
   pip install pre-commit
   ```
4. Configura pre-commit para ejecutar linters antes de cada commit:
   ```bash
   pre-commit install
   pre-commit run --all-files
   ```
5. Configura el archivo `backend/.env` con tus variables de entorno.
6. Ejecuta la API:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8080
   ```

#### Frontend (próximamente)

- Instala Node.js y npm.
- Sigue las instrucciones en el futuro archivo `frontend/README.md`.

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
