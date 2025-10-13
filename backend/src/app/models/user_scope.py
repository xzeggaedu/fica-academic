"""Modelo de Alcance de Usuario para Control de Acceso Basado en Roles (RBAC) con filtrado jerárquico."""

import uuid as uuid_pkg
from datetime import UTC, datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from ..core.db.database import Base


class UserScope(Base):
    """Modelo de Alcance de Usuario para asignar acceso jerárquico a usuarios.

    Esta tabla implementa la asignación de alcance para los roles DIRECTOR y DECANO:
    - DECANO: Asignado a una Facultad (fk_faculty NOT NULL, fk_school NULL)
    - DIRECTOR: Asignado a una o múltiples Escuelas (fk_school NOT NULL, fk_faculty NULL)

    La restricción CHECK asegura que solo uno de fk_school o fk_faculty puede ser NOT NULL.
    """

    __tablename__ = "user_scope"

    # Clave Primaria
    id: Mapped[int] = mapped_column(autoincrement=True, primary_key=True)

    # Claves Foráneas
    fk_user: Mapped[uuid_pkg.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("user.uuid", ondelete="CASCADE"), nullable=False, index=True)

    fk_school: Mapped[int | None] = mapped_column(
        ForeignKey("school.id", ondelete="CASCADE"), nullable=True, index=True
    )

    fk_faculty: Mapped[int | None] = mapped_column(
        ForeignKey("faculty.id", ondelete="CASCADE"), nullable=True, index=True
    )

    # Campos de Auditoría
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default_factory=lambda: datetime.now(UTC), nullable=False
    )

    # Restricción CHECK: Solo uno de fk_school o fk_faculty puede ser NOT NULL
    __table_args__ = (
        CheckConstraint(
            "(fk_school IS NOT NULL AND fk_faculty IS NULL) OR (fk_school IS NULL AND fk_faculty IS NOT NULL)",
            name="check_single_scope_assignment",
        ),
    )

    def __repr__(self) -> str:
        scope_type = "school" if self.fk_school else "faculty"
        scope_id = self.fk_school if self.fk_school else self.fk_faculty
        return f"<UserScope(user_id={self.fk_user}, {scope_type}={scope_id})>"
