"""Modelo para la relación entre asignaturas y escuelas."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.db.database import Base

if TYPE_CHECKING:
    from .catalog_subject import CatalogSubject
    from .school import School


class SubjectSchool(Base):
    """Modelo para la relación entre asignaturas y escuelas.

    Una asignatura puede pertenecer a varias escuelas.
    A través de las escuelas se puede determinar las facultades.

    Attributes
    ----------
        id: Identificador único
        subject_id: ID de la asignatura
        school_id: ID de la escuela
        created_at: Fecha de creación
    """

    __tablename__ = "subject_school"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True, init=False)
    subject_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("catalog_subject.id", ondelete="CASCADE"), nullable=False, index=True
    )
    school_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("school.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()", nullable=False, init=False
    )

    # Relaciones (init=False para evitar conflictos con dataclasses)
    subject: Mapped["CatalogSubject"] = relationship("CatalogSubject", back_populates="schools", init=False)
    school: Mapped["School"] = relationship("School", back_populates="subjects", init=False)
