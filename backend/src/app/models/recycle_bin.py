"""Modelo RecycleBin para registrar elementos eliminados (soft delete)."""

import uuid as uuid_pkg
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from ..core.db.database import Base


class RecycleBin(Base):
    """Modelo para la papelera de reciclaje - registra elementos eliminados con soft delete.

    Esta tabla mantiene un registro de todos los elementos que han sido marcados como eliminados
    en las diferentes entidades del sistema (facultades, usuarios, asignaturas, etc.).
    """

    __tablename__ = "recycle_bin"

    # Información de la entidad eliminada (campos sin default primero)
    entity_type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True, comment="Tipo de entidad: 'faculty', 'user', 'course', etc."
    )
    entity_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
        comment="ID del registro eliminado en su tabla original (puede ser int o UUID como string)",
    )
    entity_display_name: Mapped[str] = mapped_column(
        String(255), nullable=False, comment="Nombre legible del registro para mostrar en la UI"
    )

    # Auditoría de eliminación (campos sin default)
    deleted_by_id: Mapped[uuid_pkg.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True, comment="UUID del usuario que eliminó el registro"
    )
    deleted_by_name: Mapped[str] = mapped_column(
        String(255), nullable=False, comment="Nombre del usuario que eliminó (snapshot)"
    )

    # Campos opcionales con default (después de los requeridos)
    reason: Mapped[str | None] = mapped_column(
        Text, nullable=True, default=None, comment="Razón opcional de la eliminación"
    )
    restored_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None, comment="Fecha y hora de restauración (si aplica)"
    )
    restored_by_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        default=None,
        comment="ID del usuario que restauró el registro (puede ser UUID, int, etc. como string)",
    )
    restored_by_name: Mapped[str | None] = mapped_column(
        String(255), nullable=True, default=None, comment="Nombre del usuario que restauró (snapshot)"
    )

    # Campos con default
    can_restore: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        comment="Indica si el registro puede ser restaurado (validación de integridad)",
    )
    deleted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default_factory=lambda: datetime.now(UTC),
        index=True,
        comment="Fecha y hora de eliminación",
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None, onupdate=datetime.now(UTC)
    )

    # Clave Primaria (al final para evitar problemas con dataclasses)
    id: Mapped[int | None] = mapped_column(Integer, primary_key=True, autoincrement=True, index=True, default=None)

    def __repr__(self) -> str:
        """Representación del objeto RecycleBin."""
        return (
            f"<RecycleBin(id={self.id}, entity_type='{self.entity_type}', "
            f"entity_id={self.entity_id}, entity_name='{self.entity_display_name}')>"
        )
