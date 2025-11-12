"""Normalizers package.

Coloca aquí funciones y clases para normalizar valores provenientes del Excel
antes de validarlos o guardarlos (títulos académicos, días, horarios, nombres,
booleanos, etc.).

Estructura sugerida:
- base.py          → Tipos y utilidades comunes
- registry.py      → Registro central de normalizadores por nombre/uso
- strings.py       → Normalizadores de cadenas (trim, spaces, upper, etc.)
- titles.py        → Normalización de títulos académicos
- days.py          → Normalización de días (Lu-Ma-Mi-Ju-Vi-Sa-Do)
- booleans.py      → Conversión de valores tipo Sí/No, 1/0 a bool
- schedules.py     → Parseo de horarios
"""

from .base import Normalizer, NormalizerContext
from .days import normalize_days
from .registry import get, normalizers, register
from .schedules import normalize_schedule
from .titles import normalize_academic_title

__all__ = [
    "Normalizer",
    "NormalizerContext",
    "normalizers",
    "register",
    "get",
    "normalize_days",
    "normalize_academic_title",
    "normalize_schedule",
]
