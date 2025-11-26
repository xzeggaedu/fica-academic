from arq.connections import RedisSettings

from ...core.config import settings
from .academic_load_tasks import process_academic_load_file
from .functions import process_template_generation, sample_background_task, shutdown, startup
from .system_update_tasks import process_system_update

REDIS_QUEUE_HOST = settings.REDIS_QUEUE_HOST
REDIS_QUEUE_PORT = settings.REDIS_QUEUE_PORT


class WorkerSettings:
    functions = [
        sample_background_task,
        process_template_generation,
        process_academic_load_file,
        process_system_update,  # System update task (executed by external worker)
    ]
    redis_settings = RedisSettings(host=REDIS_QUEUE_HOST, port=REDIS_QUEUE_PORT)
    on_startup = startup
    on_shutdown = shutdown
    handle_signals = False
