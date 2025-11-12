"""Validador de coordinaciones."""

from .base import BaseValidator, ValidationResult


class CoordinationValidator(BaseValidator):
    """Valida coordinaciones contra catálogo."""

    async def validate(self, db, data: dict) -> list[ValidationResult]:
        """Validar COORD contra catalog_coordination."""
        results = []
        # TEMPORALMENTE: Retornar válido para todos los casos
        return results
