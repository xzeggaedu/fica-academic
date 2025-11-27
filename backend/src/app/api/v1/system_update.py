"""System update endpoints - Admin only."""
import asyncio
import json
import logging
import os
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

from ...api.dependencies import get_current_superuser
from ...core.utils import queue

logger = logging.getLogger(__name__)

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

    Note: In localhost/development environments, this may not be able to
    check remote images if they are not accessible or if Docker commands fail.
    In such cases, it will return False for all update flags.
    """
    logger.info("Received request to check for updates")
    try:
        # Obtener ruta del docker-compose desde variables de entorno
        compose_file = os.getenv("COMPOSE_FILE_PATH", "/host/docker-compose.prod.yml")
        logger.info(f"Using compose file: {compose_file}")

        # Verificar actualizaciones directamente usando comandos Docker
        # Usar timeout más corto para evitar que se cuelgue
        logger.info("Starting update check with timeout of 60 seconds")
        try:
            result = await asyncio.wait_for(asyncio.to_thread(_check_updates_direct, compose_file), timeout=60.0)
            logger.info(f"Update check completed: {result}")
        except asyncio.TimeoutError:
            logger.error("Update check timed out after 60 seconds")
            raise Exception("Update check timed out. Docker commands may be hanging.")

        # Asegurar que todos los campos booleanos sean valores válidos
        result["has_updates"] = bool(result.get("has_updates", False))
        result["backend_update_available"] = bool(result.get("backend_update_available", False))
        result["frontend_update_available"] = bool(result.get("frontend_update_available", False))

        logger.info("Returning update check response")
        return UpdateCheckResponse(**result)

    except Exception as e:
        logger.error(f"Error checking for updates: {str(e)}", exc_info=True)
        # En caso de error (por ejemplo, en localhost sin acceso a Docker/remoto),
        # retornar una respuesta válida indicando que no hay actualizaciones disponibles
        return UpdateCheckResponse(
            has_updates=False,
            backend_update_available=False,
            frontend_update_available=False,
            backend_current_digest=None,
            backend_remote_digest=None,
            frontend_current_digest=None,
            frontend_remote_digest=None,
            message=f"No se pudo verificar actualizaciones: {str(e)}",
        )


def _check_updates_direct(compose_file: str) -> dict:
    """Check for updates directly using docker commands."""
    import subprocess

    logger.info("Starting _check_updates_direct function")

    # Verificar primero si Docker está disponible
    try:
        logger.info("Checking if Docker is available...")
        check_result = subprocess.run(
            ["docker", "--version"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if check_result.returncode != 0:
            logger.error("Docker command failed or not available")
            raise Exception("Docker is not available or not accessible")
        logger.info(f"Docker is available: {check_result.stdout.strip()}")
    except FileNotFoundError:
        logger.error("Docker command not found in PATH")
        raise Exception("Docker command not found. The container may not have access to Docker.")
    except subprocess.TimeoutExpired:
        logger.error("Timeout checking Docker availability")
        raise Exception("Docker command timed out. The container may not have access to Docker.")
    except Exception as e:
        logger.error(f"Error checking Docker availability: {str(e)}")
        raise

    images = {
        "backend": "ghcr.io/xzeggaedu/fica-academic-backend:latest",
        "frontend": "ghcr.io/xzeggaedu/fica-academic-frontend:latest",
    }

    def get_remote_digest(image: str) -> str | None:
        try:
            logger.info(f"Checking remote digest for {image}")
            result = subprocess.run(
                ["docker", "manifest", "inspect", image],
                capture_output=True,
                text=True,
                timeout=15,  # Reducir timeout a 15 segundos
            )
            if result.returncode == 0:
                manifest = json.loads(result.stdout)
                digest = manifest.get("config", {}).get("digest")
                logger.info(f"Remote digest for {image}: {digest}")
                return digest
            else:
                logger.warning(f"Failed to get remote digest for {image}: {result.stderr}")
        except subprocess.TimeoutExpired:
            logger.error(f"Timeout getting remote digest for {image}")
        except Exception as e:
            logger.error(f"Error getting remote digest for {image}: {str(e)}")
        return None

    def get_local_digest(image: str) -> str | None:
        try:
            logger.info(f"Checking local digest for {image}")
            result = subprocess.run(
                ["docker", "image", "inspect", image, "--format", "{{.RepoDigests}}"],
                capture_output=True,
                text=True,
                timeout=5,  # Reducir timeout a 5 segundos
            )
            if result.returncode == 0 and result.stdout.strip():
                # Extraer digest del formato [image@sha256:...]
                import re

                match = re.search(r"sha256:([a-f0-9]+)", result.stdout)
                if match:
                    digest = f"sha256:{match.group(1)}"
                    logger.info(f"Local digest for {image}: {digest}")
                    return digest
            else:
                logger.warning(f"Failed to get local digest for {image}: {result.stderr}")
        except subprocess.TimeoutExpired:
            logger.error(f"Timeout getting local digest for {image}")
        except Exception as e:
            logger.error(f"Error getting local digest for {image}: {str(e)}")
        return None

    # Verificar backend
    logger.info("Checking backend updates...")
    backend_remote = get_remote_digest(images["backend"])
    backend_local = get_local_digest(images["backend"])
    # Asegurar que siempre retorne un booleano (False si hay algún problema)
    backend_update = bool(backend_remote and backend_local and backend_remote != backend_local)
    logger.info(f"Backend update available: {backend_update}")

    # Verificar frontend
    logger.info("Checking frontend updates...")
    frontend_remote = get_remote_digest(images["frontend"])
    frontend_local = get_local_digest(images["frontend"])
    # Asegurar que siempre retorne un booleano (False si hay algún problema)
    frontend_update = bool(frontend_remote and frontend_local and frontend_remote != frontend_local)
    logger.info(f"Frontend update available: {frontend_update}")

    has_updates = backend_update or frontend_update

    result = {
        "has_updates": has_updates,
        "backend_update_available": backend_update,
        "frontend_update_available": frontend_update,
        "backend_current_digest": backend_local,
        "backend_remote_digest": backend_remote,
        "frontend_current_digest": frontend_local,
        "frontend_remote_digest": frontend_remote,
        "message": "Actualizaciones disponibles" if has_updates else "Sistema actualizado",
    }
    logger.info(f"Update check result: {result}")
    return result


@router.post("/update/trigger", response_model=UpdateStatusResponse)
async def trigger_update(
    request: UpdateRequest,
    background_tasks: BackgroundTasks,
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> UpdateStatusResponse:
    """Trigger system update - Admin only.

    This endpoint enqueues a system update task in ARQ. The task will be processed
    by an external worker that has access to the Docker socket.

    The update process will:
    1. Create backup (if requested) - not implemented yet
    2. Pull new images from GHCR
    3. Update containers using docker compose
    4. Run migrations (if requested)

    Note: This endpoint only enqueues the task. The actual update is performed
    by an external worker running on the host with Docker socket access.
    """
    global _update_status

    # Verificar que no hay una actualización en progreso
    if _update_status["status"] in ["checking", "updating"]:
        raise HTTPException(status_code=409, detail="An update is already in progress")

    # Verificar que la cola está disponible
    if queue.pool is None:
        raise HTTPException(
            status_code=503, detail="Queue is not available. External update worker may not be running."
        )

    try:
        compose_file = os.getenv("COMPOSE_FILE_PATH", "/host/docker-compose.prod.yml")

        # Actualizar estado
        _update_status = {
            "status": "updating",
            "message": "Update task enqueued, waiting for external worker...",
            "progress": None,
            "error": None,
        }

        # Encolar tarea en ARQ para que el worker externo la procese
        job = await queue.pool.enqueue_job(
            "process_system_update",
            compose_file,
            request.create_backup,
            request.run_migrations,
        )

        if job is None:
            _update_status = {
                "status": "failed",
                "message": "Failed to enqueue update task",
                "progress": None,
                "error": "Job creation returned None",
            }
            raise HTTPException(status_code=500, detail="Failed to enqueue update task")

        # Iniciar polling del estado del job en background
        background_tasks.add_task(poll_update_job_status, job.job_id)

        return UpdateStatusResponse(
            status="updating",
            message=f"Update task enqueued (job_id: {job.job_id}). External worker will process the update.",
        )

    except HTTPException:
        raise
    except Exception as e:
        _update_status = {"status": "failed", "message": "Failed to start update", "progress": None, "error": str(e)}
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


async def poll_update_job_status(job_id: str):
    """Poll the status of an update job and update global status.

    This function runs in the background and periodically checks the status
    of the ARQ job, updating the global _update_status accordingly.

    Parameters
    ----------
    job_id : str
        The ARQ job ID to poll
    """
    global _update_status
    from arq.jobs import Job as ArqJob

    if queue.pool is None:
        _update_status = {
            "status": "failed",
            "message": "Queue pool not available",
            "progress": None,
            "error": "Queue pool is None",
        }
        return

    job = ArqJob(job_id, queue.pool)
    max_polls = 120  # Poll for up to 10 minutes (120 * 5 seconds)
    poll_count = 0

    while poll_count < max_polls:
        try:
            job_info = await job.info()

            if job_info is None:
                _update_status = {
                    "status": "failed",
                    "message": "Job not found",
                    "progress": None,
                    "error": f"Job {job_id} not found in queue",
                }
                return

            # Check if job is complete
            if job_info.result is not None:
                result = job_info.result
                if isinstance(result, dict):
                    if result.get("status") == "completed":
                        _update_status = {
                            "status": "completed",
                            "message": result.get("message", "Update completed successfully"),
                            "progress": None,
                            "error": None,
                        }
                    else:
                        _update_status = {
                            "status": "failed",
                            "message": result.get("message", "Update failed"),
                            "progress": None,
                            "error": result.get("error"),
                        }
                else:
                    _update_status = {
                        "status": "completed",
                        "message": "Update completed",
                        "progress": None,
                        "error": None,
                    }
                return

            # Check if job failed
            if job_info.success is False:
                _update_status = {
                    "status": "failed",
                    "message": "Update job failed",
                    "progress": None,
                    "error": str(job_info.result) if job_info.result else "Unknown error",
                }
                return

            # Update status message based on job status
            if job_info.finished:
                _update_status = {
                    "status": "completed",
                    "message": "Update completed",
                    "progress": None,
                    "error": None,
                }
                return

            # Job is still running, update message
            _update_status = {
                "status": "updating",
                "message": f"Update in progress (polling job status: {poll_count}/{max_polls})",
                "progress": None,
                "error": None,
            }

            await asyncio.sleep(5)  # Poll every 5 seconds
            poll_count += 1

        except Exception as e:
            _update_status = {
                "status": "failed",
                "message": f"Error polling job status: {str(e)}",
                "progress": None,
                "error": str(e),
            }
            return

    # Timeout
    _update_status = {
        "status": "failed",
        "message": "Update job timed out (exceeded maximum polling time)",
        "progress": None,
        "error": "Job did not complete within expected time",
    }


@router.get("/update/status", response_model=UpdateStatusResponse)
async def get_update_status(
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> UpdateStatusResponse:
    """Get current update status - Admin only."""
    global _update_status
    return UpdateStatusResponse(**_update_status)
