"""Hourly Rate History model for professor compensation tracking."""

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Index, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from .academic_level import AcademicLevel

from ..core.db.database import Base


class HourlyRateHistory(Base):
    """Hourly Rate History model - financial audit and historical calculation.

    This table is the Price History by Date, whose main objective is auditing
    and correct historical calculation. It stores the specific amount (rate_per_hour)
    and the validity range (start_date and end_date) for each rule defined in
    the academic_level catalog.

    Business Rules:
    - Only ONE record can have end_date = NULL per level_id (current active rate)
    - No date range overlapping for the same level_id
    - start_date must be before end_date (if end_date exists)
    - When creating a new rate, the previous active rate's end_date is automatically set

    Attributes:
        id: Unique numeric identifier
        level_id: Foreign key to academic_level
        rate_per_hour: Hourly rate amount in USD
        start_date: Start datetime of validity
        end_date: End datetime of validity (NULL = currently active)
        created_by_id: User who created this rate (for audit)
        created_at: Timestamp of creation
        updated_at: Timestamp of last update
        academic_level: Relationship to AcademicLevel
    """

    __tablename__ = "hourly_rate_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    level_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("academic_level.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    rate_per_hour: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    start_date: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    end_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)
    created_by_id: Mapped[UUID | None] = mapped_column(ForeignKey("user.uuid", ondelete="SET NULL"), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.utcnow(), nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(default=None, onupdate=lambda: datetime.utcnow(), nullable=True)

    # Relationships (init=False para evitar conflictos con dataclasses)
    academic_level: Mapped["AcademicLevel"] = relationship(
        "AcademicLevel", back_populates="hourly_rates", lazy="selectin", init=False
    )

    # Indexes for performance
    __table_args__ = (
        Index("ix_hourly_rate_level_dates", "level_id", "start_date", "end_date"),
        Index("ix_hourly_rate_active", "level_id", "end_date"),
    )

    def __repr__(self) -> str:
        """String representation of HourlyRateHistory."""
        return (
            f"<HourlyRateHistory(id={self.id}, level_id={self.level_id}, "
            f"rate=${self.rate_per_hour}, active={self.end_date is None})>"
        )

    @property
    def is_active(self) -> bool:
        """Check if this rate is currently active (end_date is NULL)."""
        return self.end_date is None
