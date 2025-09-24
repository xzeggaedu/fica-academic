from typing import Annotated, Any, cast

from fastapi import APIRouter, Depends, Request
from fastcrud.paginated import PaginatedListResponse, compute_offset, paginated_response
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_superuser, get_current_user
from ...core.db.database import async_get_db
from ...core.exceptions.http_exceptions import (
    DuplicateValueException,
    ForbiddenException,
    NotFoundException,
    UnauthorizedException,
)
from ...core.security import blacklist_token, get_password_hash, oauth2_scheme, verify_password
from ...crud.crud_users import crud_users
from ...schemas.user import (
    UserCreate,
    UserCreateAdmin,
    UserCreateInternal,
    UserPasswordUpdate,
    UserRead,
    UserUpdate,
    UserUpdateAdmin,
)

router = APIRouter(tags=["users"])


@router.get("/me", response_model=dict[str, Any])
async def get_current_user_info(current_user: Annotated[dict, Depends(get_current_user)]) -> dict[str, Any]:
    """Get current user information with RBAC claims.

    Returns
    -------
    dict[str, Any]
        Dictionary containing current user information with RBAC claims.
    """
    return current_user


@router.post("/user", response_model=UserRead, status_code=201)
async def write_user(
    request: Request,
    user: UserCreate,
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> UserRead:
    """Create a new user - Public endpoint for registration"""
    email_row = await crud_users.exists(db=db, email=user.email)
    if email_row:
        raise DuplicateValueException("Email is already registered")

    username_row = await crud_users.exists(db=db, username=user.username)
    if username_row:
        raise DuplicateValueException("Username not available")

    user_internal_dict = user.model_dump()
    user_internal_dict["hashed_password"] = get_password_hash(password=user_internal_dict["password"])
    del user_internal_dict["password"]

    user_internal = UserCreateInternal(**user_internal_dict)
    created_user = await crud_users.create(db=db, object=user_internal)

    user_read = await crud_users.get(db=db, id=created_user.id, schema_to_select=UserRead)
    if user_read is None:
        raise NotFoundException("Created user not found")

    return cast(UserRead, user_read)


@router.post("/user/admin", response_model=UserRead, status_code=201)
async def create_user_as_admin(
    request: Request,
    user: UserCreateAdmin,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # ✅ Requiere admin
) -> UserRead:
    """Create a new user with specific role - Admin only"""
    email_row = await crud_users.exists(db=db, email=user.email)
    if email_row:
        raise DuplicateValueException("Email is already registered")

    username_row = await crud_users.exists(db=db, username=user.username)
    if username_row:
        raise DuplicateValueException("Username not available")

    user_internal_dict = user.model_dump()
    user_internal_dict["hashed_password"] = get_password_hash(password=user_internal_dict["password"])
    del user_internal_dict["password"]

    user_internal = UserCreateInternal(**user_internal_dict)
    created_user = await crud_users.create(db=db, object=user_internal)

    user_read = await crud_users.get(db=db, id=created_user.id, schema_to_select=UserRead)
    if user_read is None:
        raise NotFoundException("Created user not found")

    return cast(UserRead, user_read)


@router.get("/users", response_model=PaginatedListResponse[UserRead])
async def read_users(
    request: Request,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # ✅ Requiere admin
    page: int = 1,
    items_per_page: int = 10,
) -> dict:
    users_data = await crud_users.get_multi(
        db=db,
        offset=compute_offset(page, items_per_page),
        limit=items_per_page,
        is_deleted=False,
    )

    response: dict[str, Any] = paginated_response(crud_data=users_data, page=page, items_per_page=items_per_page)
    return response


@router.get("/user/me/", response_model=UserRead)
async def read_users_me(request: Request, current_user: Annotated[dict, Depends(get_current_user)]) -> dict:
    return current_user


@router.get("/user/{username}", response_model=UserRead)
async def read_user(request: Request, username: str, db: Annotated[AsyncSession, Depends(async_get_db)]) -> UserRead:
    db_user = await crud_users.get(db=db, username=username, is_deleted=False, schema_to_select=UserRead)
    if db_user is None:
        raise NotFoundException("User not found")

    return cast(UserRead, db_user)


@router.get("/user/id/{user_id}", response_model=UserRead)
async def read_user_by_id(
    request: Request,
    user_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # ✅ Requiere admin
) -> UserRead:
    """Get user by ID - Admin only"""
    db_user = await crud_users.get(db=db, id=user_id, is_deleted=False, schema_to_select=UserRead)
    if db_user is None:
        raise NotFoundException("User not found")

    return cast(UserRead, db_user)


@router.patch("/user/{username}")
async def patch_user(
    request: Request,
    values: UserUpdate,
    username: str,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> dict[str, str]:
    db_user = await crud_users.get(db=db, username=username)
    if db_user is None:
        raise NotFoundException("User not found")

    if isinstance(db_user, dict):
        db_username = db_user["username"]
        db_email = db_user["email"]
    else:
        db_username = db_user.username
        db_email = db_user.email

    if db_username != current_user["username"]:
        raise ForbiddenException()

    if values.email is not None and values.email != db_email:
        if await crud_users.exists(db=db, email=values.email):
            raise DuplicateValueException("Email is already registered")

    if values.username is not None and values.username != db_username:
        if await crud_users.exists(db=db, username=values.username):
            raise DuplicateValueException("Username not available")

    await crud_users.update(db=db, object=values, username=username)
    return {"message": "User updated"}


@router.patch("/user/id/{user_id}")
async def patch_user_by_id(
    request: Request,
    values: UserUpdateAdmin,
    user_id: int,
    current_user: Annotated[dict, Depends(get_current_superuser)],  # ✅ Requiere admin
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> dict[str, str]:
    """Update user by ID including role - Admin only"""
    db_user = await crud_users.get(db=db, id=user_id)
    if db_user is None:
        raise NotFoundException("User not found")

    if isinstance(db_user, dict):
        db_username = db_user["username"]
        db_email = db_user["email"]
    else:
        db_username = db_user.username
        db_email = db_user.email

    if values.email is not None and values.email != db_email:
        if await crud_users.exists(db=db, email=values.email):
            raise DuplicateValueException("Email is already registered")

    if values.username is not None and values.username != db_username:
        if await crud_users.exists(db=db, username=values.username):
            raise DuplicateValueException("Username not available")

    await crud_users.update(db=db, object=values, id=user_id)
    return {"message": "User updated"}


@router.patch("/user/id/{user_id}/password")
async def update_user_password(
    request: Request,
    password_data: UserPasswordUpdate,
    user_id: int,
    current_user: Annotated[dict, Depends(get_current_superuser)],  # ✅ Requiere admin
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> dict[str, str]:
    """Update user password by ID - Admin only"""
    db_user = await crud_users.get(db=db, id=user_id)
    if db_user is None:
        raise NotFoundException("User not found")

    # Handle both dict and object responses
    if isinstance(db_user, dict):
        hashed_password = db_user["hashed_password"]
    else:
        hashed_password = db_user.hashed_password

    # Verify current password
    if not await verify_password(password_data.current_password, hashed_password):
        raise UnauthorizedException("Current password is incorrect")

    # Hash new password
    new_hashed_password = get_password_hash(password=password_data.new_password)

    # Update password
    await crud_users.update(db=db, object={"hashed_password": new_hashed_password}, id=user_id)
    return {"message": "Password updated successfully"}


@router.delete("/user/{username}")
async def erase_user(
    request: Request,
    username: str,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
    token: str = Depends(oauth2_scheme),
) -> dict[str, str]:
    db_user = await crud_users.get(db=db, username=username, schema_to_select=UserRead)
    if not db_user:
        raise NotFoundException("User not found")

    if username != current_user["username"]:
        raise ForbiddenException()

    await crud_users.delete(db=db, username=username)
    await blacklist_token(token=token, db=db)
    return {"message": "User deleted"}


@router.delete("/user/id/{user_id}")
async def erase_user_by_id(
    request: Request,
    user_id: int,
    current_user: Annotated[dict, Depends(get_current_superuser)],  # ✅ Requiere admin
    db: Annotated[AsyncSession, Depends(async_get_db)],
    token: str = Depends(oauth2_scheme),
) -> dict[str, str]:
    """Delete user by ID - Admin only"""
    db_user = await crud_users.get(db=db, id=user_id, schema_to_select=UserRead)
    if not db_user:
        raise NotFoundException("User not found")

    await crud_users.delete(db=db, id=user_id)
    # ❌ Removido: await blacklist_token(token=token, db=db)
    # No debemos invalidar el token del admin que está eliminando
    return {"message": "User deleted"}


@router.delete("/db_user/{username}", dependencies=[Depends(get_current_superuser)])
async def erase_db_user(
    request: Request,
    username: str,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    token: str = Depends(oauth2_scheme),
) -> dict[str, str]:
    db_user = await crud_users.exists(db=db, username=username)
    if not db_user:
        raise NotFoundException("User not found")

    await crud_users.db_delete(db=db, username=username)
    await blacklist_token(token=token, db=db)
    return {"message": "User deleted from the database"}
