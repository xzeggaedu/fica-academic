# app/user/schemas/user.py
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.user.models.user import UserRoleEnum


class UserBase(BaseModel):
    email: EmailStr
    role: Optional[UserRoleEnum] = Field(
        default=None,
        description=(
            "Rol asignado al usuario. "
            "Si se omite se usará el valor por defecto "
            "definido en el modelo."
        ),
    )


class UserCreate(UserBase):
    """Esquema para registro/creación de usuarios.
    Incluye contraseña en texto plano."""

    password: str


class UserOut(BaseModel):
    """Esquema para exponer datos de usuario a clientes.
    No expone hashed_password."""

    id: int
    email: EmailStr
    role: UserRoleEnum
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True  # Permite construir a partir de ORM
