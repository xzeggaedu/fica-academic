"""Schemas de Facultad para validación de API."""

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field


class FacultyBase(BaseModel):
    """Schema base de Facultad con campos comunes."""

    name: Annotated[str, Field(min_length=2, max_length=255, examples=["Facultad de Ingeniería"])]
    acronym: Annotated[str, Field(min_length=2, max_length=20, pattern=r"^[A-Z]+$", examples=["FICA"])]


class FacultyCreate(FacultyBase):
    """Schema para crear una nueva Facultad."""

    model_config = ConfigDict(extra="forbid")

    is_active: Annotated[bool, Field(default=True, examples=[True])]


class FacultyUpdate(BaseModel):
    """Schema para actualizar una Facultad existente."""

    model_config = ConfigDict(extra="forbid")

    name: Annotated[str | None, Field(min_length=2, max_length=255, examples=["Facultad de Ciencias"], default=None)]
    acronym: Annotated[
        str | None, Field(min_length=2, max_length=20, pattern=r"^[A-Z]+$", examples=["FC"], default=None)
    ]
    is_active: Annotated[bool | None, Field(examples=[True], default=None)]
    deleted: Annotated[bool | None, Field(examples=[False], default=None)]
    deleted_at: Annotated[datetime | None, Field(examples=[None], default=None)]


class FacultyRead(BaseModel):
    """Schema para leer datos de Facultad."""

    id: int
    name: str
    acronym: str
    is_active: bool
    deleted: bool
    created_at: datetime
    updated_at: datetime | None
    deleted_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class FacultyReadWithSchools(FacultyRead):
    """Schema para leer datos de Facultad con escuelas relacionadas."""

    schools: list["SchoolRead"] = []

    model_config = ConfigDict(from_attributes=True)


# Importar aquí para evitar dependencia circular
from .school import SchoolRead  # noqa: E402

FacultyReadWithSchools.model_rebuild()
