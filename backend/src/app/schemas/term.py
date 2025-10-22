"""Pydantic schemas for Term API validation."""

from datetime import date as date_type
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class TermBase(BaseModel):
    """Base schema for Term with common fields."""

    term: Annotated[
        int,
        Field(
            ge=1,
            le=10,
            examples=[1, 2, 3],
            description="Número del ciclo (1, 2, 3, etc.)",
        ),
    ]
    year: Annotated[
        int,
        Field(
            ge=2020,
            le=2100,
            examples=[2025],
            description="Año del ciclo académico",
        ),
    ]
    description: Annotated[
        str | None,
        Field(
            default=None,
            max_length=200,
            examples=["Primer Ciclo 2025"],
            description="Descripción opcional del ciclo",
        ),
    ] = None
    start_date: Annotated[
        date_type,
        Field(
            examples=["2025-01-17"],
            description="Fecha de inicio del ciclo",
        ),
    ]
    end_date: Annotated[
        date_type,
        Field(
            examples=["2025-06-15"],
            description="Fecha de fin del ciclo",
        ),
    ]

    @field_validator("description")
    @classmethod
    def validate_description_no_extra_spaces(cls, v: str | None) -> str | None:
        """Validate that description has no extra spaces."""
        if v is None:
            return v
        v = v.strip()
        return v if v else None

    @model_validator(mode="after")
    def validate_date_range(self):
        """Validate that end_date is after start_date."""
        if self.end_date <= self.start_date:
            raise ValueError("La fecha de fin debe ser posterior a la fecha de inicio")
        return self


class TermCreate(BaseModel):
    """Schema for creating a new Term."""

    model_config = ConfigDict(extra="forbid")

    term: Annotated[int, Field(ge=1, le=10, examples=[1], description="Número del ciclo")]
    year: Annotated[int, Field(ge=2020, le=2100, examples=[2025], description="Año del ciclo")]
    description: Annotated[
        str | None,
        Field(default=None, max_length=200, examples=["Primer Ciclo 2025"], description="Descripción opcional"),
    ] = None
    start_date: Annotated[date_type, Field(examples=["2025-01-17"], description="Fecha de inicio")]
    end_date: Annotated[date_type, Field(examples=["2025-06-15"], description="Fecha de fin")]

    @field_validator("description")
    @classmethod
    def validate_description_no_extra_spaces(cls, v: str | None) -> str | None:
        """Validate that description has no extra spaces."""
        if v is None:
            return v
        v = v.strip()
        return v if v else None

    @model_validator(mode="after")
    def validate_date_range(self):
        """Validate that end_date is after start_date."""
        if self.end_date <= self.start_date:
            raise ValueError("La fecha de fin debe ser posterior a la fecha de inicio")
        return self


class TermUpdate(BaseModel):
    """Schema for updating an existing Term."""

    model_config = ConfigDict(extra="forbid")

    term: Annotated[int | None, Field(default=None, ge=1, le=10)] = None
    year: Annotated[int | None, Field(default=None, ge=2020, le=2100)] = None
    description: Annotated[str | None, Field(default=None, max_length=200)] = None
    start_date: Annotated[date_type | None, Field(default=None)] = None
    end_date: Annotated[date_type | None, Field(default=None)] = None

    @field_validator("description")
    @classmethod
    def validate_description_no_extra_spaces(cls, v: str | None) -> str | None:
        """Validate that description has no extra spaces."""
        if v is None:
            return v
        v = v.strip()
        return v if v else None


class TermRead(TermBase):
    """Schema for reading Term data."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime | None


class TermInternal(TermBase):
    """Internal schema for Term (database operations)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime | None
