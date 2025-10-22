"""Pydantic schemas for Fixed Holiday Rule API validation."""

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator


class FixedHolidayRuleBase(BaseModel):
    """Base schema for Fixed Holiday Rule with common fields."""

    name: Annotated[
        str,
        Field(
            min_length=1,
            max_length=100,
            examples=["Día del Trabajo", "Navidad"],
            description="Nombre del asueto fijo",
        ),
    ]
    month: Annotated[
        int,
        Field(
            ge=1,
            le=12,
            examples=[5],
            description="Mes del asueto (1-12)",
        ),
    ]
    day: Annotated[
        int,
        Field(
            ge=1,
            le=31,
            examples=[1],
            description="Día del mes (1-31)",
        ),
    ]

    @field_validator("name")
    @classmethod
    def validate_name_no_extra_spaces(cls, v: str) -> str:
        """Validate that name has no extra spaces."""
        v = v.strip()
        if not v:
            raise ValueError("El nombre no puede estar vacío")
        return v

    @field_validator("day")
    @classmethod
    def validate_day_in_month(cls, v: int, info) -> int:
        """Validate that day is valid for the given month."""
        # Get month from values if available
        month = info.data.get("month")
        if month is not None:
            # Days in each month (non-leap year)
            days_in_month = {1: 31, 2: 29, 3: 31, 4: 30, 5: 31, 6: 30, 7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31}
            if v > days_in_month[month]:
                raise ValueError(f"El día {v} no es válido para el mes {month}")
        return v


class FixedHolidayRuleCreate(BaseModel):
    """Schema for creating a new Fixed Holiday Rule."""

    model_config = ConfigDict(extra="forbid")

    name: Annotated[
        str,
        Field(
            min_length=1,
            max_length=100,
            examples=["Día del Trabajo"],
            description="Nombre del asueto fijo",
        ),
    ]
    month: Annotated[int, Field(ge=1, le=12, examples=[5], description="Mes del asueto")]
    day: Annotated[int, Field(ge=1, le=31, examples=[1], description="Día del mes")]

    @field_validator("name")
    @classmethod
    def validate_name_no_extra_spaces(cls, v: str) -> str:
        """Validate that name has no extra spaces."""
        v = v.strip()
        if not v:
            raise ValueError("El nombre no puede estar vacío")
        return v

    @field_validator("day")
    @classmethod
    def validate_day_in_month(cls, v: int, info) -> int:
        """Validate that day is valid for the given month."""
        month = info.data.get("month")
        if month is not None:
            days_in_month = {1: 31, 2: 29, 3: 31, 4: 30, 5: 31, 6: 30, 7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31}
            if v > days_in_month[month]:
                raise ValueError(f"El día {v} no es válido para el mes {month}")
        return v


class FixedHolidayRuleUpdate(BaseModel):
    """Schema for updating an existing Fixed Holiday Rule."""

    model_config = ConfigDict(extra="forbid")

    name: Annotated[str | None, Field(default=None, min_length=1, max_length=100)] = None
    month: Annotated[int | None, Field(default=None, ge=1, le=12)] = None
    day: Annotated[int | None, Field(default=None, ge=1, le=31)] = None

    @field_validator("name")
    @classmethod
    def validate_name_no_extra_spaces(cls, v: str | None) -> str | None:
        """Validate that name has no extra spaces."""
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("El nombre no puede estar vacío")
        return v


class FixedHolidayRuleRead(FixedHolidayRuleBase):
    """Schema for reading Fixed Holiday Rule data."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime | None


class FixedHolidayRuleInternal(FixedHolidayRuleBase):
    """Internal schema for Fixed Holiday Rule (database operations)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime | None
