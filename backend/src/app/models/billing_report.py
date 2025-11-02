"""Modelo de BillingReport para almacenar reportes de facturación generados."""

from __future__ import annotations

import uuid as uuid_pkg
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from ..core.db.database import Base

if TYPE_CHECKING:
    from .academic_load_file import AcademicLoadFile
    from .user import User


class BillingReport(Base):
    """Modelo para reportes de facturación generados (snapshot editable).

    Este modelo almacena los reportes de facturación generados a partir de una carga académica.
    Inicialmente se genera como un snapshot inmutable de los datos calculados, pero después
    puede ser editado para realizar ajustes manuales.

    Attributes
    ----------
    id: Identificador único
    academic_load_file_id: Referencia a la carga académica fuente
    user_id: Usuario que generó el reporte
    user_name: Nombre del usuario que generó (snapshot)
    is_edited: Si el reporte ha sido editado manualmente
    notes: Notas adicionales sobre el reporte
    """

    __tablename__ = "billing_reports"

    # Información del usuario
    user_id: Mapped[uuid_pkg.UUID] = mapped_column(ForeignKey("user.uuid"), nullable=False)
    user_name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Referencia a la carga académica
    academic_load_file_id: Mapped[int] = mapped_column(
        ForeignKey("academic_load_files.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Estado y metadatos
    is_edited: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, onupdate=func.now())

    # Clave Primaria
    id: Mapped[int | None] = mapped_column(autoincrement=True, primary_key=True, default=None)

    # Relaciones
    user: Mapped[User] = relationship("User", init=False)
    academic_load_file: Mapped[AcademicLoadFile] = relationship("AcademicLoadFile", init=False)

    # Relaciones con tablas hijas
    payment_summaries: Mapped[list[BillingReportPaymentSummary]] = relationship(
        "BillingReportPaymentSummary", back_populates="billing_report", cascade="all, delete-orphan", init=False
    )
    monthly_items: Mapped[list[BillingReportMonthlyItem]] = relationship(
        "BillingReportMonthlyItem", back_populates="billing_report", cascade="all, delete-orphan", init=False
    )

    def __repr__(self):
        return (
            f"<BillingReport(id={self.id}, academic_load_file_id={self.academic_load_file_id}, "
            f"is_edited={self.is_edited})>"
        )


class BillingReportPaymentSummary(Base):
    """Modelo para resumen de tasas de pago por nivel académico (editable).

    Este modelo almacena el resumen de tasas de pago agrupadas por nivel académico
    para cada bloque de horario único. Los valores inicialmente se calculan desde
    la carga académica, pero pueden ser editados manualmente.

    Attributes
    ----------
    id: Identificador único
    billing_report_id: Referencia al reporte padre
    class_days: Días de clase (ej: "Lu-Ma-Mi")
    class_schedule: Horario de clase (ej: "08:00-09:30")
    class_duration: Duración de la clase en minutos
    payment_rate_grado: Suma de tasas de pago para nivel Grado
    payment_rate_maestria_1: Suma de tasas de pago para nivel 1 Maestría
    payment_rate_maestria_2: Suma de tasas de pago para nivel 2 Maestrías
    payment_rate_doctor: Suma de tasas de pago para nivel Doctor
    payment_rate_bilingue: Suma de tasas de pago para nivel Bilingüe
    """

    __tablename__ = "billing_report_payment_summaries"

    # Referencia al reporte padre
    billing_report_id: Mapped[int] = mapped_column(
        ForeignKey("billing_reports.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Identificación del bloque de horario
    class_days: Mapped[str] = mapped_column(String(255), nullable=False)
    class_schedule: Mapped[str] = mapped_column(String(255), nullable=False)
    class_duration: Mapped[int] = mapped_column(Integer, nullable=False)

    # Tasas de pago por nivel (inicialmente calculadas, editables)
    payment_rate_grado: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0.0, nullable=False)
    payment_rate_maestria_1: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0.0, nullable=False)
    payment_rate_maestria_2: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0.0, nullable=False)
    payment_rate_doctor: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0.0, nullable=False)
    payment_rate_bilingue: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0.0, nullable=False)

    # Clave Primaria
    id: Mapped[int | None] = mapped_column(autoincrement=True, primary_key=True, default=None)

    # Relaciones
    billing_report: Mapped[BillingReport] = relationship(
        "BillingReport", back_populates="payment_summaries", init=False
    )

    def __repr__(self):
        return (
            f"<BillingReportPaymentSummary(id={self.id}, billing_report_id={self.billing_report_id}, "
            f"schedule={self.class_schedule})>"
        )

    __table_args__ = (
        Index(
            "ix_billing_report_payment_summary_unique",
            "billing_report_id",
            "class_days",
            "class_schedule",
            "class_duration",
            unique=True,
        ),
    )


class BillingReportMonthlyItem(Base):
    """Modelo para items mensuales del reporte de facturación (editable).

    Este modelo almacena los cálculos mensuales para cada bloque de horario.
    Los valores inicialmente se calculan desde la carga académica y las tarifas vigentes,
    pero pueden ser editados manualmente.

    Attributes
    ----------
    id: Identificador único
    billing_report_id: Referencia al reporte padre
    class_days: Días de clase (ej: "Lu-Ma-Mi")
    class_schedule: Horario de clase (ej: "08:00-09:30")
    class_duration: Duración de la clase en minutos
    year: Año del item
    month: Mes del item (1-12)
    month_name: Nombre del mes en español
    sessions: Número de sesiones calculadas
    real_time_minutes: Tiempo real en minutos (sessions × duration)
    total_class_hours: Total de horas clase (real_time_minutes / 50)
    total_dollars: Total en dólares calculado
    """

    __tablename__ = "billing_report_monthly_items"

    # Referencia al reporte padre
    billing_report_id: Mapped[int] = mapped_column(
        ForeignKey("billing_reports.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Identificación del bloque de horario
    class_days: Mapped[str] = mapped_column(String(255), nullable=False)
    class_schedule: Mapped[str] = mapped_column(String(255), nullable=False)
    class_duration: Mapped[int] = mapped_column(Integer, nullable=False)

    # Mes y año
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    month_name: Mapped[str] = mapped_column(String(50), nullable=False)

    # Valores calculados (editables)
    sessions: Mapped[int] = mapped_column(Integer, nullable=False)
    real_time_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    total_class_hours: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    total_dollars: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    # Clave Primaria
    id: Mapped[int | None] = mapped_column(autoincrement=True, primary_key=True, default=None)

    # Relaciones
    billing_report: Mapped[BillingReport] = relationship("BillingReport", back_populates="monthly_items", init=False)

    def __repr__(self):
        return (
            f"<BillingReportMonthlyItem(id={self.id}, billing_report_id={self.billing_report_id}, "
            f"year={self.year}, month={self.month})>"
        )

    __table_args__ = (
        Index(
            "ix_billing_report_monthly_item_unique",
            "billing_report_id",
            "class_days",
            "class_schedule",
            "class_duration",
            "year",
            "month",
            unique=True,
        ),
    )
