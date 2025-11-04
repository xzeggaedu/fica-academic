"""Schemas Pydantic para BillingReport."""

from __future__ import annotations

import uuid as uuid_pkg
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from pydantic import BaseModel, Field

if TYPE_CHECKING:
    pass

# --------------------------------------------------------------------------------
# Schemas para PaymentSummary (resumen de tasas por nivel)
# --------------------------------------------------------------------------------


class PaymentSummaryBase(BaseModel):
    """Schema base para resumen de tasas de pago."""

    class_days: str = Field(..., description="Días de clase (ej: 'Lu-Ma-Mi')")
    class_schedule: str = Field(..., description="Horario de clase (ej: '08:00-09:30')")
    class_duration: int = Field(..., description="Duración de la clase en minutos")
    payment_rate_grado: Decimal = Field(0.0, description="Suma de tasas de pago para nivel Grado")
    payment_rate_maestria_1: Decimal = Field(0.0, description="Suma de tasas de pago para nivel 1 Maestría")
    payment_rate_maestria_2: Decimal = Field(0.0, description="Suma de tasas de pago para nivel 2 Maestrías")
    payment_rate_doctor: Decimal = Field(0.0, description="Suma de tasas de pago para nivel Doctor")
    payment_rate_bilingue: Decimal = Field(0.0, description="Suma de tasas de pago para nivel Bilingüe")


class PaymentSummaryCreate(PaymentSummaryBase):
    """Schema para crear un resumen de tasas de pago."""

    pass


class PaymentSummaryUpdate(BaseModel):
    """Schema para actualizar tasas de pago (solo valores editables)."""

    payment_rate_grado: Decimal | None = Field(None, description="Suma de tasas de pago para nivel Grado")
    payment_rate_maestria_1: Decimal | None = Field(None, description="Suma de tasas de pago para nivel 1 Maestría")
    payment_rate_maestria_2: Decimal | None = Field(None, description="Suma de tasas de pago para nivel 2 Maestrías")
    payment_rate_doctor: Decimal | None = Field(None, description="Suma de tasas de pago para nivel Doctor")
    payment_rate_bilingue: Decimal | None = Field(None, description="Suma de tasas de pago para nivel Bilingüe")


class PaymentSummaryResponse(PaymentSummaryBase):
    """Schema de respuesta para resumen de tasas de pago."""

    id: int = Field(..., description="ID único del resumen")
    billing_report_id: int = Field(..., description="ID del reporte padre")

    class Config:
        from_attributes = True


# --------------------------------------------------------------------------------
# Schemas para MonthlyItem (items mensuales)
# --------------------------------------------------------------------------------


class MonthlyItemBase(BaseModel):
    """Schema base para item mensual."""

    class_days: str = Field(..., description="Días de clase (ej: 'Lu-Ma-Mi')")
    class_schedule: str = Field(..., description="Horario de clase (ej: '08:00-09:30')")
    class_duration: int = Field(..., description="Duración de la clase en minutos")
    year: int = Field(..., description="Año del item")
    month: int = Field(..., description="Mes del item (1-12)")
    month_name: str = Field(..., description="Nombre del mes en español")
    sessions: int = Field(..., description="Número de sesiones calculadas")
    real_time_minutes: int = Field(..., description="Tiempo real en minutos")
    total_class_hours: Decimal = Field(..., description="Total de horas clase")
    total_dollars: Decimal = Field(..., description="Total en dólares calculado")


class MonthlyItemCreate(MonthlyItemBase):
    """Schema para crear un item mensual."""

    pass


class MonthlyItemUpdate(BaseModel):
    """Schema para actualizar item mensual (solo valores editables)."""

    sessions: int | None = Field(None, description="Número de sesiones calculadas")
    real_time_minutes: int | None = Field(None, description="Tiempo real en minutos")
    total_class_hours: Decimal | None = Field(None, description="Total de horas clase")
    total_dollars: Decimal | None = Field(None, description="Total en dólares calculado")


class MonthlyItemResponse(MonthlyItemBase):
    """Schema de respuesta para item mensual."""

    id: int = Field(..., description="ID único del item")
    billing_report_id: int = Field(..., description="ID del reporte padre")

    class Config:
        from_attributes = True


# --------------------------------------------------------------------------------
# Schemas para BillingReport (reporte principal)
# --------------------------------------------------------------------------------


class BillingReportBase(BaseModel):
    """Schema base para reporte de facturación."""

    academic_load_file_id: int = Field(..., description="ID de la carga académica fuente")
    notes: str | None = Field(None, description="Notas adicionales sobre el reporte")


