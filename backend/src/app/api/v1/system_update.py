"""System update endpoints - Admin only."""
import asyncio
import json
import logging
from typing import Annotated

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

from ...api.dependencies import get_current_superuser
from ...core.config import settings
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

    This endpoint uses the GHCR API directly (no Docker required) to check for updates.
    It compares remote image digests from GHCR with local digests from environment variables.

    Architecture:
    - This endpoint queries GHCR API directly (no Docker socket needed)
    - Local digests come from environment variables (set by external worker or docker-compose)
    - Actual updates are performed by the external worker (which has Docker access)
    """
    logger.info("Received request to check for updates via GHCR API")

    try:
        result = await _check_updates_via_ghcr_api()
        logger.info(f"Update check completed: has_updates={result['has_updates']}")
        return UpdateCheckResponse(**result)

    except Exception as e:
        logger.error(f"Error checking for updates: {str(e)}", exc_info=True)
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


async def get_remote_digest_via_api(image: str) -> str | None:
    """Get remote digest from GHCR API using proper Docker Registry API v2 authentication flow."""
    try:
        # Parse image: ghcr.io/owner/repo:tag or https://ghcr.io/owner/repo:tag
        # Example: ghcr.io/xzeggaedu/fica-academic-backend:latest
        # Remove protocol and registry URL if present
        image_clean = image
        if image_clean.startswith("https://"):
            image_clean = image_clean.replace("https://", "")
        elif image_clean.startswith("http://"):
            image_clean = image_clean.replace("http://", "")

        # Remove registry URL if present (e.g., ghcr.io/)
        registry_domain = settings.GHCR_REGISTRY_URL.replace("https://", "").replace("http://", "")
        if image_clean.startswith(f"{registry_domain}/"):
            image_clean = image_clean.replace(f"{registry_domain}/", "")

        # Split into repo and tag
        parts = image_clean.split(":")
        repo = parts[0]
        tag = parts[1] if len(parts) > 1 else "latest"

        # GHCR API endpoint (Docker Registry API v2)
        # Format: https://ghcr.io/v2/owner/repo/manifests/tag
        manifest_url = f"{settings.GHCR_REGISTRY_URL}/v2/{repo}/manifests/{tag}"

        logger.info(f"Querying GHCR API for {image}: {manifest_url}")

        async with httpx.AsyncClient(timeout=15.0) as client:
            # Step 1: Get WWW-Authenticate header to determine auth requirements
            initial_headers = {
                "Accept": "application/vnd.docker.distribution.manifest.v2+json",
            }
            initial_response = await client.get(manifest_url, headers=initial_headers)

            # If already authorized (public image or already authenticated), return digest
            if initial_response.status_code == 200:
                digest = initial_response.headers.get("Docker-Content-Digest")
                if digest:
                    logger.info(f"Got remote digest for {image}: {digest}")
                    return digest

            # Step 2: If authentication required, get token from GHCR token service
            if initial_response.status_code == 401 and settings.GITHUB_TOKEN:
                www_auth = initial_response.headers.get("WWW-Authenticate", "")
                if www_auth:
                    # Parse WWW-Authenticate header
                    # Format: Bearer realm="https://ghcr.io/token",service="ghcr.io",scope="repository:owner/repo:pull"
                    import re

                    realm_match = re.search(r'realm="([^"]+)"', www_auth)
                    service_match = re.search(r'service="([^"]+)"', www_auth)
                    scope_match = re.search(r'scope="([^"]+)"', www_auth)

                    realm = realm_match.group(1) if realm_match else f"{settings.GHCR_REGISTRY_URL}/token"
                    service = service_match.group(1) if service_match else registry_domain
                    scope = scope_match.group(1) if scope_match else f"repository:{repo}:pull"

                    # Step 3: Get GHCR token using GitHub token with Basic auth
                    github_token = settings.GITHUB_TOKEN.get_secret_value()
                    token_url = f"{realm}?service={service}&scope={scope}"

                    # GHCR requires Basic auth with username:token format
                    # Username can be the GitHub username or any value, token is the GitHub token
                    import base64

                    # Extract username from repo (owner) or use a default
                    username = repo.split("/")[0] if "/" in repo else "github"
                    auth_string = base64.b64encode(f"{username}:{github_token}".encode()).decode()

                    token_headers = {
                        "Authorization": f"Basic {auth_string}",
                        "Accept": "application/json",
                    }

                    token_response = await client.get(token_url, headers=token_headers)

                    if token_response.status_code == 200:
                        token_data = token_response.json()
                        ghcr_token = token_data.get("token") or token_data.get("access_token")

                        if ghcr_token:
                            # Step 4: Use GHCR token to get manifest
                            manifest_headers = {
                                "Accept": "application/vnd.docker.distribution.manifest.v2+json",
                                "Authorization": f"Bearer {ghcr_token}",
                            }

                            response = await client.get(manifest_url, headers=manifest_headers)

                            if response.status_code == 200:
                                # The Docker-Content-Digest header contains the digest
                                digest = response.headers.get("Docker-Content-Digest")
                                if digest:
                                    logger.info(f"Got remote digest for {image}: {digest}")
                                    return digest

                                # Fallback: parse from manifest config digest
                                try:
                                    manifest = response.json()
                                    config_digest = manifest.get("config", {}).get("digest")
                                    if config_digest:
                                        logger.info(f"Got remote digest from manifest for {image}: {config_digest}")
                                        return config_digest
                                except json.JSONDecodeError:
                                    pass

                                logger.warning(f"Could not extract digest from response for {image}")
                            else:
                                error_msg = (
                                    f"GHCR API returned status {response.status_code} "
                                    f"for {image}: {response.text[:200]}"
                                )
                                logger.warning(error_msg)
                        else:
                            error_msg = f"Could not get GHCR token from token service: " f"{token_response.text[:200]}"
                            logger.warning(error_msg)
                    else:
                        error_msg = (
                            f"GHCR token service returned status {token_response.status_code}: "
                            f"{token_response.text[:200]}"
                        )
                        logger.warning(error_msg)
            else:
                # No authentication token available or image is public but failed
                if initial_response.status_code == 401:
                    logger.warning(f"Authentication required for {image} but no GITHUB_TOKEN provided")
                else:
                    error_msg = (
                        f"GHCR API returned status {initial_response.status_code} "
                        f"for {image}: {initial_response.text[:200]}"
                    )
                    logger.warning(error_msg)

    except httpx.TimeoutException:
        logger.error(f"Timeout querying GHCR API for {image}")
    except Exception as e:
        logger.error(f"Error getting remote digest for {image}: {str(e)}")

    return None


async def _check_updates_via_ghcr_api() -> dict:
    """Check for updates using GHCR API directly (no Docker required).

    This function:
    1. Queries GHCR API for remote image digests
    2. Gets local digests from environment variables
    3. Compares them to determine if updates are available

    Returns
    -------
    dict
        Dictionary with update information
    """
    logger.info("Starting update check via GHCR API")

    async def get_local_digest_from_redis_or_env(image_type: str) -> str | None:
        """Get local digest from Redis (preferred) or environment variables (fallback).

        Parameters
        ----------
        image_type : str
            Type of image: "backend" or "frontend"

        Returns
        -------
        str | None
            Digest string or None if not found
        """
        from ...core.utils.cache import client as redis_client

        # Try Redis first (preferred - always up to date after updates)
        if redis_client:
            try:
                key = f"system:update:{image_type}_digest"
                digest = await redis_client.get(key)
                if digest:
                    digest_str = digest.decode() if isinstance(digest, bytes) else digest
                    logger.info(f"Got local digest for {image_type} from Redis: {digest_str}")
                    return digest_str
            except Exception as e:
                logger.warning(f"Error reading {image_type} digest from Redis: {str(e)}")

        # Fallback to environment variables
        if image_type == "backend":
            digest = settings.BACKEND_IMAGE_DIGEST
        elif image_type == "frontend":
            digest = settings.FRONTEND_IMAGE_DIGEST
        else:
            return None

        if digest:
            logger.info(f"Got local digest for {image_type} from env (fallback): {digest}")
        else:
            logger.warning(f"No local digest found for {image_type} (neither Redis nor env)")

        return digest

    # Get remote digests via API
    logger.info("Fetching remote digests from GHCR...")
    backend_remote = await get_remote_digest_via_api(settings.GHCR_BACKEND_IMAGE)
    frontend_remote = await get_remote_digest_via_api(settings.GHCR_FRONTEND_IMAGE)

    # Get local digests from Redis (preferred) or environment variables (fallback)
    logger.info("Getting local digests from Redis or environment variables...")
    backend_local = await get_local_digest_from_redis_or_env("backend")
    frontend_local = await get_local_digest_from_redis_or_env("frontend")

    # Compare digests
    backend_update = bool(backend_remote and backend_local and backend_remote != backend_local)
    frontend_update = bool(frontend_remote and frontend_local and frontend_remote != frontend_local)
    has_updates = backend_update or frontend_update

    # Determine message
    if not backend_local and not frontend_local:
        message = (
            "No se pudieron obtener los digests locales. "
            "Configure BACKEND_IMAGE_DIGEST y FRONTEND_IMAGE_DIGEST en las variables de entorno."
        )
    elif not backend_remote and not frontend_remote:
        message = "No se pudieron obtener los digests remotos desde GHCR."
    elif has_updates:
        message = "Actualizaciones disponibles"
    else:
        message = "Sistema actualizado"

    result = {
        "has_updates": has_updates,
        "backend_update_available": backend_update,
        "frontend_update_available": frontend_update,
        "backend_current_digest": backend_local,
        "backend_remote_digest": backend_remote,
        "frontend_current_digest": frontend_local,
        "frontend_remote_digest": frontend_remote,
        "message": message,
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
        compose_file = settings.COMPOSE_FILE_PATH

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
