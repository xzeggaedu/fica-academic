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


def normalize_days_string(days: str) -> str:
    """Normalizar días usando primeras 2 letras en lowercase.

    Args:
        days: String como "Ma-Jue" o "Lu-Vie-Sab"

    Returns:
        String normalizado como "Ma-Ju" o "Lu-Vi-Sa"
    """
    day_map = {
        "lu": "Lu",
        "ma": "Ma",
        "mi": "Mi",
        "ju": "Ju",
        "vi": "Vi",
        "sa": "Sa",
        "do": "Do",
    }

    parts = days.split("-")
    normalized_parts = []

    for part in parts:
        part_clean = part.strip()[:2].lower()
        if part_clean in day_map:
            normalized_parts.append(day_map[part_clean])

    return "-".join(normalized_parts)


def normalize_academic_title(title: str) -> tuple[str, bool]:
    """Normaliza título académico y retorna (titulo_normalizado, encontrado_en_mapeo).

    Mapea variaciones comunes:
    - Ing/Ing./|ng.multis -> Ing.
    - Lic/Lic./Licda/Licdo -> Lic.
    - Dr/Dr./Dr/Doctor -> Dr.
    - Arq/Arq./Arq/Arquitecto -> Arq.
    - Tec/Tecível/Tech/Técnico -> Tec.

    Returns:
        Tuple de (titulo_normalizado, fue_mapeado)
    """
    if not title or not str(title).strip():
        return ("", False)

    title_clean = str(title).lower().strip()

    # Mapeo de variaciones comunes
    title_mappings = {
        "ing": "Ing.",
        "ing.": "Ing.",
        "|ng": "Ing.",
        "ing ": "Ing.",
        "ingeniero": "Ing.",
        "ingniero": "Ing.",
        "lic": "Lic.",
        "lic.": "Lic.",
        "licda": "Lic.",
        "licdo": "Lic.",
        "licenciado": "Lic.",
        "licda.": "Lic.",
        "licdo.": "Lic.",
        "dr": "Dr.",
        "dr.": "Dr.",
        "dtr": "Dr.",
        "doctor": "Dr.",
        "doctora": "Dr.",
        "arq": "Arq.",
        "arq.": "Arq.",
        "arq ": "Arq.",
        "arquitecto": "Arq.",
        "arquitecta": "Arq.",
        "tec": "Tec.",
        "tec.": "Tec.",
        "tech": "Tec.",
        "técnico": "Tec.",
        "técnica": "Tec.",
    }

    # Buscar en mapeo
    if title_clean in title_mappings:
        return (title_mappings[title_clean], True)

    # Si no está en mapeo exacto, devolver original
    return (str(title).strip(), False)


def calculate_similarity(str1: str, str2: str) -> float:
    """Calcula similitud entre dos strings (0-1)."""
    return SequenceMatcher(None, str1.lower().strip(), str2.lower().strip()).ratio()
