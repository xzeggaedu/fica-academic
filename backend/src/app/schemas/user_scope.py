"""Schemas de Alcance de Usuario para validación de API."""

import uuid as uuid_pkg
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator


class UserScopeBase(BaseModel):
    """Schema base de Alcance de Usuario."""

    fk_user: uuid_pkg.UUID
    fk_school: int | None = None
    fk_faculty: int | None = None

    @field_validator("fk_faculty", mode="after")
    @classmethod
    def validate_at_least_one_scope(cls, v, info):
        """Validar que al menos uno de fk_school o fk_faculty esté establecido.

        Casos permitidos:
        - DECANO: solo fk_faculty (fk_school = None)
        - DIRECTOR: fk_school y fk_faculty (ambos NOT NULL)
        """
        values = info.data
        fk_school = values.get("fk_school")
        fk_faculty = v

        if not fk_school and not fk_faculty:
            raise ValueError("Al menos uno de fk_school o fk_faculty debe estar establecido")

        return v


class UserScopeCreate(UserScopeBase):
    """Schema para crear una nueva asignación de Alcance de Usuario."""

    model_config = ConfigDict(extra="forbid")


class UserScopeRead(UserScopeBase):
    """Schema para leer datos de Alcance de Usuario."""

    id: int
    assigned_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserScopeAssignment(BaseModel):
    """Schema para asignar alcance a un usuario basado en su rol.

    - Para DECANO: Proporcionar solo faculty_id (school_id debe ser None)
    - Para DIRECTOR: Proporcionar ambos faculty_id y school_id

    Nota: La validación específica del rol se realiza en el endpoint.
    """

    model_config = ConfigDict(extra="forbid")

    faculty_id: Annotated[int | None, Field(default=None, examples=[1])]
    school_id: Annotated[int | None, Field(default=None, examples=[1])]

    @field_validator("faculty_id", "school_id")
    @classmethod
    def validate_at_least_one_assignment(cls, v, info):
        """Validar que al menos uno de faculty_id o school_id sea proporcionado."""
        values = info.data
        faculty_id = (
            values.get("faculty_id") if "faculty_id" in values else v if info.field_name == "faculty_id" else None
        )
        school_id = values.get("school_id") if "school_id" in values else v if info.field_name == "school_id" else None

        if not faculty_id and not school_id:
            raise ValueError("Al menos uno de faculty_id o school_id debe ser proporcionado")

        return v
