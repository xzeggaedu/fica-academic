"""Modelo de AcademicLoadFile para la carga de archivos de carga académica."""

from __future__ import annotations

import uuid as uuid_pkg
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from ..core.db.database import Base

if TYPE_CHECKING:
    from .faculty import Faculty
    from .school import School
    from .term import Term
    from .user import User


class AcademicLoadFile(Base):
    __tablename__ = "academic_load_files"

    # Información del usuario
    user_id: Mapped[uuid_pkg.UUID] = mapped_column(ForeignKey("user.uuid"), nullable=False)
    user_name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Información de la facultad, escuela y período
    faculty_id: Mapped[int] = mapped_column(ForeignKey("faculty.id"), nullable=False)
    school_id: Mapped[int] = mapped_column(ForeignKey("school.id"), nullable=False)
    term_id: Mapped[int] = mapped_column(ForeignKey("terms.id"), nullable=False)

    # Información de archivos
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_file_path: Mapped[str] = mapped_column(String(500), nullable=False)

    # Metadatos
    upload_date: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, default=func.now()
    )
    ingestion_status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)

    # Información adicional y versionado
    notes: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    strict_validation: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    superseded_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)
    superseded_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("academic_load_files.id", ondelete="SET NULL"), nullable=True, default=None
    )

    # Clave Primaria (al final para evitar problemas con dataclasses)
    id: Mapped[int | None] = mapped_column(autoincrement=True, primary_key=True, default=None)

    # Relaciones
    user: Mapped[User] = relationship("User", init=False)
    faculty: Mapped[Faculty] = relationship("Faculty", init=False)
    school: Mapped[School] = relationship("School", init=False)
    term: Mapped[Term] = relationship("Term", init=False)

    def __repr__(self):
        return f"<AcademicLoadFile(id={self.id}, faculty_id={self.faculty_id}, school_id={self.school_id})>"

    __table_args__ = (
        Index(
            "ix_academic_load_one_active_per_context",
            "faculty_id",
            "school_id",
            "term_id",
            "is_active",
            unique=True,
            postgresql_where=(is_active.is_(True)),
        ),
    )
