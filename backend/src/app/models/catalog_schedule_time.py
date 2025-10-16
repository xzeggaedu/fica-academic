"""Modelo de Catálogo de Horarios para estandarizar rangos horarios recurrentes."""

from datetime import UTC, datetime, time

from sqlalchemy import ARRAY, Boolean, DateTime, Integer, String, Time
from sqlalchemy.orm import Mapped, mapped_column

from ..core.db.database import Base


class CatalogScheduleTime(Base):
    """Modelo de Catálogo de Horarios para estandarizar rangos horarios recurrentes.

    Esta tabla almacena horarios predefinidos como:
    - Lunes a Viernes: 06:30-08:00
    - Martes y Jueves: 17:00-18:30
    - etc.
    """

    __tablename__ = "catalog_schedule_time"

    # Clave Primaria
    id: Mapped[int] = mapped_column(autoincrement=True, primary_key=True, init=False)

    # Información del Horario
    days_array: Mapped[list[int]] = mapped_column(ARRAY(Integer), nullable=False)
    day_group_name: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    range_text: Mapped[str] = mapped_column(String(50), nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    duration_min: Mapped[int] = mapped_column(Integer, nullable=False)

    # Estado
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)

    # Campos de Auditoría
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default_factory=lambda: datetime.now(UTC), init=False
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None, onupdate=datetime.now(UTC), init=False
    )
    deleted: Mapped[bool | None] = mapped_column(Boolean, default=False, nullable=True, index=True, init=False)
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None, nullable=True, init=False
    )

    def __repr__(self) -> str:
        return f"<CatalogScheduleTime(id={self.id}, day_group='{self.day_group_name}', range='{self.range_text}')>"
