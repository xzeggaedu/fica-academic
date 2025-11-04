"""Modelo de Facultad para la organización jerárquica."""


from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.db.database import Base

if TYPE_CHECKING:
    from .school import School


class Faculty(Base):
    """Modelo de Facultad que representa las facultades académicas.

    Una Facultad es el nivel superior en la jerarquía organizacional. Múltiples escuelas pueden pertenecer a una sola
    facultad.
    """

    __tablename__ = "faculty"

    # Información de la Facultad
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    acronym: Mapped[str] = mapped_column(String(20), nullable=False, unique=True, index=True)

    # Estado
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)

    # Campos de Auditoría
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None, onupdate=datetime.now(UTC)
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)

    # Clave Primaria (al final para evitar problemas con dataclasses)
    id: Mapped[int | None] = mapped_column(autoincrement=True, primary_key=True, default=None)

    # Relaciones
    schools: Mapped[list[School]] = relationship(
        "School", back_populates="faculty", lazy="selectin", default_factory=list
    )

    def __repr__(self) -> str:
        return f"<Faculty(id={self.id}, name={self.name}, acronym={self.acronym})>"