class BillingReportCreate(BillingReportBase):
    """Schema para crear un reporte de facturación."""

    # Al crear, se incluyen los items hijos
    payment_summaries: list[PaymentSummaryCreate] = Field(
        default_factory=list, description="Resúmenes de tasas de pago"
    )
    monthly_items: list[MonthlyItemCreate] = Field(default_factory=list, description="Items mensuales")
    rate_snapshots: list[RateSnapshotCreate] = Field(default_factory=list, description="Snapshots de tarifas usadas")


class BillingReportUpdate(BaseModel):
    """Schema para actualizar un reporte de facturación."""

    notes: str | None = Field(None, description="Notas adicionales sobre el reporte")
    # Al actualizar, se incluyen los items actualizados
    payment_summaries: list[PaymentSummaryUpdate] | None = Field(
        None, description="Resúmenes de tasas de pago actualizados"
    )
    monthly_items: list[MonthlyItemUpdate] | None = Field(None, description="Items mensuales actualizados")


class BillingReportResponse(BillingReportBase):
    """Schema de respuesta para reporte de facturación."""

    id: int = Field(..., description="ID único del reporte")
    user_id: uuid_pkg.UUID = Field(..., description="UUID del usuario que generó el reporte")
    user_name: str = Field(..., description="Nombre del usuario que generó (snapshot)")
    is_edited: bool = Field(..., description="Si el reporte ha sido editado manualmente")
    created_at: datetime = Field(..., description="Fecha de creación del reporte")
    updated_at: datetime | None = Field(None, description="Fecha de última actualización")
    payment_summaries: list[PaymentSummaryResponse] = Field(
        default_factory=list, description="Resúmenes de tasas de pago"
    )
    monthly_items: list[MonthlyItemResponse] = Field(default_factory=list, description="Items mensuales")
    rate_snapshots: list[RateSnapshotResponse] = Field(
        default_factory=list, description="Snapshots de tarifas usadas en el cálculo"
    )
    term_term: int | None = Field(None, description="Número del ciclo (ej: 1, 2, 3)")
    term_year: int | None = Field(None, description="Año del ciclo académico (ej: 2025)")
    faculty_name: str | None = Field(None, description="Nombre de la facultad")
    school_name: str | None = Field(None, description="Nombre de la escuela")

    class Config:
        from_attributes = True


class BillingReportListItem(BaseModel):
    """Schema simplificado para listar reportes."""

    id: int = Field(..., description="ID único del reporte")
    academic_load_file_id: int = Field(..., description="ID de la carga académica fuente")
    user_name: str = Field(..., description="Nombre del usuario que generó")
    is_edited: bool = Field(..., description="Si el reporte ha sido editado")
    created_at: datetime = Field(..., description="Fecha de creación")
    updated_at: datetime | None = Field(None, description="Fecha de última actualización")

    class Config:
        from_attributes = True


class ConsolidatedBillingReportResponse(BillingReportResponse):
    """Schema para reporte consolidado.

    Usa el mismo formato que BillingReportResponse pero representa datos consolidados de múltiples cargas académicas.
    """

    consolidated_from_file_ids: list[int] = Field(
        default_factory=list, description="IDs de las cargas académicas consolidadas"
    )
    school_acronyms: list[str] = Field(default_factory=list, description="Acrónimos de las escuelas consolidadas")


# --------------------------------------------------------------------------------
# Schemas para RateSnapshot (snapshot inmutable de tarifas)
# --------------------------------------------------------------------------------


class RateSnapshotBase(BaseModel):
    """Schema base para snapshot de tarifa."""

    academic_level_id: int = Field(..., description="ID del nivel académico")
    academic_level_code: str = Field(..., description="Código del nivel académico")
    academic_level_name: str = Field(..., description="Nombre del nivel académico")
    rate_per_hour: Decimal = Field(..., description="Tarifa por hora clase usada en el cálculo")
    reference_date: date = Field(..., description="Fecha de referencia para la tarifa")


class RateSnapshotCreate(RateSnapshotBase):
    """Schema para crear un snapshot de tarifa."""

    pass


class RateSnapshotResponse(RateSnapshotBase):
    """Schema de respuesta para snapshot de tarifa."""

    id: int = Field(..., description="ID único del snapshot")
    billing_report_id: int = Field(..., description="ID del reporte padre")
    created_at: datetime = Field(..., description="Fecha de creación del snapshot")

    class Config:
        from_attributes = True
