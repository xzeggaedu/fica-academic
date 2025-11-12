"""Normalizador para el campo HORARIO (rango horario).

Objetivo: devolver siempre formato 24h "HH:MM-HH:MM" sin espacios.

Ejemplos válidos de salida:
- 08:00-09:30
- 17:30-20:30

Soporta entradas como:
- "8:00 - 9:30 am" → 08:00-09:30
- "5:30pm-8:30 pm" → 17:30-20:30
- "06:00 a 07:20" → 06:00-07:20
- "06.00-07.20" → 06:00-07:20
"""

from __future__ import annotations

import re
from typing import Any

from .base import NormalizerContext

_TIME_TOKEN_RE = re.compile(
    r"\b(\d{1,2})[:\.]?(\d{2})?\s*(am|pm|a\.m\.|p\.m\.|AM|PM)?\b",
    re.IGNORECASE,
)

_RANGE_SEP_RE = re.compile(r"\s*(?:-|–|a|to|hasta|\s+)\s*", re.IGNORECASE)


def _to_24h(hour_str: str, minute_str: str | None, ampm: str | None) -> tuple[int, int] | None:
    try:
        h = int(hour_str)
        m = int(minute_str) if minute_str is not None else 0
    except ValueError:
        return None
    if not (0 <= h <= 23) or not (0 <= m <= 59):
        # Permitiremos 12h si hay am/pm; si no, validamos como 0-23
        if ampm is None:
            return None
    if ampm:
        amp = ampm.lower()
        if amp in ("pm", "p.m.") and h != 12:
            h += 12
        if amp in ("am", "a.m.") and h == 12:
            h = 0
    # Si no hay am/pm y h==24 no es válido
    if ampm is None and h == 24:
        return None
    return h, m


def _fmt(h: int, m: int) -> str:
    return f"{h:02d}:{m:02d}"


def _extract_first_two_times(text: str) -> list[tuple[int, int]]:
    # Buscar tokens de tiempo en el orden de la cadena
    times: list[tuple[int, int]] = []
    for match in _TIME_TOKEN_RE.finditer(text):
        h, m = _to_24h(match.group(1), match.group(2), match.group(3)) or (None, None)
        if h is None:
            continue
        times.append((h, m))
        if len(times) == 2:
            break
    return times


def normalize_schedule(value: Any, *, ctx: NormalizerContext | None = None) -> str:
    original = "" if value is None else str(value).strip()
    if not original:
        return ""

    # Si ya viene en formato correcto HH:MM-HH:MM, no tocar
    if re.fullmatch(r"\d{2}:\d{2}-\d{2}:\d{2}", original):
        return original

    text = original
    # Uniformar separadores a espacios para facilitar tokenización
    text = _RANGE_SEP_RE.sub(" - ", text)

    times = _extract_first_two_times(text)
    if len(times) != 2:
        # Intento alterno: dividir por guion y parsear cada lado
        parts = re.split(r"\s*[-–]\s*", original)
        if len(parts) == 2:
            left = _extract_first_two_times(parts[0])
            right = _extract_first_two_times(parts[1])
            if left and right:
                times = [left[0], right[0]]

    if len(times) != 2:
        # No se pudo normalizar
        return ""

    start, end = times[0], times[1]
    result = f"{_fmt(*start)}-{_fmt(*end)}"

    if ctx is not None and hasattr(ctx, "changes") and result != original:
        ctx.changes.append(
            {
                "field": "HORARIO",
                "from": original,
                "to": result,
                "reason": "normalized_schedule",
            }
        )

    return result


__all__ = ["normalize_schedule"]
