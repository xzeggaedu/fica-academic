"""API endpoints para el catálogo de horarios."""

from typing import Annotated, Any, cast

from fastapi import APIRouter, Depends, Request
from fastcrud.paginated import PaginatedListResponse, compute_offset, paginated_response
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_superuser, get_current_user
from ...core.db.database import async_get_db
from ...core.exceptions.http_exceptions import NotFoundException
from ...crud.crud_catalog_schedule_time import (
    create_schedule_time_with_auto_fields,
    crud_catalog_schedule_time,
    get_active_schedule_times,
    get_deleted_schedule_times,
    get_non_deleted_schedule_times,
    restore_schedule_time,
    soft_delete_schedule_time,
    toggle_schedule_time_status,
    update_schedule_time_with_auto_fields,
)
from ...crud.crud_recycle_bin import create_recycle_bin_entry, find_recycle_bin_entry, mark_as_restored
from ...schemas.catalog_schedule_time import (
    CatalogScheduleTimeCreate,
    CatalogScheduleTimeRead,
    CatalogScheduleTimeUpdate,
    generate_day_group_name_from_array,
)

router = APIRouter(prefix="/catalog/schedule-times", tags=["catalog-schedule-times"])


@router.get("", response_model=PaginatedListResponse[CatalogScheduleTimeRead])
async def read_schedule_times(
    request: Request,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],  # All authenticated users
    page: int = 1,
    items_per_page: int = 50,
    is_active: bool | None = None,
    include_deleted: bool = False,
):
    """Obtener lista paginada de horarios - Accesible para todos los usuarios autenticados."""
    if include_deleted:
        schedule_times_data = await get_deleted_schedule_times(
            db=db, offset=compute_offset(page, items_per_page), limit=items_per_page
        )
    else:
        schedule_times_data = await get_non_deleted_schedule_times(
            db=db, offset=compute_offset(page, items_per_page), limit=items_per_page, is_active=is_active
        )

    response: dict[str, Any] = paginated_response(
        crud_data=schedule_times_data, page=page, items_per_page=items_per_page
    )
    return response


@router.get("/active", response_model=list[CatalogScheduleTimeRead])
async def read_active_schedule_times(
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],  # All authenticated users
):
    """Obtener todos los horarios activos - Accesible para todos los usuarios autenticados."""
    schedule_times = await get_active_schedule_times(db=db)
    return [
        CatalogScheduleTimeRead(
            id=st.id,
            days_array=st.days_array,
            day_group_name=st.day_group_name,
            range_text=st.range_text,
            start_time=st.start_time,
            end_time=st.end_time,
            duration_min=st.duration_min,
            is_active=st.is_active,
            created_at=st.created_at,
            updated_at=st.updated_at,
        )
        for st in schedule_times
    ]


@router.get("/{schedule_time_id}", response_model=CatalogScheduleTimeRead)
async def read_schedule_time(
    schedule_time_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],  # All authenticated users
):
    """Obtener un horario específico por ID - Accesible para todos los usuarios autenticados."""
    schedule_time = await crud_catalog_schedule_time.get(
        db=db, id=schedule_time_id, schema_to_select=CatalogScheduleTimeRead
    )
    if schedule_time is None:
        raise NotFoundException("Horario no encontrado")
    return schedule_time


@router.post("", response_model=CatalogScheduleTimeRead, status_code=201)
async def create_schedule_time(
    schedule_time_data: CatalogScheduleTimeCreate,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
):
    """Crear un nuevo horario con generación automática de campos - Solo administradores."""
    try:
        created_schedule_time = await create_schedule_time_with_auto_fields(
            db=db, schedule_time_data=schedule_time_data
        )
        return created_schedule_time
    except ValueError as e:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{schedule_time_id}", response_model=CatalogScheduleTimeRead)
async def update_schedule_time(
    schedule_time_id: int,
    schedule_time_data: CatalogScheduleTimeUpdate,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
):
    """Actualizar un horario existente con generación automática de campos - Solo administradores."""
    # Verificar que el horario existe
    existing_schedule_time = await crud_catalog_schedule_time.get(db=db, id=schedule_time_id)
    if existing_schedule_time is None:
        raise NotFoundException("Horario no encontrado")

    # Preparar datos de actualización
    update_dict = schedule_time_data.model_dump(exclude_unset=True)

    # Si se actualiza days_array, generar day_group_name automáticamente
    if "days_array" in update_dict:
        update_dict["day_group_name"] = generate_day_group_name_from_array(update_dict["days_array"])

    # Si se actualiza start_time o end_time, recalcular duration_min y range_text
    start_time = update_dict.get("start_time", existing_schedule_time["start_time"])
    end_time = update_dict.get("end_time", existing_schedule_time["end_time"])

    if "start_time" in update_dict or "end_time" in update_dict:
        # Calcular duration_min
        start_minutes = start_time.hour * 60 + start_time.minute
        end_minutes = end_time.hour * 60 + end_time.minute
        update_dict["duration_min"] = abs(end_minutes - start_minutes)

        # Generar range_text
        start_str = start_time.strftime("%I:%M %p").lower().replace(" 0", " ")
        end_str = end_time.strftime("%I:%M %p").lower().replace(" 0", " ")
        update_dict["range_text"] = f"{start_str} a {end_str}"

    # Usar la función de actualización con validación de duplicados
    try:
        updated_schedule_time = await update_schedule_time_with_auto_fields(
            db=db, schedule_time_id=schedule_time_id, update_data=schedule_time_data
        )

        if updated_schedule_time is None:
            raise NotFoundException("Horario no encontrado")

        return updated_schedule_time
    except ValueError as e:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{schedule_time_id}/toggle", response_model=CatalogScheduleTimeRead)
