from fastapi import APIRouter

router = APIRouter()


@router.get("/health", tags=["system"])
def health_check():
    """Verifica que la API esté corriendo correctamente"""
    return {"status": "ok", "message": "API funcionando"}
