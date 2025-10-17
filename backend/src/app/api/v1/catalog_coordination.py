"""Endpoints de API para el catálogo de coordinaciones."""

from typing import Annotated, Any, cast

from fastapi import APIRouter, Depends, Request, status
from fastcrud.paginated import PaginatedListResponse, compute_offset, paginated_response
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_superuser, get_current_user
from ...core.db.database import async_get_db
from ...core.exceptions.http_exceptions import DuplicateValueException, NotFoundException
from ...crud.crud_catalog_coordination import (
    coordination_code_exists,
    coordination_name_exists,
    crud_catalog_coordination,
    get_deleted_coordinations,
    get_non_deleted_coordinations,
    restore_coordination,
    soft_delete_coordination,
)
from ...crud.crud_recycle_bin import create_recycle_bin_entry, find_recycle_bin_entry, mark_as_restored
from ...schemas.catalog_coordination import (
    CatalogCoordinationCreate,
    CatalogCoordinationRead,
    CatalogCoordinationUpdate,
)

router = APIRouter(prefix="/catalog/coordinations", tags=["catalog-coordinations"])


@router.post("", response_model=CatalogCoordinationRead, status_code=status.HTTP_201_CREATED)
async def create_coordination(
    request: Request,
    coordination: CatalogCoordinationCreate,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> CatalogCoordinationRead:
    """Crear una nueva coordinación - Solo Admin.

    Args:
    ----
        request: Objeto request de FastAPI
        coordination: Datos de la coordinación a crear
        db: Sesión de base de datos
        current_user: Usuario admin autenticado actual

    Returns:
    -------
        Datos de la coordinación creada

    Raises:
    ------
        DuplicateValueException: Si el código o nombre ya existe
        NotFoundException: Si la facultad o profesor no existe
    """
    # Verificar si el código ya existe
    if await coordination_code_exists(db=db, code=coordination.code):
        raise DuplicateValueException(f"Ya existe una coordinación con el código '{coordination.code}'")

    # Verificar si el nombre ya existe
    if await coordination_name_exists(db=db, name=coordination.name):
        raise DuplicateValueException(f"Ya existe una coordinación con el nombre '{coordination.name}'")

    # Crear coordinación
    created_coordination = await crud_catalog_coordination.create(db=db, object=coordination)

    # Recuperar y retornar la coordinación creada
    coordination_read = await crud_catalog_coordination.get(
        db=db, id=created_coordination.id, schema_to_select=CatalogCoordinationRead
    )
    if coordination_read is None:
        raise NotFoundException("Coordinación creada no encontrada")

    return cast(CatalogCoordinationRead, coordination_read)


@router.get("", response_model=PaginatedListResponse[CatalogCoordinationRead])
async def list_coordinations(
    request: Request,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],  # All authenticated users
    page: int = 1,
    items_per_page: int = 10,
    is_active: bool | None = None,
    include_deleted: bool = False,
    faculty_id: int | None = None,
) -> dict:
    """Obtener lista paginada de coordinaciones - Accesible para todos los usuarios autenticados.

    Args:
    ----
        request: Objeto request de FastAPI
        db: Sesión de base de datos
        current_user: Usuario autenticado actual
        page: Número de página (default: 1)
        items_per_page: Items por página (default: 10)
        is_active: Filtrar por estado activo (opcional)
        include_deleted: Incluir coordinaciones eliminadas (soft delete)
        faculty_id: Filtrar por facultad (opcional)

    Returns:
    -------
        Lista paginada de coordinaciones
    """
    if include_deleted:
        coordinations_data = await get_deleted_coordinations(
            db=db, offset=compute_offset(page, items_per_page), limit=items_per_page
        )
    else:
        coordinations_data = await get_non_deleted_coordinations(
            db=db, offset=compute_offset(page, items_per_page), limit=items_per_page, is_active=is_active
        )

    # Filtrar por faculty_id si se proporciona
    if faculty_id is not None:
        # Aplicar filtro adicional
        coordinations_data["data"] = [c for c in coordinations_data["data"] if c.get("faculty_id") == faculty_id]
        coordinations_data["total_count"] = len(coordinations_data["data"])

    response: dict[str, Any] = paginated_response(
        crud_data=coordinations_data, page=page, items_per_page=items_per_page
    )
    return response


@router.get("/{coordination_id}", response_model=CatalogCoordinationRead)
async def get_coordination(
    request: Request,
    coordination_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],  # All authenticated users
) -> CatalogCoordinationRead:
    """Obtener una coordinación específica por ID - Accesible para todos los usuarios autenticados.

    Args:
    ----
        request: Objeto request de FastAPI
        coordination_id: ID de la coordinación
        db: Sesión de base de datos
        current_user: Usuario autenticado actual

    Returns:
    -------
        Datos de la coordinación

    Raises:
    ------
        NotFoundException: Si la coordinación no se encuentra
    """
    coordination = await crud_catalog_coordination.get(db=db, id=coordination_id)
    if coordination is None:
        raise NotFoundException(f"No se encontró la coordinación con id '{coordination_id}'")

    return cast(CatalogCoordinationRead, coordination)


