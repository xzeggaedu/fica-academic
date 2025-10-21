"""Modelo para el catálogo de asignaturas."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.db.database import Base

if TYPE_CHECKING:
    from .subject_school import SubjectSchool


class CatalogSubject(Base):
    """Modelo para el catálogo de asignaturas.

    Attributes
    ----------
        id: Identificador único de la asignatura
        subject_code: Código único de la asignatura
        subject_name: Nombre de la asignatura
        coordination_code: Código de la coordinación (FK a catalog_coordination.code)
        is_bilingual: Indica si la asignatura es bilingüe
        is_active: Estado del registro
        deleted: Indica si la asignatura fue eliminada (soft delete)
        deleted_at: Fecha de eliminación (soft delete)
        created_at: Fecha de creación
        updated_at: Fecha de última actualización
    """

    __tablename__ = "catalog_subject"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True, init=False)
    subject_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    subject_name: Mapped[str] = mapped_column(String(255), nullable=False)
    coordination_code: Mapped[str] = mapped_column(
        String(10), ForeignKey("catalog_coordination.code"), nullable=False, index=True
    )
    is_bilingual: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()", nullable=False, init=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()", nullable=False, init=False
    )
    deleted: Mapped[bool | None] = mapped_column(Boolean, default=False, nullable=True, index=True, init=False)
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None, nullable=True, init=False
    )

    # Relaciones (init=False para evitar conflictos con dataclasses)
    schools: Mapped[list["SubjectSchool"]] = relationship(
        "SubjectSchool", back_populates="subject", cascade="all, delete-orphan", default_factory=list, init=False
    )
