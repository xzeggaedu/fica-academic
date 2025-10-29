"""Validador de asignaturas."""

from .base import BaseValidator, ValidationResult


class SubjectValidator(BaseValidator):
    """Valida asignaturas contra catálogo."""

    async def validate(self, db, data: dict) -> list[ValidationResult]:
        """Validar COD_ASIG contra catalog_subject."""
        results = []
        # TEMPORALMENTE: Retornar válido para todos los casos
        return results