@router.patch("/{coordination_id}", response_model=CatalogCoordinationRead)
async def update_coordination(
    request: Request,
    coordination_id: int,
    values: CatalogCoordinationUpdate,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> CatalogCoordinationRead:
    """Actualizar una coordinación - Solo Admin.

    Args:
    ----
        request: Objeto request de FastAPI
        coordination_id: ID de la coordinación a actualizar
        values: Datos actualizados de la coordinación
        db: Sesión de base de datos
        current_user: Usuario admin autenticado actual

    Returns:
    -------
        Datos de la coordinación actualizada

    Raises:
    ------
        NotFoundException: Si la coordinación no se encuentra
        DuplicateValueException: Si el nuevo código o nombre ya existe
    """
    # Verificar si la coordinación existe
    db_coordination = await crud_catalog_coordination.get(db=db, id=coordination_id)
    if db_coordination is None:
        raise NotFoundException(f"No se encontró la coordinación con id '{coordination_id}'")

    # Verificar si el nuevo código entra en conflicto
    if values.code is not None and values.code != db_coordination["code"]:
        if await coordination_code_exists(db=db, code=values.code):
            raise DuplicateValueException(f"Ya existe una coordinación con el código '{values.code}'")

    # Verificar si el nuevo nombre entra en conflicto
    if values.name is not None and values.name != db_coordination["name"]:
        if await coordination_name_exists(db=db, name=values.name):
            raise DuplicateValueException(f"Ya existe una coordinación con el nombre '{values.name}'")

    # Actualizar coordinación
    await crud_catalog_coordination.update(db=db, object=values, id=coordination_id)

    # Recuperar y retornar coordinación actualizada
    updated_coordination = await crud_catalog_coordination.get(db=db, id=coordination_id)
    return cast(CatalogCoordinationRead, updated_coordination)


@router.delete("/{coordination_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_coordination(
    request: Request,
    coordination_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> None:
    """Eliminar una coordinación (hard delete) - Solo Admin.

    Args:
    ----
        request: Objeto request de FastAPI
        coordination_id: ID de la coordinación a eliminar
        db: Sesión de base de datos
        current_user: Usuario admin autenticado actual

    Raises:
    ------
        NotFoundException: Si la coordinación no se encuentra
    """
    # Verificar si la coordinación existe
    db_coordination = await crud_catalog_coordination.get(db=db, id=coordination_id)
    if db_coordination is None:
        raise NotFoundException(f"No se encontró la coordinación con id '{coordination_id}'")

    # Eliminar coordinación
    await crud_catalog_coordination.delete(db=db, id=coordination_id)


@router.patch("/soft-delete/{coordination_id}", response_model=CatalogCoordinationRead)
async def soft_delete_coordination_endpoint(
    request: Request,
    coordination_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
    values: dict = None,
) -> CatalogCoordinationRead:
    """Eliminar una coordinación (soft delete) - Solo Admin.

    Esto marcará la coordinación como eliminada pero no la removerá físicamente de la base de datos.
    También crea un registro en RecycleBin para auditoría y posible restauración.

    Args:
    ----
        request: Objeto request de FastAPI
        coordination_id: ID de la coordinación a eliminar
        db: Sesión de base de datos
        current_user: Usuario admin autenticado actual

    Returns:
    -------
        Datos de la coordinación eliminada

    Raises:
    ------
        NotFoundException: Si la coordinación no se encuentra
    """
    # Verificar si la coordinación existe
    db_coordination = await crud_catalog_coordination.get(db=db, id=coordination_id)
    if db_coordination is None:
        raise NotFoundException(f"No se encontró la coordinación con id '{coordination_id}'")

    # Soft delete coordination
    success = await soft_delete_coordination(db=db, coordination_id=coordination_id)
    if not success:
        raise NotFoundException(f"Error al eliminar la coordinación con id '{coordination_id}'")

    # Crear registro en RecycleBin
    await create_recycle_bin_entry(
        db=db,
        entity_type="coordination",
        entity_id=str(coordination_id),
        entity_display_name=f"{db_coordination['name']} ({db_coordination['code']})",
        deleted_by_id=current_user["user_uuid"],
        deleted_by_name=current_user["name"],
        reason=None,
        can_restore=True,
    )

    # Retrieve and return updated coordination
    updated_coordination = await crud_catalog_coordination.get(db=db, id=coordination_id)
    return cast(CatalogCoordinationRead, updated_coordination)


@router.patch("/restore/{coordination_id}", response_model=CatalogCoordinationRead)
async def restore_coordination_endpoint(
    request: Request,
    coordination_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
    values: dict = None,
) -> CatalogCoordinationRead:
    """Restaurar una coordinación eliminada (soft delete) - Solo Admin.

    Esto revertirá la eliminación de la coordinación y actualizará el registro en RecycleBin.

    Args:
    ----
        request: Objeto request de FastAPI
        coordination_id: ID de la coordinación a restaurar
        db: Sesión de base de datos
        current_user: Usuario admin autenticado actual

    Returns:
    -------
        Datos de la coordinación restaurada

    Raises:
    ------
        NotFoundException: Si la coordinación no se encuentra
    """
    # Verificar si la coordinación existe
    db_coordination = await crud_catalog_coordination.get(db=db, id=coordination_id)
    if db_coordination is None:
        raise NotFoundException(f"No se encontró la coordinación con id '{coordination_id}'")

    # Restore coordination
    success = await restore_coordination(db=db, coordination_id=coordination_id)
    if not success:
        raise NotFoundException(f"Error al restaurar la coordinación con id '{coordination_id}'")

    # Buscar y actualizar registro en RecycleBin
    recycle_bin_entry = await find_recycle_bin_entry(db=db, entity_type="coordination", entity_id=str(coordination_id))
    if recycle_bin_entry:
        await mark_as_restored(
            db=db,
            recycle_bin_id=recycle_bin_entry["id"],
            restored_by_id=current_user["user_uuid"],
            restored_by_name=current_user["name"],
        )

    # Retrieve and return updated coordination
    updated_coordination = await crud_catalog_coordination.get(db=db, id=coordination_id)
    return cast(CatalogCoordinationRead, updated_coordination)
