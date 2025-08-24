from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Mapped

from app.user.models.user import UserRoleEnum


class UserBase(BaseModel):
    email: EmailStr
    role: Mapped[UserRoleEnum]


class UserCreate(UserBase):
    password: str


class UserSchema(UserBase):
    id: int

    class Config:
        from_attributes = True
