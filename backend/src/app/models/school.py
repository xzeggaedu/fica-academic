"""Modelo de Escuela para la organización jerárquica."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.db.database import Base

if TYPE_CHECKING:
    from .faculty import Faculty


class School(Base):
    """Modelo de Escuela que representa las escuelas académicas dentro de una facultad.

    Una Escuela pertenece exactamente a una Facultad. Múltiples directores pueden ser asignados para gestionar escuelas.
    """

    __tablename__ = "school"

    # Información de la Escuela
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    acronym: Mapped[str] = mapped_column(String(20), nullable=False, index=True)

    # Claves Foráneas
    fk_faculty: Mapped[int] = mapped_column(ForeignKey("faculty.id", ondelete="CASCADE"), nullable=False, index=True)

    # Estado
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Campos de Auditoría
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None, onupdate=datetime.now(UTC)
    )

    # Clave Primaria (al final para evitar problemas con dataclasses)
    id: Mapped[int | None] = mapped_column(autoincrement=True, primary_key=True, default=None)

    # Relaciones
    faculty: Mapped[Faculty] = relationship("Faculty", back_populates="schools", lazy="selectin", init=False)

    def __repr__(self) -> str:
        return f"<School(id={self.id}, name={self.name}, acronym={self.acronym}, faculty_id={self.fk_faculty})>"
