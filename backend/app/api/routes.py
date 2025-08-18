"""API routes for the FICA Academic API."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health", tags=["system"])
def health_check():
    """Check that the API is running correctly."""
    return {"status": "ok", "message": "API is running"}
