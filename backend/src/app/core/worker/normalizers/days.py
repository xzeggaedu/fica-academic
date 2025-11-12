"""Normalizador para el campo DIAS.

Salida esperada: combinaciones separadas por guión con 2 letras e inicial en
mayúscula, orden y duplicados preservados en la medida de lo posible.

Ejemplos:
- "Lunes-Miercoles-Viernes" → "Lu-Mi-Vi"
- "Lu/Ma/Mi" → "Lu-Ma-Mi"
- "sab, dom" → "Sa-Do"
"""

from __future__ import annotations

import re
from typing import Any

from .base import NormalizerContext

_DAY_MAP = {
    # Lunes
    "l": "Lu",
    "lu": "Lu",
    "lun": "Lu",
    "lunes": "Lu",
    # Martes
    "ma": "Ma",
    "mar": "Ma",
    "martes": "Ma",
    # Miércoles
    "mi": "Mi",
    "mie": "Mi",
    "mié": "Mi",
    "miercoles": "Mi",
    "miércoles": "Mi",
    # Jueves
    "j": "Ju",
    "ju": "Ju",
    "jue": "Ju",
    "jueves": "Ju",
    # Viernes
    "v": "Vi",
    "vi": "Vi",
    "vie": "Vi",
    "viernes": "Vi",
    # Sábado
    "s": "Sa",
    "sa": "Sa",
    "sab": "Sa",
    "sáb": "Sa",
    "sabado": "Sa",
    "sábado": "Sa",
    # Domingo
    "d": "Do",
    "do": "Do",
    "dom": "Do",
    "domingo": "Do",
}


_SPLIT_RE = re.compile(r"[^A-Za-zÁÉÍÓÚáéíóúÑñ]+")


def normalize_days(value: Any, *, ctx: NormalizerContext | None = None) -> str:
    """Normaliza cadenas de días a formato 'Lu-Ma-...'.

    Reglas:
    - Divide por cualquier separador no alfabético (espacio, coma, slash, guión múltiple, etc.)
    - Normaliza cada token a 2 letras con la primera mayúscula según _DAY_MAP
    - Deduplica preservando el orden de aparición
    - Ignora tokens vacíos o no mapeables
    - Si no hay tokens válidos, retorna ""
    - Si ctx.changes está disponible y el valor cambia, registra el ajuste
    """
    text = "" if value is None else str(value).strip()
    if not text:
        return ""

    # Tokenizar por separadores no alfabéticos
    raw_tokens = [t for t in _SPLIT_RE.split(text) if t]

    normalized: list[str] = []
    seen = set()
    for token in raw_tokens:
        key = token.lower().strip()
        # Tomar primeras 3 letras cuando sea razonable para mejorar mapeo (e.g., "Jue")
        key3 = key[:3]
        mapped = _DAY_MAP.get(key) or _DAY_MAP.get(key3) or _DAY_MAP.get(key[:2])
        if not mapped:
            continue
        if mapped in seen:
            continue
        seen.add(mapped)
        normalized.append(mapped)

    result = "-".join(normalized)

    if ctx is not None and hasattr(ctx, "changes") and result != text:
        ctx.changes.append(
            {
                "field": "DIAS",
                "from": text,
                "to": result,
                "reason": "normalized_days",
            }
        )

    return result


# Export default
__all__ = ["normalize_days"]
