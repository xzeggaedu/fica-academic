"""Schemas para reporte de facturación."""

from decimal import Decimal

from pydantic import BaseModel, Field


class ScheduleBlockResponse(BaseModel):
    """Schema para un bloque de horario único."""

    class_days: str = Field(..., description="Días de la clase (ej: 'Lu-Ma-Mi')")
    class_schedule: str = Field(..., description="Horario de la clase (ej: '08:00-09:30')")
    class_duration: int = Field(..., description="Duración de la clase en minutos")

    class Config:
        from_attributes = True


class PaymentRateByLevel(BaseModel):
    """Schema para tasas de pago agrupadas por nivel académico."""

    grado: Decimal = Field(default=0.0, description="Suma de tasas de pago para Grado Base")
    maestria_1: Decimal = Field(default=0.0, description="Suma de tasas de pago para 1 Maestría")
    maestria_2: Decimal = Field(default=0.0, description="Suma de tasas de pago para 2 o más Maestrías")
    doctor: Decimal = Field(default=0.0, description="Suma de tasas de pago para Doctor")
    bilingue: Decimal = Field(default=0.0, description="Suma de tasas de pago para Bilingüe")


class PaymentSummaryByBlock(BaseModel):
    """Schema para resumen de tasas de pago por bloque de horario."""

    class_days: str = Field(..., description="Días de la clase")
    class_schedule: str = Field(..., description="Horario de la clase")
    class_duration: int = Field(..., description="Duración en minutos")
    payment_rates_by_level: PaymentRateByLevel = Field(..., description="Tasas de pago por nivel académico")

    class Config:
        from_attributes = True


class MonthlyBudgetItem(BaseModel):
    """Schema para presupuesto mensual de un bloque de horario."""

    year: int = Field(..., description="Año del mes")
    month: int = Field(..., description="Número del mes (1-12)")
    month_name: str = Field(..., description="Nombre del mes")
    sessions: int = Field(..., description="Número de sesiones de clase")
    real_time_minutes: int = Field(..., description="Tiempo real en minutos")
    total_class_hours: Decimal = Field(..., description="Total de horas clase")
    total_dollars: Decimal = Field(..., description="Total en dólares")


class MonthlyBudgetByBlock(BaseModel):
    """Schema para presupuesto mensual por bloque de horario."""

    class_days: str = Field(..., description="Días de la clase")
    class_schedule: str = Field(..., description="Horario de la clase")
    class_duration: int = Field(..., description="Duración en minutos")
    months: list[MonthlyBudgetItem] = Field(..., description="Lista de presupuestos por mes")

    class Config:
        from_attributes = True
