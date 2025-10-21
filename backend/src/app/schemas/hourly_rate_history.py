"""Pydantic schemas for Hourly Rate History API validation."""

from datetime import date, datetime
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from .academic_level import AcademicLevelRead


class HourlyRateHistoryBase(BaseModel):
    """Base schema for Hourly Rate History with common fields."""

    level_id: Annotated[
        int,
        Field(gt=0, examples=[1], description="ID del nivel académico"),
    ]
    rate_per_hour: Annotated[
        Decimal,
        Field(
            gt=0,
            decimal_places=2,
            examples=[15.00],
            description="Tarifa por hora en USD",
        ),
    ]
    start_date: Annotated[date, Field(examples=["2025-01-01"], description="Fecha de inicio de vigencia")]
    end_date: Annotated[
        date | None,
        Field(default=None, examples=[None, "2025-12-31"], description="Fecha de fin de vigencia (NULL = vigente)"),
    ] = None

    @field_validator("rate_per_hour")
    @classmethod
    def validate_rate_positive(cls, v: Decimal) -> Decimal:
        """Validate that rate is positive."""
        if v <= 0:
            raise ValueError("La tarifa debe ser mayor que cero")
        return v

    @model_validator(mode="after")
    def validate_dates(self):
        """Validate that end_date is after start_date if provided."""
        if self.end_date and self.start_date:
            if self.end_date <= self.start_date:
                raise ValueError("La fecha de fin debe ser posterior a la fecha de inicio")
        return self


class HourlyRateHistoryCreate(BaseModel):
    """Schema for creating a new Hourly Rate (Salary Increase).

    When creating a new rate, the API automatically:
    1. Locates the previous active rate for the same level_id
    2. Sets its end_date to the day before the new start_date
    3. Creates the new record with end_date = NULL (active)
    """

    model_config = ConfigDict(extra="forbid")

    level_id: Annotated[
        int,
        Field(gt=0, examples=[1], description="ID del nivel académico"),
    ]
    rate_per_hour: Annotated[
        Decimal,
        Field(
            gt=0,
            decimal_places=2,
            examples=[15.00],
            description="Nueva tarifa por hora en USD",
        ),
    ]
    start_date: Annotated[
        date,
        Field(
            examples=["2026-01-01"],
            description="Fecha de inicio de la nueva tarifa",
        ),
    ]

    @field_validator("rate_per_hour")
    @classmethod
    def validate_rate_positive(cls, v: Decimal) -> Decimal:
        """Validate that rate is positive."""
        if v <= 0:
            raise ValueError("La tarifa debe ser mayor que cero")
        # Round to 2 decimal places
        return round(v, 2)


class HourlyRateHistoryUpdate(BaseModel):
    """Schema for updating an existing Hourly Rate (Administrative Correction).

    This is used for corrections and adjustments to maintain audit trail.
    """

    model_config = ConfigDict(extra="forbid")

    rate_per_hour: Annotated[Decimal | None, Field(default=None, gt=0, decimal_places=2)] = None
    start_date: Annotated[date | None, Field(default=None)] = None
    end_date: Annotated[date | None, Field(default=None)] = None

    @field_validator("rate_per_hour")
    @classmethod
    def validate_rate_positive(cls, v: Decimal | None) -> Decimal | None:
        """Validate that rate is positive if provided."""
        if v is not None and v <= 0:
            raise ValueError("La tarifa debe ser mayor que cero")
        if v is not None:
            return round(v, 2)
        return v

    @model_validator(mode="after")
    def validate_dates(self):
        """Validate that end_date is after start_date if both provided."""
        if self.end_date and self.start_date:
            if self.end_date <= self.start_date:
                raise ValueError("La fecha de fin debe ser posterior a la fecha de inicio")
        return self


class HourlyRateHistoryRead(HourlyRateHistoryBase):
    """Schema for reading Hourly Rate History data with academic level info."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_by_id: UUID | None
    created_at: datetime
    updated_at: datetime | None
    academic_level: AcademicLevelRead | None = None

    @property
    def is_active(self) -> bool:
        """Check if this rate is currently active."""
        return self.end_date is None


class HourlyRateHistoryInternal(HourlyRateHistoryBase):
    """Internal schema for Hourly Rate History (database operations)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_by_id: UUID | None
    created_at: datetime
    updated_at: datetime | None


class HourlyRateTimelineItem(BaseModel):
    """Schema for timeline visualization of rate history."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    rate_per_hour: Decimal
    start_date: date
    end_date: date | None
    is_active: bool
    created_at: datetime

    @staticmethod
    def from_rate(rate: "HourlyRateHistoryRead") -> "HourlyRateTimelineItem":
        """Create timeline item from rate."""
        return HourlyRateTimelineItem(
            id=rate.id,
            rate_per_hour=rate.rate_per_hour,
            start_date=rate.start_date,
            end_date=rate.end_date,
            is_active=rate.end_date is None,
            created_at=rate.created_at,
        )
