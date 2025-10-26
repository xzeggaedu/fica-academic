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


async def process_template_generation(ctx: Worker, template_id: int) -> dict:
    """Background task to process template generation."""
    import traceback

    try:
        print(f"🔍 FUNCTIONS.PY: Llamando a process_template_generation con template_id: {template_id}")

        from .template_tasks_new import process_template_generation as process_task_new

        print("🔍 FUNCTIONS.PY: Función importada correctamente")
        result = await process_task_new(ctx, template_id)
        print(f"🔍 FUNCTIONS.PY: Resultado: {result}")
        return result
    except Exception as e:
        error_traceback = traceback.format_exc()
        print(f"❌ ERROR EN FUNCTIONS.PY: {str(e)}")
        print(f"❌ TRACEBACK: {error_traceback}")
        return {
            "error": str(e),
            "template_id": template_id,
            "message": "Error en process_template_generation (functions.py)",
            "traceback": error_traceback,
        }


# -------- base functions --------
async def startup(ctx: Worker) -> None:
    logging.info("Worker Started")


async def shutdown(ctx: Worker) -> None:
    logging.info("Worker end")
