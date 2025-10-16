import uuid as uuid_pkg
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from ..core.schemas import PersistentDeletion, TimestampSchema, UUIDSchema
from ..models.role import UserRoleEnum


class UserBase(BaseModel):
    name: Annotated[str, Field(min_length=2, max_length=30, examples=["User Userson"])]
    username: Annotated[
        str,
        Field(min_length=2, max_length=20, pattern=r"^[a-z0-9]+$", examples=["userson"]),
    ]
    email: Annotated[EmailStr, Field(examples=["user.userson@example.com"])]


class User(TimestampSchema, UserBase, UUIDSchema, PersistentDeletion):
    profile_image_url: Annotated[str, Field(default="https://www.profileimageurl.com")]
    hashed_password: str
    role: UserRoleEnum = UserRoleEnum.UNAUTHORIZED


class UserRead(BaseModel):
    uuid: uuid_pkg.UUID

    name: Annotated[str, Field(min_length=2, max_length=30, examples=["User Userson"])]
    username: Annotated[
        str,
        Field(min_length=2, max_length=20, pattern=r"^[a-z0-9]+$", examples=["userson"]),
    ]
    email: Annotated[EmailStr, Field(examples=["user.userson@example.com"])]
    profile_image_url: str
    role: UserRoleEnum
    deleted: bool
    created_at: datetime
    deleted_at: datetime | None


class UserCreate(UserBase):
    model_config = ConfigDict(extra="forbid")

    password: Annotated[
        str,
        Field(
            pattern=r"^.{8,}|[0-9]+|[A-Z]+|[a-z]+|[^a-zA-Z0-9]+$",
            examples=["Str1ngst!"],
        ),
    ]


class UserCreateAdmin(UserBase):
    """Schema for admin to create users with specific roles."""

    model_config = ConfigDict(extra="forbid")

    password: Annotated[
        str,
        Field(
            pattern=r"^.{8,}|[0-9]+|[A-Z]+|[a-z]+|[^a-zA-Z0-9]+$",
            examples=["Str1ngst!"],
        ),
    ]
    profile_image_url: Annotated[
        str,
        Field(
            pattern=r"^(https?|ftp)://[^\s/$.?#].[^\s]*$",
            examples=["https://www.profileimageurl.com"],
            default="https://www.profileimageurl.com",
        ),
    ]
    role: Annotated[UserRoleEnum, Field(default=UserRoleEnum.UNAUTHORIZED)]


class UserCreateInternal(UserBase):
    hashed_password: str
    profile_image_url: str = "https://www.profileimageurl.com"
    role: UserRoleEnum = UserRoleEnum.UNAUTHORIZED


class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Annotated[
        str | None,
        Field(min_length=2, max_length=30, examples=["User Userberg"], default=None),
    ]
    username: Annotated[
        str | None,
        Field(
            min_length=2,
            max_length=20,
            pattern=r"^[a-z0-9]+$",
            examples=["userberg"],
            default=None,
        ),
    ]
    email: Annotated[EmailStr | None, Field(examples=["user.userberg@example.com"], default=None)]
    profile_image_url: Annotated[
        str | None,
        Field(
            pattern=r"^(https?|ftp)://[^\s/$.?#].[^\s]*$",
            examples=["https://www.profileimageurl.com"],
            default=None,
        ),
    ]


class UserUpdateAdmin(UserUpdate):
    """Schema for admin to update users including role changes."""

    role: Annotated[UserRoleEnum | None, Field(default=None)]
    deleted: Annotated[bool | None, Field(default=None)]
    deleted_at: Annotated[datetime | None, Field(default=None)]


class UserUpdateInternal(UserUpdate):
    updated_at: datetime


class UserDelete(BaseModel):
    model_config = ConfigDict(extra="forbid")

    deleted: bool
    deleted_at: datetime


class UserPasswordUpdate(BaseModel):
    """Schema for password update with current password verification."""

    model_config = ConfigDict(extra="forbid")

    current_password: Annotated[
        str,
        Field(
            min_length=1,
            examples=["CurrentPassword123!"],
        ),
    ]
    new_password: Annotated[
        str,
        Field(
            pattern=r"^.{8,}|[0-9]+|[A-Z]+|[a-z]+|[^a-zA-Z0-9]+$",
            examples=["NewPassword123!"],
        ),
    ]


class UserPasswordUpdateAdmin(BaseModel):
    """Schema for admin password update without current password verification."""

    model_config = ConfigDict(extra="forbid")

    current_password: Annotated[
        str | None,
        Field(
            default=None,
            min_length=1,
            examples=["CurrentPassword123!"],
        ),
    ]
    new_password: Annotated[
        str,
        Field(
            pattern=r"^.{8,}|[0-9]+|[A-Z]+|[a-z]+|[^a-zA-Z0-9]+$",
            examples=["NewPassword123!"],
        ),
    ]


class UserRestoreDeleted(BaseModel):
    deleted: bool
