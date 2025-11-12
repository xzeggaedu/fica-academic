"""Tipos base para normalizadores."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol


@dataclass
class NormalizerContext:
    """Contexto opcional para normalizadores.

    changes: lista de ajustes no-erróneos aplicados por normalizadores,
    útil para auditar transformaciones (se enviará en validator_errors).
    """

    strict_mode: bool = False
    changes: list[dict[str, Any]] = field(default_factory=list)


class Normalizer(Protocol):
    def __call__(self, value: Any, *, ctx: NormalizerContext | None = None) -> Any:  # pragma: no cover
        ...


def noop(value: Any, *, ctx: NormalizerContext | None = None) -> Any:
    """No-op normalizer (retorna el valor sin cambios)."""
    return value
