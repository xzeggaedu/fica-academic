"""Normalizador para el campo TITULO (professor_academic_title).

Regla: mapear variaciones comunes a una forma canónica abreviada:
- Ing/Ing./|ng/Ingeniero → "Ing."
- Lic/Lic./Licda/Licdo/Licenciado → "Lic."
- Dr/Dr./Doctor/Doctora → "Dr."
- Arq/Arq./Arquitecto/Arquitecta → "Arq."
- Tec/Tec./Tech/Técnico/Técnica → "Tec."

Si no se reconoce, retorna el valor original con trim; si está vacío, retorna "".
Registra el ajuste en ctx.changes si hay cambio.
"""

from __future__ import annotations

from typing import Any

from .base import NormalizerContext

_TITLE_MAP = {
    # Ingeniero
    "ing": "Ing.",
    "ing.": "Ing.",
    "|ng": "Ing.",
    "ing ": "Ing.",
    "ingeniero": "Ing.",
    "ingniero": "Ing.",
    # Licenciado
    "lic": "Lic.",
    "lic.": "Lic.",
    "licda": "Lic.",
    "licdo": "Lic.",
    "licenciado": "Lic.",
    "licda.": "Lic.",
    "licdo.": "Lic.",
    # Doctor
    "dr": "Dr.",
    "dr.": "Dr.",
    "dtr": "Dr.",
    "doctor": "Dr.",
    "doctora": "Dr.",
    # Arquitecto
    "arq": "Arq.",
    "arq.": "Arq.",
    "arq ": "Arq.",
    "arquitecto": "Arq.",
    "arquitecta": "Arq.",
    # Técnico
    "tec": "Tec.",
    "tec.": "Tec.",
    "tech": "Tec.",
    "técnico": "Tec.",
    "técnica": "Tec.",
}


def normalize_academic_title(value: Any, *, ctx: NormalizerContext | None = None) -> str:
    original = "" if value is None else str(value).strip()
    if not original:
        return ""

    key = original.lower().strip()
    normalized = _TITLE_MAP.get(key, original)

    if ctx is not None and hasattr(ctx, "changes") and normalized != original:
        ctx.changes.append(
            {
                "field": "TITULO",
                "from": original,
                "to": normalized,
                "reason": "normalized_title",
            }
        )

    return normalized


__all__ = ["normalize_academic_title"]
