"""Holiday model for yearly holiday groups."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from .annual_holiday import AnnualHoliday

from ..core.db.database import Base


class Holiday(Base):
    """Holiday model - represents a year group that contains all holidays for that year.

    This table acts as a container/group for all holiday dates in a specific year.
    When created, it automatically generates AnnualHoliday entries by:
    1. Copying all FixedHolidayRules and applying them to the year
    2. Allowing future formula-based holiday generation (e.g., Easter, movable dates)

    Attributes:
        id: Unique numeric identifier
        year: Year for this holiday group (e.g., 2025, 2026) - Must be unique
        description: Optional description (e.g., "Asuetos Oficiales 2025")
        created_at: Timestamp of creation
        updated_at: Timestamp of last update
        annual_holidays: Relationship to all holiday dates in this year
    """

    __tablename__ = "holidays"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True, init=False)
    year: Mapped[int] = mapped_column(Integer, unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(String(200), nullable=True, default=None)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.utcnow(), nullable=False, init=False)
    updated_at: Mapped[datetime | None] = mapped_column(
        default=None, onupdate=lambda: datetime.utcnow(), nullable=True, init=False
    )

    # Relationships (init=False to avoid conflicts with dataclasses)
    annual_holidays: Mapped[list["AnnualHoliday"]] = relationship(
        "AnnualHoliday",
        back_populates="holiday",
        cascade="all, delete-orphan",
        lazy="selectin",
        init=False,
        default_factory=list,
    )

    def __repr__(self) -> str:
        """String representation of Holiday."""
        return f"<Holiday(id={self.id}, year={self.year}, holidays_count={len(self.annual_holidays)})>"
