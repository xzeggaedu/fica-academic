"""Faculty endpoints - CRUD operations for faculties (Admin only)."""

from typing import Annotated, Any, cast

from fastapi import APIRouter, Depends, Request
from fastcrud.paginated import PaginatedListResponse, compute_offset, paginated_response
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_superuser
from ...core.db.database import async_get_db
from ...core.exceptions.http_exceptions import DuplicateValueException, NotFoundException
from ...crud.crud_faculties import (
    crud_faculties,
    faculty_acronym_exists,
    faculty_exists,
    get_deleted_faculties,
    get_faculty_by_uuid,
    get_non_deleted_faculties,
    restore_faculty,
    soft_delete_faculty,
)
from ...crud.crud_recycle_bin import create_recycle_bin_entry, find_recycle_bin_entry, mark_as_restored
from ...schemas.faculty import FacultyCreate, FacultyRead, FacultyUpdate

router = APIRouter(tags=["faculties"])


@router.post("/faculty", response_model=FacultyRead, status_code=201)
async def create_faculty(
    request: Request,
    faculty: FacultyCreate,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> FacultyRead:
    """Crear una nueva facultad - Solo Admin.

    Args:
    ----
        request: Objeto request de FastAPI
        faculty: Datos de la facultad a crear
        db: Sesión de base de datos
        current_user: Usuario admin autenticado actual

    Returns:
    -------
        Datos de la facultad creada

    Raises:
    ------
        DuplicateValueException: Si el nombre o acrónimo de la facultad ya existe
    """
    # Verificar si el nombre de la facultad ya existe
    if await faculty_exists(db=db, name=faculty.name):
        raise DuplicateValueException(f"Ya existe una facultad con el nombre '{faculty.name}'")

    # Verificar si el acrónimo de la facultad ya existe
    if await faculty_acronym_exists(db=db, acronym=faculty.acronym):
        raise DuplicateValueException(f"Ya existe una facultad con el acrónimo '{faculty.acronym}'")

    # Create faculty
    created_faculty = await crud_faculties.create(db=db, object=faculty)

    # Retrieve and return the created faculty
    faculty_read = await crud_faculties.get(db=db, id=created_faculty.id, schema_to_select=FacultyRead)
    if faculty_read is None:
        raise NotFoundException("Created faculty not found")

    return cast(FacultyRead, faculty_read)


@router.get("/faculties", response_model=PaginatedListResponse[FacultyRead])
async def list_faculties(
    request: Request,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
    page: int = 1,
    items_per_page: int = 10,
    is_active: bool | None = None,
    include_deleted: bool = False,
) -> dict:
    """Obtener lista paginada de facultades - Solo Admin.

    Args:
    ----
        request: Objeto request de FastAPI
        db: Sesión de base de datos
        current_user: Usuario admin autenticado actual
        page: Número de página (default: 1)
        items_per_page: Items por página (default: 10)
        is_active: Filtrar por estado activo (opcional)
        include_deleted: Incluir facultades eliminadas (soft delete)

    Returns:
    -------
        Lista paginada de facultades
    """
    if include_deleted:
        # Si se solicitan eliminadas, usar get_deleted_faculties
        faculties_data = await get_deleted_faculties(
            db=db, offset=compute_offset(page, items_per_page), limit=items_per_page
        )
    else:
        # Por defecto, solo facultades no eliminadas
        faculties_data = await get_non_deleted_faculties(
            db=db, offset=compute_offset(page, items_per_page), limit=items_per_page, is_active=is_active
        )

    response: dict[str, Any] = paginated_response(crud_data=faculties_data, page=page, items_per_page=items_per_page)
    return response


@router.get("/faculty/{faculty_id}", response_model=FacultyRead)
async def get_faculty(
    request: Request,
    faculty_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> FacultyRead:
    """Obtener una facultad específica por UUID con sus escuelas - Solo Admin.

    Args:
    ----
        request: Objeto request de FastAPI
        faculty_id: UUID de la facultad
        db: Sesión de base de datos
        current_user: Usuario admin autenticado actual

    Returns:
    -------
        Datos de la facultad con escuelas relacionadas

    Raises:
    ------
        NotFoundException: Si la facultad no se encuentra
    """
    faculty = await get_faculty_by_uuid(db=db, faculty_id=faculty_id)
    if faculty is None:
        raise NotFoundException(f"No se encontró la facultad con id '{faculty_id}'")

    return cast(FacultyRead, faculty)


@router.patch("/faculty/{faculty_id}", response_model=FacultyRead)
async def update_faculty(
    request: Request,
    faculty_id: int,
    values: FacultyUpdate,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> FacultyRead:
    """Actualizar una facultad - Solo Admin.

    Args:
    ----
        request: Objeto request de FastAPI
        faculty_id: UUID de la facultad a actualizar
        values: Datos actualizados de la facultad
        db: Sesión de base de datos
        current_user: Usuario admin autenticado actual

    Returns:
    -------
        Datos de la facultad actualizada

    Raises:
    ------
        NotFoundException: Si la facultad no se encuentra
        DuplicateValueException: Si el nuevo nombre o acrónimo ya existe
    """
    # Verificar si la facultad existe
    db_faculty = await get_faculty_by_uuid(db=db, faculty_id=faculty_id)
    if db_faculty is None:
        raise NotFoundException(f"No se encontró la facultad con id '{faculty_id}'")

    # Verificar si el nuevo nombre entra en conflicto con una facultad existente
    if values.name is not None and values.name != db_faculty["name"]:
        if await faculty_exists(db=db, name=values.name):
            raise DuplicateValueException(f"Ya existe una facultad con el nombre '{values.name}'")

    # Verificar si el nuevo acrónimo entra en conflicto con una facultad existente
    if values.acronym is not None and values.acronym != db_faculty["acronym"]:
        if await faculty_acronym_exists(db=db, acronym=values.acronym):
            raise DuplicateValueException(f"Ya existe una facultad con el acrónimo '{values.acronym}'")

    # Update faculty
    await crud_faculties.update(db=db, object=values, id=faculty_id)

    # Retrieve and return updated faculty
    updated_faculty = await get_faculty_by_uuid(db=db, faculty_id=faculty_id)
    return cast(FacultyRead, updated_faculty)


@router.delete("/faculty/{faculty_id}", status_code=204)
async def delete_faculty(
    request: Request,
    faculty_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> None:
    """Eliminar una facultad - Solo Admin.

    Esto eliminará en cascada todas las escuelas relacionadas y asignaciones de alcance de usuario.

    Args:
    ----
        request: Objeto request de FastAPI
        faculty_id: UUID de la facultad a eliminar
        db: Sesión de base de datos
        current_user: Usuario admin autenticado actual

    Raises:
    ------
        NotFoundException: Si la facultad no se encuentra
    """
    # Verificar si la facultad existe
    db_faculty = await get_faculty_by_uuid(db=db, faculty_id=faculty_id)
    if db_faculty is None:
        raise NotFoundException(f"No se encontró la facultad con id '{faculty_id}'")

    # Delete faculty (cascade will handle related records)
    await crud_faculties.delete(db=db, id=faculty_id)


@router.patch("/faculty/soft-delete/{faculty_id}", response_model=FacultyRead)
async def soft_delete_faculty_endpoint(
    request: Request,
    faculty_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
    values: dict = None,
) -> FacultyRead:
    """Eliminar una facultad (soft delete) - Solo Admin.

    Esto marcará la facultad como eliminada pero no la removerá físicamente de la base de datos.
    También crea un registro en RecycleBin para auditoría y posible restauración.

    Args:
    ----
        request: Objeto request de FastAPI
        faculty_id: ID de la facultad a eliminar
        db: Sesión de base de datos
        current_user: Usuario admin autenticado actual

    Returns:
    -------
        Datos de la facultad eliminada

    Raises:
    ------
        NotFoundException: Si la facultad no se encuentra
    """
    # Verificar si la facultad existe
    db_faculty = await get_faculty_by_uuid(db=db, faculty_id=faculty_id)
    if db_faculty is None:
        raise NotFoundException(f"No se encontró la facultad con id '{faculty_id}'")

    # Soft delete faculty
    success = await soft_delete_faculty(db=db, faculty_id=faculty_id)
    if not success:
        raise NotFoundException(f"Error al eliminar la facultad con id '{faculty_id}'")

    # Crear registro en RecycleBin
    await create_recycle_bin_entry(
        db=db,
        entity_type="faculty",
        entity_id=str(faculty_id),
        entity_display_name=f"{db_faculty['name']} ({db_faculty['acronym']})",
        deleted_by_id=current_user["user_uuid"],
        deleted_by_name=current_user["name"],
        reason=None,  # Se puede agregar un parámetro opcional en el request
        can_restore=True,
    )

    # Retrieve and return updated faculty
    updated_faculty = await get_faculty_by_uuid(db=db, faculty_id=faculty_id)
    return cast(FacultyRead, updated_faculty)


@router.patch("/faculty/restore/{faculty_id}", response_model=FacultyRead)
async def restore_faculty_endpoint(
    request: Request,
    faculty_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
    values: dict = None,
) -> FacultyRead:
    """Restaurar una facultad eliminada (soft delete) - Solo Admin.

    Esto revertirá la eliminación de la facultad y actualizará el registro en RecycleBin.

    Args:
    ----
        request: Objeto request de FastAPI
        faculty_id: ID de la facultad a restaurar
        db: Sesión de base de datos
        current_user: Usuario admin autenticado actual

    Returns:
    -------
        Datos de la facultad restaurada

    Raises:
    ------
        NotFoundException: Si la facultad no se encuentra
    """
    # Verificar si la facultad existe
    db_faculty = await get_faculty_by_uuid(db=db, faculty_id=faculty_id)
    if db_faculty is None:
        raise NotFoundException(f"No se encontró la facultad con id '{faculty_id}'")

    # Restore faculty
    success = await restore_faculty(db=db, faculty_id=faculty_id)
    if not success:
        raise NotFoundException(f"Error al restaurar la facultad con id '{faculty_id}'")

    # Buscar y actualizar registro en RecycleBin
    recycle_bin_entry = await find_recycle_bin_entry(db=db, entity_type="faculty", entity_id=str(faculty_id))
    if recycle_bin_entry:
        await mark_as_restored(
            db=db,
            recycle_bin_id=recycle_bin_entry["id"],
            restored_by_id=current_user["user_uuid"],
            restored_by_name=current_user["name"],
        )

    # Retrieve and return updated faculty
    updated_faculty = await get_faculty_by_uuid(db=db, faculty_id=faculty_id)
    return cast(FacultyRead, updated_faculty)


@router.get("/faculties/deleted", response_model=PaginatedListResponse[FacultyRead])
async def list_deleted_faculties(
    request: Request,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
    page: int = 1,
    items_per_page: int = 10,
) -> dict:
    """Obtener lista paginada de facultades eliminadas (soft delete) - Solo Admin.

    Args:
    ----
        request: Objeto request de FastAPI
        db: Sesión de base de datos
        current_user: Usuario admin autenticado actual
        page: Número de página (default: 1)
        items_per_page: Items por página (default: 10)

    Returns:
    -------
        Lista paginada de facultades eliminadas
    """
    faculties_data = await get_deleted_faculties(
        db=db, offset=compute_offset(page, items_per_page), limit=items_per_page
    )

    response: dict[str, Any] = paginated_response(crud_data=faculties_data, page=page, items_per_page=items_per_page)
    return response
