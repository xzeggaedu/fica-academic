from typing import Annotated, Any

from arq.jobs import Job as ArqJob
from fastapi import APIRouter, Depends, HTTPException

from ...api.dependencies import get_current_superuser
from ...core.utils import queue
from ...schemas.job import Job

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("/task", response_model=Job, status_code=201)
async def create_task(
    message: str,
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> dict[str, str]:
    """Create a new background task.

    Parameters
    ----------
    message: str
        The message or data to be processed by the task.
    current_user: dict
        Current authenticated admin user.

    Returns
    -------
    dict[str, str]
        A dictionary containing the ID of the created task.
    """
    if queue.pool is None:
        raise HTTPException(status_code=503, detail="Queue is not available")

    job = await queue.pool.enqueue_job("sample_background_task", message)
    if job is None:
        raise HTTPException(status_code=500, detail="Failed to create task")

    return {"id": job.job_id}


@router.get("/task/{task_id}")
async def get_task(
    task_id: str,
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> dict[str, Any] | None:
    """Get information about a specific background task.

    Parameters
    ----------
    task_id: str
        The ID of the task.
    current_user: dict
        Current authenticated admin user.

    Returns
    -------
    Optional[dict[str, Any]]
        A dictionary containing information about the task if found, or None otherwise.
    """
    if queue.pool is None:
        raise HTTPException(status_code=503, detail="Queue is not available")

    job = ArqJob(task_id, queue.pool)
    job_info = await job.info()
    if job_info is None:
        return None

    return job_info.__dict__
