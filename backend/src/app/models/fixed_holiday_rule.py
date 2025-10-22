"""Fixed Holiday Rule model for recurring annual holidays."""

from datetime import datetime

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from ..core.db.database import Base


class FixedHolidayRule(Base):
    """Fixed Holiday Rule model - defines recurring holidays that repeat yearly.

    This table serves as a template/repository for holidays that occur on the
    same date every year (e.g., Christmas on Dec 25, Independence Day on Sep 15).
    When a new Holiday year is created, these rules are automatically copied
    to create AnnualHoliday entries for that year.

    Attributes:
        id: Unique numeric identifier
        name: Name of the holiday (e.g., "Día del Trabajo", "Navidad")
        month: Month when the holiday occurs (1-12)
        day: Day of the month when the holiday occurs (1-31)
        created_at: Timestamp of creation
        updated_at: Timestamp of last update
    """

    __tablename__ = "fixed_holiday_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    day: Mapped[int] = mapped_column(Integer, nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.utcnow(), nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(default=None, onupdate=lambda: datetime.utcnow(), nullable=True)

    def __repr__(self) -> str:
        """String representation of FixedHolidayRule."""
        return f"<FixedHolidayRule(id={self.id}, name={self.name}, date={self.month}/{self.day})>"
