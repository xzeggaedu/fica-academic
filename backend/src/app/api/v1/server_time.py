"""Server time endpoint for UTC time synchronization."""

from datetime import datetime

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def get_server_time():
    """Get current server time in UTC."""
    return {"server_time_utc": datetime.utcnow().isoformat(), "timestamp": datetime.utcnow().timestamp()}
