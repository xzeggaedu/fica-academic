"""Schemas de RecycleBin para validación de API."""

from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class RecycleBinBase(BaseModel):
    """Schema base de RecycleBin con campos comunes."""

    entity_type: Annotated[str, Field(min_length=1, max_length=50, examples=["faculty", "user", "course"])]
    entity_id: Annotated[
        str, Field(min_length=1, max_length=255, examples=["1", "0199de69-e329-7969-ac4f-58c199c5d4df"])
    ]
    entity_display_name: Annotated[str, Field(min_length=1, max_length=255, examples=["Facultad de Ingeniería"])]


class RecycleBinCreate(RecycleBinBase):
    """Schema para crear un nuevo registro en RecycleBin."""

    model_config = ConfigDict(extra="forbid")

    deleted_by_id: Annotated[UUID, Field(examples=["0199de69-e329-7969-ac4f-58c199c5d4df"])]
    deleted_by_name: Annotated[str, Field(min_length=1, max_length=255, examples=["Juan Pérez"])]
    reason: Annotated[str | None, Field(max_length=1000, examples=["Facultad obsoleta"], default=None)]
    can_restore: Annotated[bool, Field(default=True, examples=[True])]


class RecycleBinUpdate(BaseModel):
    """Schema para actualizar un registro en RecycleBin."""

    model_config = ConfigDict(extra="forbid")

    can_restore: Annotated[bool | None, Field(examples=[False], default=None)]
    restored_at: Annotated[datetime | None, Field(examples=[None], default=None)]
    restored_by_id: Annotated[str | None, Field(examples=[None], default=None)]
    restored_by_name: Annotated[str | None, Field(max_length=255, examples=[None], default=None)]


class RecycleBinRead(BaseModel):
    """Schema para leer datos de RecycleBin."""

    id: int
    entity_type: str
    entity_id: str
    entity_display_name: str
    deleted_by_id: UUID
    deleted_by_name: str
    deleted_at: datetime
    reason: str | None
    can_restore: bool
    restored_at: datetime | None
    restored_by_id: str | None
    restored_by_name: str | None
    created_at: datetime
    updated_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class RecycleBinRestore(BaseModel):
    """Schema para restaurar un registro desde RecycleBin."""

    model_config = ConfigDict(extra="forbid")

    restored_by_id: Annotated[
        str, Field(min_length=1, max_length=255, examples=["0199de69-e329-7969-ac4f-58c199c5d4df", "123", "admin_user"])
    ]
    restored_by_name: Annotated[str, Field(min_length=1, max_length=255, examples=["Juan Pérez"])]
