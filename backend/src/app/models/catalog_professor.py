"""Modelo para el catálogo de profesores."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from ..core.db.database import Base


class CatalogProfessor(Base):
    """Modelo para el catálogo de profesores.

    Attributes
    ----------
        id: Identificador único numérico (PK)
        professor_id: Código único institucional del profesor
        professor_name: Nombre completo del catedrático
        institutional_email: Correo electrónico institucional
        personal_email: Correo electrónico personal
        phone_number: Número de teléfono
        professor_category: Categoría del profesor (DHC, ADM, etc.)
        academic_title: Título profesional (Ing., Dr., Lic.)
        doctorates: Número de doctorados
        masters: Número de maestrías
        is_bilingual: Certificado bilingüe
        is_paid: En nómina
        is_active: Estado del registro
        deleted: Soft delete flag
        deleted_at: Fecha de eliminación
        created_at: Fecha de creación
        updated_at: Fecha de última actualización
    """

    __tablename__ = "catalog_professor"

    # PK auto-incremental (consistente con otras tablas)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True, init=False)

    # Códigos únicos
    professor_id: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    professor_name: Mapped[str] = mapped_column(String(150), unique=True, nullable=False, index=True)

    # Información de contacto
    institutional_email: Mapped[str | None] = mapped_column(String(100), nullable=True, default=None)
    personal_email: Mapped[str | None] = mapped_column(String(100), nullable=True, default=None)
    phone_number: Mapped[str | None] = mapped_column(String(20), nullable=True, default=None)

    # Información académica
    professor_category: Mapped[str | None] = mapped_column(String(10), nullable=True, default=None)
    academic_title: Mapped[str | None] = mapped_column(String(20), nullable=True, default=None)
    doctorates: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    masters: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_bilingual: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Información administrativa
    is_paid: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Soft Delete
    deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()", nullable=False, init=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()", nullable=False, init=False
    )

    def __repr__(self) -> str:
        """Representación en string del profesor."""
        return f"<CatalogProfessor(id={self.id}, professor_id='{self.professor_id}', name='{self.professor_name}')>"
