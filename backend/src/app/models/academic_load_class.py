"""Modelo de AcademicLoadClass para las clases ingeridas de carga académica."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from ..core.db.database import Base

if TYPE_CHECKING:
    from .academic_load_file import AcademicLoadFile


class AcademicLoadClass(Base):
    """Modelo para las clases ingeridas de carga académica (snapshot inmutable).

    Cada fila representa una clase específica ingerida desde un archivo Excel de carga académica.
    Los datos son inmutables (snapshot) para preservar la información histórica,
    incluso si los catálogos de origen cambian.

    Attributes
    ----------
        id: Identificador único
        academic_load_file_id: Referencia al documento fuente
        correlative: Número correlativo de la fila
        coordination_code: Código de coordinación
        subject_code: Código de asignatura
        subject_name: Nombre de asignatura
        section_unique: Sección única
        class_section: Número de sección de clase
        class_service_assigned: Servicio asignado a la clase
        class_duration: Duración de la clase
        class_schedule: Horario de la clase
        class_days: Días de la clase
        class_type: Tipo de clase
        professor_institute: Instituto del profesor
        professor_academic_title: Título académico del profesor
        professor_name: Nombre del profesor
        professor_raw_cont: Raw data del profesor
        professor_phone: Teléfono del profesor
        professor_id: ID del profesor
        professor_category: Categoría del profesor
        professor_payment_rate: Tasa de pago del profesor (ej: 1.0 = 100%, 0.5 = 50%)
        professor_is_doctor: Si el profesor tiene título de doctor
        professor_profile: Perfil del profesor
        professor_final_note: Nota final del profesor
        professor_masters: Número de maestrías del profesor
        professor_institutional_email: Email institucional del profesor
        professor_personal_email: Email personal del profesor
        is_bilingual: Si la asignatura y maestro son bilingües
        observations: Observaciones
        team_channel_responsible: Responsable del canal de Teams
        validation_status: Estado de validación
        validation_errors: Errores de validación
    """

    __tablename__ = "academic_load_classes"

    # Referencia al documento fuente (obligatorio, sin default) — los campos sin default deben ir primero
    academic_load_file_id: Mapped[int] = mapped_column(
        ForeignKey("academic_load_files.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Datos de la clase (primero obligatorios)
    subject_code: Mapped[str] = mapped_column(String(20), nullable=False)
    subject_name: Mapped[str] = mapped_column(String(255), nullable=False)
    class_section: Mapped[str] = mapped_column(String(10), nullable=False)
    class_duration: Mapped[int] = mapped_column(Integer, nullable=False)
    class_schedule: Mapped[str] = mapped_column(String(50), nullable=False)
    class_days: Mapped[str] = mapped_column(String(50), nullable=False)
    class_type: Mapped[str] = mapped_column(String(50), nullable=False)

    # Datos del profesor (primero los obligatorios, luego los opcionales)
    professor_name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Opcionales de la clase
    correlative: Mapped[str | None] = mapped_column(String(10), nullable=True, default=None)
    coordination_code: Mapped[str | None] = mapped_column(String(20), nullable=True, default=None)
    section_unique: Mapped[str | None] = mapped_column(String(50), nullable=True, default=None)
    class_service_assigned: Mapped[str | None] = mapped_column(String(100), nullable=True, default=None)

    # Opcionales del profesor
    professor_institute: Mapped[str | None] = mapped_column(String(100), nullable=True, default=None)
    professor_academic_title: Mapped[str | None] = mapped_column(String(20), nullable=True, default=None)
    professor_raw_cont: Mapped[str | None] = mapped_column(String(50), nullable=True, default=None)
    professor_phone: Mapped[str | None] = mapped_column(String(50), nullable=True, default=None)
    professor_id: Mapped[str | None] = mapped_column(String(50), nullable=True, default=None)
    professor_category: Mapped[str | None] = mapped_column(String(10), nullable=True, default=None)
    professor_payment_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0, nullable=False)
    professor_is_doctor: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    professor_profile: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)
    professor_final_note: Mapped[str | None] = mapped_column(String(10), nullable=True, default=None)
    professor_masters: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    professor_institutional_email: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)
    professor_personal_email: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)
    is_bilingual: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Campos adicionales
    observations: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    team_channel_responsible: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)

    # Campos de validación
    validation_status: Mapped[str] = mapped_column(String(20), default="valid", nullable=False)
    validation_errors: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)

    # Timestamps (con defaults)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, default=func.now()
    )
    updated_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None, onupdate=func.now()
    )

    # Clave Primaria (al final para evitar problemas con dataclasses y orden de defaults)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True, init=False)

    # Relaciones
    academic_load_file: Mapped[AcademicLoadFile] = relationship("AcademicLoadFile", init=False)

    def __repr__(self) -> str:
        return (
            f"<AcademicLoadClass(id={self.id}, "
            f"file_id={self.academic_load_file_id}, "
            f"subject='{self.subject_name}', "
            f"section='{self.class_section}')>"
        )
