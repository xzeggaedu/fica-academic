import asyncio
import logging

import uvloop
from arq.worker import Worker

asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")


# -------- background tasks --------
async def sample_background_task(ctx: Worker, name: str) -> str:
    await asyncio.sleep(5)
    return f"Task {name} is complete!"


async def process_template_generation(ctx: Worker, template_id: int) -> str:
    """Background task to process template generation."""
    print(f"🔍 FUNCTIONS.PY: Llamando a process_template_generation con template_id: {template_id}")
    from .template_tasks_new import process_template_generation as process_task

    print("🔍 FUNCTIONS.PY: Función importada correctamente")
    result = await process_task(ctx, template_id)
    print(f"🔍 FUNCTIONS.PY: Resultado: {result}")
    return result


# -------- base functions --------
async def startup(ctx: Worker) -> None:
    logging.info("Worker Started")


async def shutdown(ctx: Worker) -> None:
    logging.info("Worker end")
