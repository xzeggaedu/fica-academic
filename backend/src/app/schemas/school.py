"""Schemas de Escuela para validación de API."""

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field


class SchoolBase(BaseModel):
    """Schema base de Escuela con campos comunes."""

    name: Annotated[str, Field(min_length=2, max_length=255, examples=["Escuela de Informática"])]
    acronym: Annotated[str, Field(min_length=2, max_length=20, pattern=r"^[A-Z]+$", examples=["INFO"])]


class SchoolCreate(SchoolBase):
    """Schema para crear una nueva Escuela."""

    model_config = ConfigDict(extra="forbid")

    fk_faculty: Annotated[int, Field(examples=[1])]
    is_active: Annotated[bool, Field(default=True, examples=[True])]


class SchoolUpdate(BaseModel):
    """Schema para actualizar una Escuela existente."""

    model_config = ConfigDict(extra="forbid")

    name: Annotated[str | None, Field(min_length=2, max_length=255, examples=["Escuela de Sistemas"], default=None)]
    acronym: Annotated[
        str | None, Field(min_length=2, max_length=20, pattern=r"^[A-Z]+$", examples=["SIS"], default=None)
    ]
    fk_faculty: Annotated[int | None, Field(examples=[1], default=None)]
    is_active: Annotated[bool | None, Field(examples=[True], default=None)]


class SchoolRead(BaseModel):
    """Schema para leer datos de Escuela."""

    id: int
    name: str
    acronym: str
    fk_faculty: int
    is_active: bool
    created_at: datetime
    updated_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class SchoolReadWithFaculty(SchoolRead):
    """Schema para leer datos de Escuela con facultad relacionada."""

    faculty: "FacultyRead"

    model_config = ConfigDict(from_attributes=True)


# Importar aquí para evitar dependencia circular
from .faculty import FacultyRead  # noqa: E402

SchoolReadWithFaculty.model_rebuild()
