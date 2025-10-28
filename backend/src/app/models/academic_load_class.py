"""Modelo de AcademicLoadClass para las clases ingeridas de carga académica."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from ..core.db.database import Base

if TYPE_CHECKING:
    from .academic_load_file import AcademicLoadFile
    from .catalog_coordination import CatalogCoordination
    from .catalog_professor import CatalogProfessor
    from .catalog_subject import CatalogSubject


class AcademicLoadClass(Base):
    """Modelo para las clases ingeridas de carga académica (snapshot inmutable).

    Cada fila representa una clase específica ingerida desde un archivo Excel de carga académica.
    Los datos son inmutables (snapshot) para preservar la información histórica,
    incluso si los catálogos de origen cambian.

    Attributes
    ----------
        id: Identificador único
        academic_load_file_id: Referencia al documento fuente
        subject_id: ID de la asignatura en el catálogo
        coordination_id: ID de la coordinación (puede ser NULL)
        subject_name: Snapshot del nombre de la asignatura (inmutable)
        subject_code: Snapshot del código de la asignatura (inmutable)
        section: Número de sección
        schedule: Horario de la clase
        duration: Duración en horas
        days: Días de la semana
        modality: Modalidad (Presencial, Virtual, Híbrida)
        professor_id: ID del profesor en el catálogo
        professor_category: Snapshot de la categoría del profesor
        professor_academic_title: Snapshot del título académico del profesor
        professor_is_bilingual: Snapshot del estado bilingüe
        professor_doctorates: Snapshot del número de doctorados
        professor_masters: Snapshot del número de maestrías
        ingestion_date: Fecha en que se ingirió la data
        created_at: Timestamp de creación
        updated_at: Timestamp de última actualización
    """

    __tablename__ = "academic_load_classes"

    # Referencia al documento fuente (obligatorio, sin default)
    academic_load_file_id: Mapped[int] = mapped_column(
        ForeignKey("academic_load_files.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Snapshot de la asignatura (inmutable, obligatorio)
    subject_name: Mapped[str] = mapped_column(String(255), nullable=False)
    subject_code: Mapped[str] = mapped_column(String(20), nullable=False)

    # Datos de la clase (directos del Excel, obligatorios)
    section: Mapped[str] = mapped_column(String(10), nullable=False)
    schedule: Mapped[str] = mapped_column(String(50), nullable=False)
    duration: Mapped[int] = mapped_column(Integer, nullable=False)
    days: Mapped[str] = mapped_column(String(50), nullable=False)
    modality: Mapped[str] = mapped_column(String(50), nullable=False)

    # Referencias a catálogos (opcionales, NULL permitido)
    subject_id: Mapped[int | None] = mapped_column(
        ForeignKey("catalog_subject.id"), nullable=True, index=True, default=None
    )
    coordination_id: Mapped[int | None] = mapped_column(
        ForeignKey("catalog_coordination.id"), nullable=True, index=True, default=None
    )
    professor_id: Mapped[int | None] = mapped_column(
        ForeignKey("catalog_professor.id"), nullable=True, index=True, default=None
    )

    # Snapshot del profesor (inmutable, con defaults)
    professor_category: Mapped[str | None] = mapped_column(String(10), nullable=True, default=None)
    professor_academic_title: Mapped[str | None] = mapped_column(String(20), nullable=True, default=None)
    professor_is_bilingual: Mapped[bool] = mapped_column(Integer, default=False, nullable=False)
    professor_doctorates: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    professor_masters: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Timestamps (con defaults)
    ingestion_date: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, default=func.now()
    )
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, default=func.now()
    )
    updated_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None, onupdate=func.now()
    )

    # Clave Primaria (al final para evitar problemas con dataclasses)
    id: Mapped[int | None] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True, default=None)

    # Relaciones
    academic_load_file: Mapped[AcademicLoadFile] = relationship("AcademicLoadFile", init=False)
    subject: Mapped[CatalogSubject] = relationship("CatalogSubject", init=False)
    coordination: Mapped[CatalogCoordination] = relationship("CatalogCoordination", init=False)
    professor: Mapped[CatalogProfessor] = relationship("CatalogProfessor", init=False)

    def __repr__(self) -> str:
        return (
            f"<AcademicLoadClass(id={self.id}, "
            f"file_id={self.academic_load_file_id}, "
            f"subject='{self.subject_name}', "
            f"section='{self.section}')>"
        )
