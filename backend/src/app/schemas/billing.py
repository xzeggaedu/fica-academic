"""Schemas para reporte de facturación."""

from pydantic import BaseModel, Field


class ScheduleBlockResponse(BaseModel):
    """Schema para un bloque de horario único."""

    class_days: str = Field(..., description="Días de la clase (ej: 'Lu-Ma-Mi')")
    class_schedule: str = Field(..., description="Horario de la clase (ej: '08:00-09:30')")
    class_duration: int = Field(..., description="Duración de la clase en minutos")

    class Config:
        from_attributes = True
