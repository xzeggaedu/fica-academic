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

    @field_validator("fk_school", "fk_faculty")
    @classmethod
    def validate_exclusive_scope(cls, v, info):
        """Validar que solo uno de fk_school o fk_faculty esté establecido."""
        values = info.data
        fk_school = values.get("fk_school") if "fk_school" in values else v if info.field_name == "fk_school" else None
        fk_faculty = (
            values.get("fk_faculty") if "fk_faculty" in values else v if info.field_name == "fk_faculty" else None
        )

        if fk_school and fk_faculty:
            raise ValueError("Solo uno de fk_school o fk_faculty puede estar establecido")
        if not fk_school and not fk_faculty:
            raise ValueError("Ya sea fk_school o fk_faculty debe estar establecido")

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

    - Para DECANO: Proporcionar un solo faculty_id
    - Para DIRECTOR: Proporcionar un solo school_id
    """

    model_config = ConfigDict(extra="forbid")

    faculty_id: Annotated[int | None, Field(default=None, examples=[1])]
    school_id: Annotated[int | None, Field(default=None, examples=[1])]

    @field_validator("faculty_id", "school_id")
    @classmethod
    def validate_exclusive_assignment(cls, v, info):
        """Validar que solo uno de faculty_id o school_id sea proporcionado."""
        values = info.data
        faculty_id = (
            values.get("faculty_id") if "faculty_id" in values else v if info.field_name == "faculty_id" else None
        )
        school_id = (
            values.get("school_id") if "school_id" in values else v if info.field_name == "school_id" else None
        )

        if faculty_id and school_id:
            raise ValueError("Solo uno de faculty_id o school_id puede ser proporcionado")
        if not faculty_id and not school_id:
            raise ValueError("Ya sea faculty_id o school_id debe ser proporcionado")

        return v
