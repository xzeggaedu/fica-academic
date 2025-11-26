"""System update tasks for ARQ worker.

This module contains background tasks for system updates that are executed by an external worker with Docker socket
access.
"""
import asyncio
import json
import logging
import os
import subprocess
from typing import Any

from arq.worker import Worker

logger = logging.getLogger(__name__)


async def process_system_update(
    ctx: Worker,
    compose_file: str,
    create_backup: bool = True,
    run_migrations: bool = True,
) -> dict[str, Any]:
    """Process system update task.

    This task is executed by an external worker that has access to the Docker socket.
    The task performs:
    1. Docker login to GHCR (if GITHUB_TOKEN is available)
    2. Pull new images
    3. Update containers
    4. Run database migrations (if requested)

    Parameters
    ----------
    ctx : Worker
        ARQ worker context
    compose_file : str
        Path to docker-compose file
    create_backup : bool
        Whether to create a backup before updating (not implemented yet)
    run_migrations : bool
        Whether to run database migrations after updating containers

    Returns
    -------
    dict[str, Any]
        Result dictionary with status and message
    """
    logger.info(
        f"Starting system update: compose_file={compose_file}, "
        f"create_backup={create_backup}, run_migrations={run_migrations}"
    )

    try:
        # Step 1: Authenticate with GHCR
        github_token = os.getenv("GITHUB_TOKEN")
        if github_token:
            logger.info("Authenticating with GHCR...")
            login_result = subprocess.run(
                ["docker", "login", "ghcr.io", "-u", "xzeggaedu", "--password-stdin"],
                input=github_token,
                text=True,
                capture_output=True,
                timeout=30,
                check=False,
            )
            if login_result.returncode != 0:
                logger.warning(f"GHCR login failed: {login_result.stderr}")
            else:
                logger.info("GHCR authentication successful")

        # Step 2: Pull new images
        logger.info("Pulling new images...")
        subprocess.run(
            ["docker", "compose", "-f", compose_file, "pull"],
            capture_output=True,
            text=True,
            timeout=600,
            check=True,
        )
        logger.info("Images pulled successfully")

        # Step 3: Update containers
        logger.info("Updating containers...")
        subprocess.run(
            ["docker", "compose", "-f", compose_file, "up", "-d"],
            capture_output=True,
            text=True,
            timeout=300,
            check=True,
        )
        logger.info("Containers updated successfully")

        # Step 4: Wait for containers to be ready and run migrations
        if run_migrations:
            logger.info("Waiting for containers to be ready...")
            containers_ready = await wait_for_containers_ready(compose_file, max_retries=30, delay=5)

            if not containers_ready:
                raise Exception(
                    "Containers did not become ready within the timeout period (2.5 minutes). "
                    "Please check container status manually."
                )

            logger.info("Running database migrations...")
            subprocess.run(
                [
                    "docker",
                    "compose",
                    "-f",
                    compose_file,
                    "exec",
                    "-T",
                    "api",
                    "alembic",
                    "upgrade",
                    "head",
                ],
                capture_output=True,
                text=True,
                timeout=300,
                check=True,
            )
            logger.info("Database migrations completed successfully")

        result = {
            "status": "completed",
            "message": "Update completed successfully",
            "compose_file": compose_file,
            "create_backup": create_backup,
            "run_migrations": run_migrations,
        }
        logger.info("System update completed successfully")
        return result

    except subprocess.CalledProcessError as e:
        error_msg = f"Update failed: {e.stderr if e.stderr else str(e)}"
        logger.error(error_msg)
        return {
            "status": "failed",
            "message": error_msg,
            "compose_file": compose_file,
            "create_backup": create_backup,
            "run_migrations": run_migrations,
            "error": str(e),
        }
    except Exception as e:
        error_msg = f"Update failed: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return {
            "status": "failed",
            "message": error_msg,
            "compose_file": compose_file,
            "create_backup": create_backup,
            "run_migrations": run_migrations,
            "error": str(e),
        }


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
    critical_containers = ["db", "api"]

    for attempt in range(1, max_retries + 1):
        try:
            result = subprocess.run(
                ["docker", "compose", "-f", compose_file, "ps", "--format", "json"],
                capture_output=True,
                text=True,
                timeout=10,
            )

            if result.returncode != 0:
                logger.warning(f"Failed to get container status (attempt {attempt}/{max_retries})")
                await asyncio.sleep(delay)
                continue

            # Parse JSON (may have multiple lines, one per container)
            containers = []
            for line in result.stdout.strip().split("\n"):
                if line.strip():
                    try:
                        containers.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue

            # Check that critical containers are running
            all_ready = True
            for container_name in critical_containers:
                container = next((c for c in containers if c.get("Service") == container_name), None)

                if not container:
                    all_ready = False
                    logger.warning(f"Container {container_name} not found (attempt {attempt}/{max_retries})")
                    break

                state = container.get("State", "").lower()
                if state != "running":
                    all_ready = False
                    logger.warning(
                        f"Container {container_name} not running (state: {state}, attempt {attempt}/{max_retries})"
                    )
                    break

            if all_ready:
                logger.info("All critical containers are ready")
                return True

            # If not ready, wait and retry
            await asyncio.sleep(delay)

        except Exception as e:
            logger.warning(f"Error waiting for containers (attempt {attempt}/{max_retries}): {e}")
            await asyncio.sleep(delay)
            continue

    logger.error("Containers did not become ready within the timeout period")
    return False
