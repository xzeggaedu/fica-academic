"""Term model for academic cycles/periods."""

from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from ..core.db.database import Base


class Term(Base):
    """Term model - represents an academic cycle/period.

    This table stores academic terms/cycles with their start and end dates.
    Used for calculating workable days within specific academic periods.

    Example:
        Ciclo 1/2025: term=1, year=2025, description="Primer Ciclo 2025"
        Ciclo 2/2025: term=2, year=2025, description="Segundo Ciclo 2025"

    Attributes:
        id: Unique numeric identifier
        term: Term number (1, 2, 3, etc.)
        year: Year of the term (for easy filtering and reference)
        description: Optional descriptive name (e.g., "Primer Ciclo 2025")
        start_date: Start date of the academic term
        end_date: End date of the academic term
        created_at: Timestamp of creation
        updated_at: Timestamp of last update
    """

    __tablename__ = "terms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    term: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    end_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(String(200), nullable=True, default=None)

    # Soft Delete
    deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.utcnow(), nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(default=None, onupdate=lambda: datetime.utcnow(), nullable=True)

    def __repr__(self) -> str:
        """String representation of Term."""
        return f"<Term(id={self.id}, term={self.term}, period={self.start_date} → {self.end_date})>"
