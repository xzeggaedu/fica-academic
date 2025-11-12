"""Modelo de TemplateGeneration para la generación de plantillas."""

from __future__ import annotations

import uuid as uuid_pkg
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from ..core.db.database import Base

if TYPE_CHECKING:
    from .faculty import Faculty
    from .school import School
    from .user import User


class TemplateGeneration(Base):
    __tablename__ = "template_generations"

    # Información del usuario
    user_id: Mapped[uuid_pkg.UUID] = mapped_column(ForeignKey("user.uuid"), nullable=False)

    # Información de la facultad y escuela
    faculty_id: Mapped[int] = mapped_column(ForeignKey("faculty.id"), nullable=False)
    school_id: Mapped[int] = mapped_column(ForeignKey("school.id"), nullable=False)

    # Información de archivos
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    generated_file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Metadatos
    upload_date: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, default=func.now()
    )
    generation_status: Mapped[str] = mapped_column(String(50), default="completed", nullable=False)

    # Información adicional
    notes: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)

    # Clave Primaria (al final para evitar problemas con dataclasses)
    id: Mapped[int | None] = mapped_column(autoincrement=True, primary_key=True, default=None)

    # Relaciones
    user: Mapped[User] = relationship("User", back_populates="template_generations", init=False)
    faculty: Mapped[Faculty] = relationship("Faculty", init=False)
    school: Mapped[School] = relationship("School", init=False)

    def __repr__(self):
        return f"<TemplateGeneration(id={self.id}, faculty_id={self.faculty_id}, school_id={self.school_id})>"
