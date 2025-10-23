"""Pydantic schemas for Annual Holiday API validation."""

from datetime import date as date_type
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AnnualHolidayBase(BaseModel):
    """Base schema for Annual Holiday with common fields."""

    holiday_id: Annotated[
        int,
        Field(
            examples=[1],
            description="ID del grupo de asuetos (Holiday)",
        ),
    ]
    date: Annotated[
        date_type,
        Field(
            examples=["2025-05-01"],
            description="Fecha específica del asueto",
        ),
    ]
    name: Annotated[
        str,
        Field(
            min_length=1,
            max_length=100,
            examples=["Día del Trabajo"],
            description="Nombre del asueto",
        ),
    ]
    type: Annotated[
        str,
        Field(
            examples=["Asueto Nacional", "Personalizado"],
            description="Tipo de asueto",
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

    @field_validator("type")
    @classmethod
    def validate_type_allowed(cls, v: str) -> str:
        """Validate that type is one of the allowed values."""
        allowed_types = ["Asueto Nacional", "Personalizado"]
        if v not in allowed_types:
            raise ValueError(f"El tipo debe ser uno de: {', '.join(allowed_types)}")
        return v


class AnnualHolidayCreate(BaseModel):
    """Schema for creating a new Annual Holiday (custom/personalized)."""

    model_config = ConfigDict(extra="forbid")

    holiday_id: Annotated[int, Field(examples=[1], description="ID del grupo de asuetos")]
    date: Annotated[date_type, Field(examples=["2025-12-24"], description="Fecha del asueto")]
    name: Annotated[
        str,
        Field(
            min_length=1,
            max_length=100,
            examples=["Cierre Administrativo"],
            description="Nombre del asueto personalizado",
        ),
    ]
    type: Annotated[
        str,
        Field(
            default="Personalizado",
            examples=["Personalizado"],
            description="Tipo de asueto",
        ),
    ] = "Personalizado"

    @field_validator("name")
    @classmethod
    def validate_name_no_extra_spaces(cls, v: str) -> str:
        """Validate that name has no extra spaces."""
        v = v.strip()
        if not v:
            raise ValueError("El nombre no puede estar vacío")
        return v

    @field_validator("type")
    @classmethod
    def validate_type_allowed(cls, v: str) -> str:
        """Validate that type is one of the allowed values."""
        allowed_types = ["Asueto Nacional", "Personalizado"]
        if v not in allowed_types:
            raise ValueError(f"El tipo debe ser uno de: {', '.join(allowed_types)}")
        return v


class AnnualHolidayUpdate(BaseModel):
    """Schema for updating an existing Annual Holiday."""

    model_config = ConfigDict(extra="forbid")

    date: Annotated[date_type | None, Field(default=None)] = None
    name: Annotated[str | None, Field(default=None, min_length=1, max_length=100)] = None
    type: Annotated[str | None, Field(default=None)] = None

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

    @field_validator("type")
    @classmethod
    def validate_type_allowed(cls, v: str | None) -> str | None:
        """Validate that type is one of the allowed values."""
        if v is None:
            return v
        allowed_types = ["Asueto Nacional", "Personalizado"]
        if v not in allowed_types:
            raise ValueError(f"El tipo debe ser uno de: {', '.join(allowed_types)}")
        return v


class AnnualHolidayRead(AnnualHolidayBase):
    """Schema for reading Annual Holiday data."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime | None


class AnnualHolidayInternal(AnnualHolidayBase):
    """Internal schema for Annual Holiday (database operations)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime | None
