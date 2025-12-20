from arq.connections import RedisSettings

from ...core.config import settings
from .academic_load_tasks import process_academic_load_file
from .functions import process_template_generation, sample_background_task, shutdown, startup

REDIS_QUEUE_HOST = settings.REDIS_QUEUE_HOST
REDIS_QUEUE_PORT = settings.REDIS_QUEUE_PORT


class WorkerSettings:
    """Settings for the internal ARQ worker (runs inside Docker container)."""

    functions = [
        sample_background_task,
        process_template_generation,
        process_academic_load_file,
    ]
    redis_settings = RedisSettings(host=REDIS_QUEUE_HOST, port=REDIS_QUEUE_PORT)
    on_startup = startup
    on_shutdown = shutdown
    handle_signals = False
