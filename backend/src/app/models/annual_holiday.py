"""Annual Holiday model for specific holiday dates per year."""

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from .holiday import Holiday

from ..core.db.database import Base


class AnnualHoliday(Base):
    """Annual Holiday model - represents specific holiday dates within a year.

    This table stores individual holiday dates for a specific year group.
    Entries are created either:
    1. Automatically from FixedHolidayRules when a Holiday year is created
    2. Manually as custom/personalized holidays
    3. By future formula-based generation (Easter, movable dates, etc.)

    Attributes:
        id: Unique numeric identifier
        holiday_id: Foreign key to Holiday (year group)
        date: Specific date of the holiday (e.g., 2025-05-01)
        name: Name of the holiday (e.g., "Día del Trabajo")
        type: Type of holiday - "Asueto Nacional" (from fixed rules) or "Personalizado" (custom)
        created_at: Timestamp of creation
        updated_at: Timestamp of last update
        holiday: Relationship to parent Holiday year group
    """

    __tablename__ = "annual_holidays"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    holiday_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("holidays.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # "Asueto Nacional" | "Personalizado"

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.utcnow(), nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(default=None, onupdate=lambda: datetime.utcnow(), nullable=True)

    # Relationships (init=False to avoid conflicts with dataclasses)
    holiday: Mapped["Holiday"] = relationship("Holiday", back_populates="annual_holidays", lazy="selectin", init=False)

    def __repr__(self) -> str:
        """String representation of AnnualHoliday."""
        return f"<AnnualHoliday(id={self.id}, date={self.date}, name={self.name}, type={self.type})>"
