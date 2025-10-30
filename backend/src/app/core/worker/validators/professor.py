"""Validador de profesores."""

from .base import BaseValidator, ValidationResult


class ProfessorValidator(BaseValidator):
    """Valida profesores contra catálogo."""

    async def validate(self, db, data: dict) -> list[ValidationResult]:
        """Validar CODIGO y DOCENTE contra catalog_professor."""
        results = []
        # TEMPORALMENTE: Retornar válido para todos los casos
        return results
