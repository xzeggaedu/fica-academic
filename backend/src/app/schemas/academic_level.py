"""Pydantic schemas for Academic Level API validation."""

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AcademicLevelBase(BaseModel):
    """Base schema for Academic Level with common fields."""

    code: Annotated[
        str,
        Field(
            min_length=1,
            max_length=10,
            examples=["BLG", "DR", "GDO"],
            description="Código único del nivel académico (ej: BLG, DR, GDO)",
        ),
    ]
    name: Annotated[
        str,
        Field(
            min_length=1,
            max_length=100,
            examples=["Doctorado", "Bilingüe"],
            description="Nombre descriptivo del nivel académico",
        ),
    ]
    priority: Annotated[
        int,
        Field(
            ge=1,
            le=5,
            examples=[5],
            description="Prioridad de pago (5 = más alta, 1 = base)",
        ),
    ]
    description: Annotated[
        str | None,
        Field(default=None, description="Descripción detallada opcional"),
    ] = None
    is_active: Annotated[bool, Field(default=True, description="Estado activo/inactivo")] = True

    @field_validator("code")
    @classmethod
    def validate_code_uppercase(cls, v: str) -> str:
        """Validate that code is uppercase and has no spaces."""
        v = v.strip().upper()
        if " " in v:
            raise ValueError("El código no puede contener espacios")
        return v

    @field_validator("name")
    @classmethod
    def validate_name_no_extra_spaces(cls, v: str) -> str:
        """Validate that name has no extra spaces."""
        v = v.strip()
        if not v:
            raise ValueError("El nombre no puede estar vacío")
        return v


class AcademicLevelCreate(BaseModel):
    """Schema for creating a new Academic Level."""

    model_config = ConfigDict(extra="forbid")

    code: Annotated[
        str,
        Field(
            min_length=1,
            max_length=10,
            examples=["BLG"],
            description="Código único del nivel académico",
        ),
    ]
    name: Annotated[
        str,
        Field(
            min_length=1,
            max_length=100,
            examples=["Bilingüe (Clase y Profesor)"],
            description="Nombre descriptivo del nivel académico",
        ),
    ]
    priority: Annotated[
        int,
        Field(
            ge=1,
            le=5,
            examples=[5],
            description="Prioridad de pago (5 = más alta, 1 = base)",
        ),
    ]
    description: Annotated[
        str | None,
        Field(default=None, description="Descripción detallada opcional"),
    ] = None
    is_active: Annotated[bool, Field(default=True, description="Estado activo/inactivo")] = True

    @field_validator("code")
    @classmethod
    def validate_code_uppercase(cls, v: str) -> str:
        """Validate that code is uppercase and has no spaces."""
        v = v.strip().upper()
        if " " in v:
            raise ValueError("El código no puede contener espacios")
        return v

    @field_validator("name")
    @classmethod
    def validate_name_no_extra_spaces(cls, v: str) -> str:
        """Validate that name has no extra spaces."""
        v = v.strip()
        if not v:
            raise ValueError("El nombre no puede estar vacío")
        return v


class AcademicLevelUpdate(BaseModel):
    """Schema for updating an existing Academic Level."""

    model_config = ConfigDict(extra="forbid")

    code: Annotated[str | None, Field(default=None, min_length=1, max_length=10)] = None
    name: Annotated[str | None, Field(default=None, min_length=1, max_length=100)] = None
    priority: Annotated[int | None, Field(default=None, ge=1, le=5)] = None
    description: Annotated[str | None, Field(default=None)] = None
    is_active: Annotated[bool | None, Field(default=None)] = None

    @field_validator("code")
    @classmethod
    def validate_code_uppercase(cls, v: str | None) -> str | None:
        """Validate that code is uppercase and has no spaces."""
        if v is None:
            return v
        v = v.strip().upper()
        if " " in v:
            raise ValueError("El código no puede contener espacios")
        return v

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


class AcademicLevelRead(AcademicLevelBase):
    """Schema for reading Academic Level data."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime | None


class AcademicLevelInternal(AcademicLevelBase):
    """Internal schema for Academic Level (database operations)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime | None
