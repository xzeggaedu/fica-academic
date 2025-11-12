"""Registro central de normalizadores.

Permite registrar y obtener normalizadores por clave.
"""

from __future__ import annotations

from .base import Normalizer, noop

_REGISTRY: dict[str, Normalizer] = {
    "noop": noop,
}


def register(key: str, func: Normalizer) -> None:
    _REGISTRY[key] = func


def get(key: str, default: Normalizer | None = None) -> Normalizer:
    if key in _REGISTRY:
        return _REGISTRY[key]
    if default is not None:
        return default
    return noop


# Alias público para importaciones
normalizers = {
    **_REGISTRY,
}
