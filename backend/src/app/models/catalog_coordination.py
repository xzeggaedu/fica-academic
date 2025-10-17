"""Modelo de Catálogo de Coordinaciones/Cátedras."""

from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from ..core.db.database import Base


class CatalogCoordination(Base):
    """Modelo de Catálogo de Coordinaciones/Cátedras.

    Representa las coordinaciones o cátedras que agrupan áreas de conocimiento
    dentro de una facultad. Cada coordinación puede tener un profesor coordinador.

    Attributes
    ----------
        id: Identificador único de la coordinación
        code: Código corto o abreviatura (ej: RED, MATE)
        name: Nombre oficial de la coordinación
        description: Descripción del área de conocimiento
        faculty_id: ID de la facultad a la que pertenece
        coordinator_professor_id: ID del profesor coordinador
        is_active: Estado del registro
        deleted: Indica si fue eliminado (soft delete)
        deleted_at: Fecha de eliminación (soft delete)
        created_at: Fecha de creación
        updated_at: Fecha de última actualización
    """

    __tablename__ = "catalog_coordination"

    # Clave Primaria
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True, init=False)

    # Información de la Coordinación
    code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relaciones
    faculty_id: Mapped[int] = mapped_column(ForeignKey("faculty.id"), nullable=False, index=True)
    coordinator_professor_id: Mapped[int | None] = mapped_column(
        ForeignKey("catalog_professor.id"), nullable=True, index=True
    )

    # Estado
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)

    # Soft Delete
    deleted: Mapped[bool | None] = mapped_column(Boolean, default=False, nullable=True, index=True, init=False)
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None, nullable=True, init=False
    )

    # Campos de Auditoría
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default_factory=lambda: datetime.now(UTC), init=False
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None, onupdate=datetime.now(UTC), init=False
    )

    def __repr__(self) -> str:
        return f"<CatalogCoordination(id={self.id}, code='{self.code}', name='{self.name}')>"
