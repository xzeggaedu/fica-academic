"""Base para validadores de carga académica."""

from dataclasses import dataclass
from datetime import time
from difflib import SequenceMatcher
from enum import Enum
from typing import Any


class ValidationLevel(Enum):
    """Niveles de validación."""

    ERROR = "error"  # Bloquea la ingestión
    WARNING = "warning"  # Permite pero reporta
    INFO = "info"  # Solo informa


@dataclass
class ValidationResult:
    """Resultado de una validación."""

    level: ValidationLevel
    message: str
    field: str | None = None
    expected: Any | None = None
    actual: Any | None = None


class BaseValidator:
    """Clase base para todos los validadores."""

    def __init__(self, strict_mode: bool = False):
        self.strict_mode = strict_mode

    async def validate(self, db, data: dict) -> list[ValidationResult]:
        """Ejecutar validación."""
        raise NotImplementedError


def parse_time_string(time_str: str) -> time:
    """Parse tiempo del Excel (ej: "13:00")."""
    try:
        hour, minute = map(int, time_str.split(":"))
        return time(hour, minute)
    except (ValueError, AttributeError):
        return None


## Nota: normalización de títulos movida a normalizers/titles.py


def calculate_similarity(str1: str, str2: str) -> float:
    """Calcula similitud entre dos strings (0-1)."""
    return SequenceMatcher(None, str1.lower().strip(), str2.lower().strip()).ratio()
