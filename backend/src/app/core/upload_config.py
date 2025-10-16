"""Configuración para rutas de uploads."""

from pathlib import Path

# Directorio base de uploads
UPLOADS_DIR = Path(__file__).parent.parent.parent / "uploads"

# Rutas específicas
UPLOAD_PATHS = {
    "data": UPLOADS_DIR / "data",
    "schedules": UPLOADS_DIR / "data" / "schedules",
    "users": UPLOADS_DIR / "users",
    "temp": UPLOADS_DIR / "temp",
}

# Extensiones permitidas por tipo
ALLOWED_EXTENSIONS = {
    "schedules": [".csv"],
    "users": [".jpg", ".jpeg", ".png", ".gif", ".pdf", ".doc", ".docx"],
    "temp": [".tmp", ".temp"],
}

# Tamaños máximos por tipo (en bytes)
MAX_FILE_SIZES = {
    "schedules": 10 * 1024 * 1024,  # 10MB
    "users": 5 * 1024 * 1024,  # 5MB
    "temp": 100 * 1024 * 1024,  # 100MB
}


def get_upload_path(category: str, filename: str = None) -> Path:
    """Obtiene la ruta completa para un archivo en una categoría específica.

    Args:
        category: Categoría del archivo (data, schedules, users, temp)
        filename: Nombre del archivo (opcional)

    Returns:
        Path completo del archivo
    """
    base_path = UPLOAD_PATHS.get(category)
    if not base_path:
        raise ValueError(f"Categoría de upload no válida: {category}")

    if filename:
        return base_path / filename

    return base_path


def ensure_upload_dirs():
    """Asegura que todos los directorios de upload existan."""
    for path in UPLOAD_PATHS.values():
        path.mkdir(parents=True, exist_ok=True)
