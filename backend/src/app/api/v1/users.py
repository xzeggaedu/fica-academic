import uuid as uuid_pkg
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
from ...crud.crud_faculties import get_faculty_by_uuid
from ...crud.crud_schools import get_school_by_uuid
from ...crud.crud_user_scope import create_faculty_scope, create_school_scope, delete_user_scopes, get_user_scopes
from ...crud.crud_users import crud_users
from ...models.role import UserRoleEnum
from ...schemas.user import (
    UserCreate,
    UserCreateAdmin,
    UserCreateInternal,
    UserPasswordUpdateAdmin,
    UserRead,
    UserUpdate,
    UserUpdateAdmin,
)
from ...schemas.user_scope import UserScopeAssignment, UserScopeRead

router = APIRouter(tags=["users"])


@router.get("/me", response_model=dict[str, Any])
async def get_current_user_info(current_user: Annotated[dict, Depends(get_current_user)]) -> dict[str, Any]:
    """Get current user information with RBAC claims from JWT token.

    Returns
    -------
    dict[str, Any]
        Dictionary containing current user information with RBAC claims.
    """
    return current_user


@router.get("/me/profile", response_model=UserRead)
async def get_current_user_profile(
    current_user: Annotated[dict, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(async_get_db)]
) -> UserRead:
    """Get current user profile with fresh data from database.

    Returns
    -------
    UserRead
        Current user profile with latest data from database.
    """
    user_uuid = current_user.get("user_uuid")

    if not user_uuid:
        raise UnauthorizedException("Invalid authentication token")

    db_user = await crud_users.get(db=db, uuid=user_uuid, is_deleted=False, schema_to_select=UserRead)

    if db_user is None:
        raise NotFoundException("User not found")

    return cast(UserRead, db_user)


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

    user_read = await crud_users.get(db=db, uuid=created_user.uuid, schema_to_select=UserRead)
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

    user_read = await crud_users.get(db=db, uuid=created_user.uuid, schema_to_select=UserRead)
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


@router.get("/user/uuid/{user_uuid}", response_model=UserRead)
async def read_user_by_uuid(
    request: Request,
    user_uuid: uuid_pkg.UUID,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[
        dict, Depends(get_current_user)
    ],  # ✅ Usar get_current_user en lugar de get_current_superuser
) -> UserRead:
    """Get user by UUID - Admin can see all users, regular users can only see their own profile"""
    # Verificar si el usuario es admin o está viendo su propio perfil
    current_user_role = current_user.get("role")
    current_user_uuid = current_user.get("user_uuid")

    # Si es admin, puede ver cualquier perfil
    if current_user_role == UserRoleEnum.ADMIN:
        db_user = await crud_users.get(db=db, uuid=user_uuid, is_deleted=False, schema_to_select=UserRead)
        if db_user is None:
            raise NotFoundException("User not found")
        return cast(UserRead, db_user)

    # Si no es admin, solo puede ver su propio perfil
    if current_user_uuid and str(current_user_uuid) == str(user_uuid):
        db_user = await crud_users.get(db=db, uuid=user_uuid, is_deleted=False, schema_to_select=UserRead)
        if db_user is None:
            raise NotFoundException("User not found")
        return cast(UserRead, db_user)

    # Si no es admin y no es su propio perfil, denegar acceso
    raise ForbiddenException("You can only view your own profile")


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


