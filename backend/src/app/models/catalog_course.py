"""Modelo para el catálogo de asignaturas."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import String, DateTime, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.db.database import Base

if TYPE_CHECKING:
    from .course_school import CourseSchool


class CatalogCourse(Base):
    """Modelo para el catálogo de asignaturas.
    
    Attributes
    ----------
        id: Identificador único del curso
        course_code: Código único del curso
        course_name: Nombre del curso
        department_code: Código del departamento (string por ahora)
        is_active: Estado del registro
        created_at: Fecha de creación
        updated_at: Fecha de última actualización
    """

    __tablename__ = "catalog_course"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True, init=False)
    course_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    course_name: Mapped[str] = mapped_column(String(255), nullable=False)
    department_code: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default="now()", 
        nullable=False,
        init=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default="now()", 
        nullable=False,
        init=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relaciones (init=False para evitar conflictos con dataclasses)
    schools: Mapped[list["CourseSchool"]] = relationship(
        "CourseSchool",
        back_populates="course",
        cascade="all, delete-orphan",
        default_factory=list,
        init=False
    )

