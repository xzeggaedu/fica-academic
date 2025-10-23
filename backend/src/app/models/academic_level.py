"""Academic Level model for professor compensation hierarchy."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from .hourly_rate_history import HourlyRateHistory

from ..core.db.database import Base


class AcademicLevel(Base):
    """Academic Level model - defines professor compensation hierarchy.

    This table establishes the Salary Policy, where each record is a rule
    (e.g., Doctorate, Bilingual) with a unique code and priority.
    Priority is essential for the ingestion engine to determine which rate
    pays higher (e.g., BLG with priority 5 always overrides DR with priority 4).

    Attributes:
        id: Unique numeric identifier
        code: Fixed code for data cross-referencing and logic (e.g., BLG, DR, GDO)
        name: Descriptive name of the level
        priority: Payment priority level (5 is highest, 1 is base)
        description: Optional detailed description
        is_active: Soft delete flag
        created_at: Timestamp of creation
        updated_at: Timestamp of last update
    """

    __tablename__ = "academic_level"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True, init=False)
    code: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    priority: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)

    # Soft delete fields
    deleted: Mapped[bool | None] = mapped_column(Boolean, default=False, nullable=True, index=True, init=False)
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None, nullable=True, init=False
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.utcnow(), nullable=False, init=False)
    updated_at: Mapped[datetime | None] = mapped_column(
        default=None, onupdate=lambda: datetime.utcnow(), nullable=True, init=False
    )

    # Relationships (init=False para evitar conflictos con dataclasses)
    hourly_rates: Mapped[list["HourlyRateHistory"]] = relationship(
        "HourlyRateHistory", back_populates="academic_level", lazy="selectin", init=False, default_factory=list
    )

    def __repr__(self) -> str:
        """String representation of AcademicLevel."""
        return f"<AcademicLevel(id={self.id}, code={self.code}, priority={self.priority})>"

    # Índices únicos parciales para permitir soft delete
    __table_args__ = (
        Index(
            "ix_academic_level_code_unique",
            "code",
            unique=True,
            postgresql_where=deleted.is_(False) | deleted.is_(None),
        ),
        Index(
            "ix_academic_level_name_unique",
            "name",
            unique=True,
            postgresql_where=deleted.is_(False) | deleted.is_(None),
        ),
    )
