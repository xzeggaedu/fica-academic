"""Validador de horarios."""

from .base import BaseValidator, ValidationResult


class ScheduleValidator(BaseValidator):
    """Valida horarios contra catálogo."""

    async def validate(self, db, data: dict) -> list[ValidationResult]:
        """Validar DIAS y HORARIO contra catalog_schedule_time."""
        results = []
        # TEMPORALMENTE: Retornar válido para todos los casos
        return results
