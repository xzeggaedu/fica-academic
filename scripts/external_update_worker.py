#!/usr/bin/env python3
"""External update worker for system updates.

This worker runs on the host (outside Docker containers) and has access to
the Docker socket. It connects to Redis and processes system update tasks
from the ARQ queue.

Usage:
    python scripts/external_update_worker.py

Environment Variables:
    REDIS_QUEUE_HOST: Redis host (default: localhost)
    REDIS_QUEUE_PORT: Redis port (default: 6379)
    GITHUB_TOKEN: GitHub token for GHCR authentication (optional)
    COMPOSE_FILE_PATH: Path to docker-compose.prod.yml (default: ./docker-compose.prod.yml)

The worker will:
1. Connect to Redis using ARQ
2. Process system update tasks from the queue
3. Execute Docker commands to update containers
4. Report results back to the queue
"""
import asyncio
import logging
import os
import sys
from pathlib import Path

# Add backend src to path so we can import the task function
backend_src = Path(__file__).parent.parent / "backend" / "src"
sys.path.insert(0, str(backend_src))

import uvloop  # noqa: E402
from arq.connections import RedisSettings  # noqa: E402
from arq.worker import Worker  # noqa: E402

from app.core.worker.system_update_tasks import process_system_update  # noqa: E402

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("/var/log/fica-external-update-worker.log", mode="a")
        if os.path.exists("/var/log")
        else logging.NullHandler(),
    ],
)

logger = logging.getLogger(__name__)

# Set event loop policy
asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())


async def startup(ctx: Worker) -> None:
    """Called when the worker starts."""
    logger.info("External update worker started")
    logger.info(f"Redis: {ctx.redis_settings.host}:{ctx.redis_settings.port}")
    logger.info("Worker has access to Docker socket (running on host)")


async def shutdown(ctx: Worker) -> None:
    """Called when the worker shuts down."""
    logger.info("External update worker shutting down")


class ExternalUpdateWorkerSettings:
    """Settings for the external update worker."""

    functions = [process_system_update]
    redis_settings = RedisSettings(
        host=os.getenv("REDIS_QUEUE_HOST", "localhost"),
        port=int(os.getenv("REDIS_QUEUE_PORT", "6379")),
    )
    on_startup = startup
    on_shutdown = shutdown
    handle_signals = True
    max_jobs = 1  # Process one update at a time
    job_timeout = 1800  # 30 minutes timeout for update jobs


async def main():
    """Main entry point for the external update worker."""
    logger.info("Starting external update worker...")
    logger.info("This worker runs on the host and has access to Docker socket")

    # Verify Docker is available
    import subprocess

    try:
        result = subprocess.run(
            ["docker", "--version"],
            capture_output=True,
            text=True,
            timeout=5,
            check=True,
        )
        logger.info(f"Docker available: {result.stdout.strip()}")
    except (
        subprocess.CalledProcessError,
        FileNotFoundError,
        subprocess.TimeoutExpired,
    ) as e:
        logger.error(f"Docker is not available: {e}")
        logger.error("This worker requires Docker to be installed and accessible")
        sys.exit(1)

    # Verify docker-compose is available
    for cmd in [["docker", "compose"], ["docker-compose"]]:
        try:
            result = subprocess.run(
                cmd + ["version"], capture_output=True, text=True, timeout=5, check=True
            )
            logger.info(
                f"Docker Compose available: {result.stdout.strip().split(chr(10))[0]}"
            )
            break
        except (
            subprocess.CalledProcessError,
            FileNotFoundError,
            subprocess.TimeoutExpired,
        ):
            continue
    else:
        logger.error("Docker Compose is not available")
        logger.error(
            "This worker requires Docker Compose to be installed and accessible"
        )
        sys.exit(1)

    # Create and run worker
    worker = Worker(
        functions=ExternalUpdateWorkerSettings.functions,
        redis_settings=ExternalUpdateWorkerSettings.redis_settings,
        on_startup=ExternalUpdateWorkerSettings.on_startup,
        on_shutdown=ExternalUpdateWorkerSettings.on_shutdown,
        handle_signals=ExternalUpdateWorkerSettings.handle_signals,
        max_jobs=ExternalUpdateWorkerSettings.max_jobs,
        job_timeout=ExternalUpdateWorkerSettings.job_timeout,
    )

    logger.info("Worker configured, starting...")
    await worker.async_run()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Worker stopped by user")
    except Exception as e:
        logger.error(f"Worker crashed: {e}", exc_info=True)
        sys.exit(1)