async def toggle_schedule_time(
    schedule_time_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
):
    """Alternar estado activo/inactivo de un horario - Solo administradores."""
    updated_schedule_time = await toggle_schedule_time_status(db=db, schedule_time_id=schedule_time_id)
    if updated_schedule_time is None:
        raise NotFoundException("Horario no encontrado")

    return CatalogScheduleTimeRead(
        id=updated_schedule_time.id,
        day_group_name=updated_schedule_time.day_group_name,
        range_text=updated_schedule_time.range_text,
        start_time=updated_schedule_time.start_time,
        end_time=updated_schedule_time.end_time,
        duration_min=updated_schedule_time.duration_min,
        is_active=updated_schedule_time.is_active,
        created_at=updated_schedule_time.created_at,
        updated_at=updated_schedule_time.updated_at,
    )


@router.delete("/{schedule_time_id}")
async def delete_schedule_time(
    schedule_time_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
):
    """Eliminar un horario (hard delete) - Solo administradores."""
    # Verificar que el horario existe
    existing_schedule_time = await crud_catalog_schedule_time.get(db=db, id=schedule_time_id)
    if existing_schedule_time is None:
        raise NotFoundException("Horario no encontrado")

    # Hard delete
    await crud_catalog_schedule_time.delete(db=db, id=schedule_time_id)

    return {"message": "Horario eliminado correctamente"}


@router.patch("/soft-delete/{schedule_time_id}", response_model=CatalogScheduleTimeRead)
async def soft_delete_schedule_time_endpoint(
    request: Request,
    schedule_time_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
    values: dict = None,
) -> CatalogScheduleTimeRead:
    """Eliminar un horario (soft delete) - Solo Admin.

    Esto marcará el horario como eliminado pero no lo removerá físicamente de la base de datos.
    También crea un registro en RecycleBin para auditoría y posible restauración.

    Args:
    ----
        request: Objeto request de FastAPI
        schedule_time_id: ID del horario a eliminar
        db: Sesión de base de datos
        current_user: Usuario admin autenticado actual

    Returns:
    -------
        Datos del horario eliminado

    Raises:
    ------
        NotFoundException: Si el horario no se encuentra
    """
    # Verificar si el horario existe
    db_schedule_time = await crud_catalog_schedule_time.get(db=db, id=schedule_time_id)
    if db_schedule_time is None:
        raise NotFoundException(f"No se encontró el horario con id '{schedule_time_id}'")

    # Soft delete schedule time
    success = await soft_delete_schedule_time(db=db, schedule_time_id=schedule_time_id)
    if not success:
        raise NotFoundException(f"Error al eliminar el horario con id '{schedule_time_id}'")

    # Crear registro en RecycleBin
    await create_recycle_bin_entry(
        db=db,
        entity_type="schedule-time",
        entity_id=str(schedule_time_id),
        entity_display_name=f"{db_schedule_time['day_group_name']}: {db_schedule_time['range_text']}",
        deleted_by_id=current_user["user_uuid"],
        deleted_by_name=current_user["name"],
        reason=None,
        can_restore=True,
    )

    # Retrieve and return updated schedule time
    updated_schedule_time = await crud_catalog_schedule_time.get(db=db, id=schedule_time_id)
    return cast(CatalogScheduleTimeRead, updated_schedule_time)


@router.patch("/restore/{schedule_time_id}", response_model=CatalogScheduleTimeRead)
async def restore_schedule_time_endpoint(
    request: Request,
    schedule_time_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
    values: dict = None,
) -> CatalogScheduleTimeRead:
    """Restaurar un horario eliminado (soft delete) - Solo Admin.

    Esto revertirá la eliminación del horario y actualizará el registro en RecycleBin.

    Args:
    ----
        request: Objeto request de FastAPI
        schedule_time_id: ID del horario a restaurar
        db: Sesión de base de datos
        current_user: Usuario admin autenticado actual

    Returns:
    -------
        Datos del horario restaurado

    Raises:
    ------
        NotFoundException: Si el horario no se encuentra
    """
    # Verificar si el horario existe
    db_schedule_time = await crud_catalog_schedule_time.get(db=db, id=schedule_time_id)
    if db_schedule_time is None:
        raise NotFoundException(f"No se encontró el horario con id '{schedule_time_id}'")

    # Restore schedule time
    success = await restore_schedule_time(db=db, schedule_time_id=schedule_time_id)
    if not success:
        raise NotFoundException(f"Error al restaurar el horario con id '{schedule_time_id}'")

    # Buscar y actualizar registro en RecycleBin
    recycle_bin_entry = await find_recycle_bin_entry(
        db=db, entity_type="schedule-time", entity_id=str(schedule_time_id)
    )
    if recycle_bin_entry:
        await mark_as_restored(
            db=db,
            recycle_bin_id=recycle_bin_entry["id"],
            restored_by_id=current_user["user_uuid"],
            restored_by_name=current_user["name"],
        )

    # Retrieve and return updated schedule time
    updated_schedule_time = await crud_catalog_schedule_time.get(db=db, id=schedule_time_id)
    return cast(CatalogScheduleTimeRead, updated_schedule_time)
