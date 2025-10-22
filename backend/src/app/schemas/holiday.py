"""Pydantic schemas for Holiday API validation."""

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator


class HolidayBase(BaseModel):
    """Base schema for Holiday with common fields."""

    year: Annotated[
        int,
        Field(
            ge=2020,
            le=2100,
            examples=[2025],
            description="Año del grupo de asuetos",
        ),
    ]
    description: Annotated[
        str | None,
        Field(
            default=None,
            max_length=200,
            examples=["Asuetos Oficiales 2025"],
            description="Descripción opcional del grupo",
        ),
    ] = None

    @field_validator("description")
    @classmethod
    def validate_description_no_extra_spaces(cls, v: str | None) -> str | None:
        """Validate that description has no extra spaces."""
        if v is None:
            return v
        v = v.strip()
        return v if v else None


class HolidayCreate(BaseModel):
    """Schema for creating a new Holiday year group."""

    model_config = ConfigDict(extra="forbid")

    year: Annotated[
        int,
        Field(
            ge=2020,
            le=2100,
            examples=[2025],
            description="Año del grupo de asuetos",
        ),
    ]
    description: Annotated[
        str | None,
        Field(
            default=None,
            max_length=200,
            examples=["Asuetos Oficiales 2025"],
            description="Descripción opcional",
        ),
    ] = None

    @field_validator("description")
    @classmethod
    def validate_description_no_extra_spaces(cls, v: str | None) -> str | None:
        """Validate that description has no extra spaces."""
        if v is None:
            return v
        v = v.strip()
        return v if v else None


class HolidayUpdate(BaseModel):
    """Schema for updating an existing Holiday."""

    model_config = ConfigDict(extra="forbid")

    year: Annotated[int | None, Field(default=None, ge=2020, le=2100)] = None
    description: Annotated[str | None, Field(default=None, max_length=200)] = None

    @field_validator("description")
    @classmethod
    def validate_description_no_extra_spaces(cls, v: str | None) -> str | None:
        """Validate that description has no extra spaces."""
        if v is None:
            return v
        v = v.strip()
        return v if v else None


class HolidayRead(HolidayBase):
    """Schema for reading Holiday data."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime | None
    annual_holidays_count: Annotated[
        int,
        Field(default=0, description="Cantidad de fechas de asueto en este año"),
    ] = 0


class HolidayInternal(HolidayBase):
    """Internal schema for Holiday (database operations)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime | None
