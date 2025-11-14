"""System update endpoints - Admin only."""
import asyncio
import json
import os
import subprocess
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

from ...api.dependencies import get_current_superuser

router = APIRouter(prefix="/system", tags=["system"])


class UpdateCheckResponse(BaseModel):
    """Response model for update check."""

    has_updates: bool
    backend_update_available: bool
    frontend_update_available: bool
    backend_current_digest: str | None
    backend_remote_digest: str | None
    frontend_current_digest: str | None
    frontend_remote_digest: str | None
    message: str


class UpdateStatusResponse(BaseModel):
    """Response model for update status."""

    status: str  # "checking", "updating", "completed", "failed", "idle"
    message: str
    progress: dict | None = None
    error: str | None = None


class UpdateRequest(BaseModel):
    """Request model for triggering update."""

    create_backup: bool = True
    run_migrations: bool = True


# Estado global de actualización (en producción usar Redis)
_update_status = {"status": "idle", "message": "No update in progress", "progress": None, "error": None}


@router.get("/update/check", response_model=UpdateCheckResponse)
async def check_for_updates(
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> UpdateCheckResponse:
    """Check if there are updates available from GHCR - Admin only.

    This endpoint compares the digest of local images with remote images
    to determine if updates are available.
    """
    try:
        # Obtener ruta del docker-compose desde variables de entorno
        compose_file = os.getenv("COMPOSE_FILE_PATH", "/host/docker-compose.prod.yml")

        # Verificar actualizaciones directamente usando comandos Docker
        # Esto funciona porque el contenedor tiene acceso a Docker socket
        result = await asyncio.to_thread(_check_updates_direct, compose_file)

        return UpdateCheckResponse(**result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking updates: {str(e)}")


def _check_updates_direct(compose_file: str) -> dict:
    """Check for updates directly using docker commands."""
    import subprocess

    images = {
        "backend": "ghcr.io/xzeggaedu/fica-academic-backend:latest",
        "frontend": "ghcr.io/xzeggaedu/fica-academic-frontend:latest",
    }

    def get_remote_digest(image: str) -> str | None:
        try:
            result = subprocess.run(
                ["docker", "manifest", "inspect", image], capture_output=True, text=True, timeout=30
            )
            if result.returncode == 0:
                manifest = json.loads(result.stdout)
                return manifest.get("config", {}).get("digest")
        except Exception:
            pass
        return None

    def get_local_digest(image: str) -> str | None:
        try:
            result = subprocess.run(
                ["docker", "image", "inspect", image, "--format", "{{.RepoDigests}}"],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0 and result.stdout.strip():
                # Extraer digest del formato [image@sha256:...]
                import re

                match = re.search(r"sha256:([a-f0-9]+)", result.stdout)
                if match:
                    return f"sha256:{match.group(1)}"
        except Exception:
            pass
        return None

    # Verificar backend
    backend_remote = get_remote_digest(images["backend"])
    backend_local = get_local_digest(images["backend"])
    backend_update = backend_remote and backend_local and backend_remote != backend_local

    # Verificar frontend
    frontend_remote = get_remote_digest(images["frontend"])
    frontend_local = get_local_digest(images["frontend"])
    frontend_update = frontend_remote and frontend_local and frontend_remote != frontend_local

    has_updates = backend_update or frontend_update

    return {
        "has_updates": has_updates,
        "backend_update_available": backend_update,
        "frontend_update_available": frontend_update,
        "backend_current_digest": backend_local,
        "backend_remote_digest": backend_remote,
        "frontend_current_digest": frontend_local,
        "frontend_remote_digest": frontend_remote,
        "message": "Actualizaciones disponibles" if has_updates else "Sistema actualizado",
    }


@router.post("/update/trigger", response_model=UpdateStatusResponse)
async def trigger_update(
    request: UpdateRequest,
    background_tasks: BackgroundTasks,
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> UpdateStatusResponse:
    """Trigger system update - Admin only.

    This will:
    1. Create backup (if requested)
    2. Pull new images
    3. Update containers
    4. Run migrations (if requested)
    """
    global _update_status

    # Verificar que no hay una actualización en progreso
    if _update_status["status"] in ["checking", "updating"]:
        raise HTTPException(status_code=409, detail="An update is already in progress")

    try:
        compose_file = os.getenv("COMPOSE_FILE_PATH", "/host/docker-compose.prod.yml")

        # Actualizar estado
        _update_status = {"status": "updating", "message": "Update process started", "progress": None, "error": None}

        # Ejecutar actualización en background
        background_tasks.add_task(execute_update, compose_file, request.create_backup, request.run_migrations)

        return UpdateStatusResponse(status="updating", message="Update process started in background")

    except Exception as e:
        _update_status = {"status": "failed", "message": "Failed to start update", "progress": None, "error": str(e)}
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


async def wait_for_containers_ready(compose_file: str, max_retries: int = 30, delay: int = 5) -> bool:
    """Wait for critical containers to be running and healthy.

    Parameters
    ----------
    compose_file : str
        Path to docker-compose file
    max_retries : int
        Maximum number of retry attempts (default: 30)
    delay : int
        Delay in seconds between retries (default: 5)

    Returns
    -------
    bool
        True if all containers are ready, False otherwise
    """
    # Contenedores críticos que deben estar listos antes de migraciones
    critical_containers = ["db", "api"]

    for attempt in range(1, max_retries + 1):
        try:
            # Obtener estado de todos los contenedores
            result = subprocess.run(
                ["docker", "compose", "-f", compose_file, "ps", "--format", "json"],
                capture_output=True,
                text=True,
                timeout=10,
            )

            if result.returncode != 0:
                await asyncio.sleep(delay)
                continue

            # Parsear JSON (puede haber múltiples líneas, una por contenedor)
            containers = []
            for line in result.stdout.strip().split("\n"):
                if line.strip():
                    try:
                        containers.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue

            # Verificar que los contenedores críticos estén corriendo
            all_ready = True
            ready_containers = []
            not_ready_containers = []

            for container_name in critical_containers:
                container = next((c for c in containers if c.get("Service") == container_name), None)

                if not container:
                    all_ready = False
                    not_ready_containers.append(f"{container_name} (not found)")
                    continue

                state = container.get("State", "").lower()
                if state != "running":
                    all_ready = False
                    not_ready_containers.append(f"{container_name} (state: {state})")
                else:
                    ready_containers.append(container_name)

            if all_ready:
                return True

            # Si no están listos, esperar y reintentar
            await asyncio.sleep(delay)

        except Exception:
            # En caso de error, continuar intentando
            await asyncio.sleep(delay)
            continue

    return False


async def execute_update(compose_file: str, create_backup: bool, run_migrations: bool):
    """Execute the update script in background."""
    global _update_status

    try:
        _update_status["status"] = "updating"
        _update_status["message"] = "Pulling new images..."

        # Autenticar con GHCR
        github_token = os.getenv("GITHUB_TOKEN")
        if github_token:
            subprocess.run(
                ["docker", "login", "ghcr.io", "-u", "xzeggaedu", "--password-stdin"],
                input=github_token,
                text=True,
                capture_output=True,
                timeout=30,
                check=False,  # No fallar si la autenticación falla
            )

        # Pull imágenes
        _update_status["message"] = "Downloading new images..."
        pull_result = subprocess.run(
            ["docker", "compose", "-f", compose_file, "pull"], capture_output=True, text=True, timeout=600
        )

        if pull_result.returncode != 0:
            raise Exception(f"Failed to pull images: {pull_result.stderr}")

        # Actualizar contenedores
        _update_status["message"] = "Updating containers..."
        update_result = subprocess.run(
            ["docker", "compose", "-f", compose_file, "up", "-d"], capture_output=True, text=True, timeout=300
        )

        if update_result.returncode != 0:
            raise Exception(f"Failed to update containers: {update_result.stderr}")

        # Verificar que los contenedores estén listos antes de ejecutar migraciones
        if run_migrations:
            _update_status["message"] = "Waiting for containers to be ready..."
            containers_ready = await wait_for_containers_ready(compose_file, max_retries=30, delay=5)

            if not containers_ready:
                raise Exception(
                    "Containers did not become ready within the timeout period (2.5 minutes). "
                    "Please check container status manually."
                )

            # Ejecutar migraciones
            _update_status["message"] = "Running database migrations..."
            migrate_result = subprocess.run(
                ["docker", "compose", "-f", compose_file, "exec", "-T", "api", "alembic", "upgrade", "head"],
                capture_output=True,
                text=True,
                timeout=300,
            )

            if migrate_result.returncode != 0:
                raise Exception(f"Migration failed: {migrate_result.stderr}")

        _update_status = {
            "status": "completed",
            "message": "Update completed successfully",
            "progress": None,
            "error": None,
        }

    except Exception as e:
        _update_status = {"status": "failed", "message": "Update failed", "progress": None, "error": str(e)}


@router.get("/update/status", response_model=UpdateStatusResponse)
async def get_update_status(
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> UpdateStatusResponse:
    """Get current update status - Admin only."""
    global _update_status
    return UpdateStatusResponse(**_update_status)