@router.patch("/user/uuid/{user_uuid}")
async def patch_user_by_uuid(
    request: Request,
    values: UserUpdateAdmin,
    user_uuid: uuid_pkg.UUID,
    current_user: Annotated[dict, Depends(get_current_user)],  # ✅ Usar get_current_user
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> dict[str, str]:
    """Update user by UUID - Admin can update all users, regular users can only update their own profile"""
    # Verificar permisos
    current_user_role = current_user.get("role")
    current_user_uuid = current_user.get("user_uuid")

    # Si no es admin, solo puede editar su propio perfil
    if current_user_role != UserRoleEnum.ADMIN:
        if not current_user_uuid or str(current_user_uuid) != str(user_uuid):
            raise ForbiddenException("You can only edit your own profile")

        # Los usuarios no admin no pueden cambiar su rol
        if values.role is not None:
            raise ForbiddenException("You cannot change your own role")

    db_user = await crud_users.get(db=db, uuid=user_uuid)
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

    # Verificar que el usuario existe
    db_user = await crud_users.get(db=db, uuid=user_uuid)
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

    # Filtrar campos None y realizar la actualización
    update_data = values.model_dump(exclude_none=True)
    await crud_users.update(db=db, object=update_data, uuid=user_uuid)
    await db.commit()

    return {"message": "User updated"}


@router.patch("/user/uuid/{user_uuid}/password")
async def update_user_password(
    request: Request,
    password_data: UserPasswordUpdateAdmin,
    user_uuid: uuid_pkg.UUID,
    current_user: Annotated[dict, Depends(get_current_user)],  # Cambiado a get_current_user para permitir ambos casos
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> dict[str, str]:
    """Update user password by UUID - Admin can change any password, users can only change their own"""
    db_user = await crud_users.get(db=db, uuid=user_uuid)
    if db_user is None:
        raise NotFoundException("User not found")

    current_user_role = current_user.get("role")
    current_user_uuid = current_user.get("user_uuid")

    # Verificar permisos: admin puede cambiar cualquier contraseña, usuario solo la suya
    if current_user_role != UserRoleEnum.ADMIN:
        if not current_user_uuid or str(current_user_uuid) != str(user_uuid):
            raise ForbiddenException("You can only change your own password")

    # Si se proporciona contraseña actual, verificar que sea correcta
    if password_data.current_password:
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
    await crud_users.update(db=db, object={"hashed_password": new_hashed_password}, uuid=user_uuid)
    await db.commit()  # Asegurar que se persista

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


@router.delete("/user/uuid/{user_uuid}")
async def erase_user_by_uuid(
    request: Request,
    user_uuid: uuid_pkg.UUID,
    current_user: Annotated[dict, Depends(get_current_superuser)],  # ✅ Requiere admin
    db: Annotated[AsyncSession, Depends(async_get_db)],
    token: str = Depends(oauth2_scheme),
) -> dict[str, str]:
    """Delete user by UUID - Admin only"""
    db_user = await crud_users.get(db=db, uuid=user_uuid, schema_to_select=UserRead)
    if not db_user:
        raise NotFoundException("User not found")

    await crud_users.delete(db=db, uuid=user_uuid)
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


@router.put("/user/{user_uuid}/scope", response_model=list[UserScopeRead])
async def assign_user_scope(
    request: Request,
    user_uuid: uuid_pkg.UUID,
    assignment: UserScopeAssignment,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> list[UserScopeRead]:
    """Assign hierarchical scope to a user based on their role - Admin only.

    This endpoint manages scope assignments for DIRECTOR and DECANO roles:
    - DECANO: Assign to ONE faculty (faculty_id must be provided)
    - DIRECTOR: Assign to ONE school (school_id must be provided)

    The endpoint will:
    1. Validate user exists and get their role
    2. Delete all existing scope assignments for the user
    3. Create new assignments based on role:
       - DECANO: Single faculty assignment
       - DIRECTOR: Single school assignment

    Args:
    ----
        request: FastAPI request object
        user_uuid: UUID of the user to assign scope to
        assignment: Scope assignment data (faculty_id OR school_id)
        db: Database session
        current_user: Current authenticated admin user

    Returns:
    -------
        List of created UserScope assignments

    Raises:
    ------
        NotFoundException: If user, faculty, or school not found
        ForbiddenException: If user role doesn't support scope assignment
    """
    # 1. Get user and validate existence
    db_user = await crud_users.get(db=db, uuid=user_uuid)
    if db_user is None:
        raise NotFoundException(f"User with uuid {user_uuid} not found")

    # Get user role
    if isinstance(db_user, dict):
        user_role = db_user.get("role")
    else:
        user_role = db_user.role

    # Convert to UserRoleEnum if it's a string
    if isinstance(user_role, str):
        user_role = UserRoleEnum(user_role)

    # 2. Validate role supports scope assignment
    if user_role not in [UserRoleEnum.DECANO, UserRoleEnum.DIRECTOR]:
        raise ForbiddenException(
            f"User role '{user_role.value}' does not support scope assignment. "
            "Only DECANO and DIRECTOR roles can have scope assignments."
        )

    # 3. Delete existing scope assignments
    await delete_user_scopes(db=db, user_uuid=user_uuid)

    created_scopes = []

    # 4. Create new assignments based on role
    if user_role == UserRoleEnum.DECANO:
        # DECANO: Must assign to ONE faculty
        if assignment.faculty_id is None:
            raise ForbiddenException("DECANO role requires a faculty_id assignment")
        if assignment.school_id is not None:
            raise ForbiddenException("DECANO role cannot be assigned to schools")

        # Validate faculty exists
        faculty = await get_faculty_by_uuid(db=db, faculty_id=assignment.faculty_id)
        if faculty is None:
            raise NotFoundException(f"Faculty with id '{assignment.faculty_id}' not found")

        # Create faculty scope
        scope = await create_faculty_scope(db=db, user_uuid=user_uuid, faculty_id=assignment.faculty_id)
        created_scopes.append(scope)

    elif user_role == UserRoleEnum.DIRECTOR:
        # DIRECTOR: Must assign to ONE school
        if assignment.school_id is None:
            raise ForbiddenException("DIRECTOR role requires a school_id assignment")
        if assignment.faculty_id is not None:
            raise ForbiddenException("DIRECTOR role cannot be assigned to a faculty")

        # Validate school exists
        school = await get_school_by_uuid(db=db, school_id=assignment.school_id)
        if school is None:
            raise NotFoundException(f"School with id '{assignment.school_id}' not found")

        # Create school scope
        scope = await create_school_scope(db=db, user_uuid=user_uuid, school_id=assignment.school_id)
        created_scopes.append(scope)

    # 5. Return created scopes
    return [
        UserScopeRead(
            id=scope.id,
            fk_user=scope.fk_user,
            fk_school=scope.fk_school,
            fk_faculty=scope.fk_faculty,
            assigned_at=scope.assigned_at,
        )
        for scope in created_scopes
    ]


@router.get("/user/{user_uuid}/scope", response_model=list[UserScopeRead])
async def get_user_scope_assignments(
    request: Request,
    user_uuid: uuid_pkg.UUID,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> list[UserScopeRead]:
    """Get all scope assignments for a user - Admin only.

    Args:
    ----
        request: FastAPI request object
        user_uuid: UUID of the user
        db: Database session
        current_user: Current authenticated admin user

    Returns:
    -------
        List of UserScope assignments

    Raises:
    ------
        NotFoundException: If user not found
    """
    # Validate user exists
    db_user = await crud_users.get(db=db, uuid=user_uuid)
    if db_user is None:
        raise NotFoundException(f"User with uuid {user_uuid} not found")

    # Get scopes
    scopes = await get_user_scopes(db=db, user_uuid=user_uuid)

    return [
        UserScopeRead(
            id=scope.id,
            fk_user=scope.fk_user,
            fk_school=scope.fk_school,
            fk_faculty=scope.fk_faculty,
            assigned_at=scope.assigned_at,
        )
        for scope in scopes
    ]
