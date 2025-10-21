"""Schemas de Pydantic para el catálogo de coordinaciones."""

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CatalogCoordinationBase(BaseModel):
    """Schema base para CatalogCoordination."""

    code: Annotated[
        str,
        Field(
            min_length=1,
            max_length=10,
            examples=["RED", "MATE", "PROG"],
            description="Código corto o abreviatura de la coordinación",
        ),
    ]
    name: Annotated[
        str,
        Field(
            min_length=1,
            max_length=100,
            examples=["Coordinación de Matemáticas"],
            description="Nombre oficial de la coordinación",
        ),
    ]
    description: Annotated[
        str | None,
        Field(default=None, examples=["Área de conocimiento de matemáticas y estadística"]),
    ]
    faculty_id: Annotated[int, Field(gt=0, examples=[1], description="ID de la facultad")]
    school_id: Annotated[int, Field(gt=0, examples=[1], description="ID de la escuela")]
    coordinator_professor_id: Annotated[
        int | None, Field(default=None, gt=0, examples=[1], description="ID del profesor coordinador")
    ]
    is_active: Annotated[bool, Field(default=True, examples=[True])]

    @field_validator("code")
    @classmethod
    def validate_code(cls, v: str) -> str:
        """Validar que el código no contenga espacios."""
        if " " in v:
            raise ValueError("El código no puede contener espacios")
        return v.strip().upper()

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validar y normalizar el nombre."""
        return v.strip()


class CatalogCoordinationCreate(CatalogCoordinationBase):
    """Schema para crear una nueva coordinación."""

    model_config = ConfigDict(extra="forbid")


class CatalogCoordinationUpdate(BaseModel):
    """Schema para actualizar una coordinación."""

    model_config = ConfigDict(extra="forbid")

    code: Annotated[
        str | None,
        Field(default=None, min_length=1, max_length=10),
    ]
    name: Annotated[str | None, Field(default=None, min_length=1, max_length=100)]
    description: str | None = None
    faculty_id: Annotated[int | None, Field(default=None, gt=0)]
    school_id: Annotated[int | None, Field(default=None, gt=0)]
    coordinator_professor_id: int | None = None
    is_active: bool | None = None
    deleted: bool | None = None
    deleted_at: datetime | None = None

    @field_validator("code")
    @classmethod
    def validate_code(cls, v: str | None) -> str | None:
        """Validar que el código no contenga espacios."""
        if v is None:
            return v
        if " " in v:
            raise ValueError("El código no puede contener espacios")
        return v.strip().upper()

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        """Validar y normalizar el nombre."""
        if v is None:
            return v
        return v.strip()


class CatalogCoordinationRead(CatalogCoordinationBase):
    """Schema para leer datos de coordinación."""

    id: int
    deleted: bool
    created_at: datetime
    updated_at: datetime | None
    deleted_at: datetime | None

    model_config = ConfigDict(from_attributes=True)
