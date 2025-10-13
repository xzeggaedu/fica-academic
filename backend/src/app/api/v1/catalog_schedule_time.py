"""API endpoints para el catálogo de horarios."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from fastcrud.paginated import PaginatedListResponse, compute_offset, paginated_response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_superuser
from ...core.db.database import async_get_db
from ...core.exceptions.http_exceptions import NotFoundException
from ...crud.crud_catalog_schedule_time import (
    crud_catalog_schedule_time,
    get_active_schedule_times,
    get_schedule_times_by_day_group,
    toggle_schedule_time_status,
    create_schedule_time_with_auto_fields,
    update_schedule_time_with_auto_fields,
)
from ...schemas.catalog_schedule_time import (
    CatalogScheduleTimeCreate,
    CatalogScheduleTimeInternal,
    CatalogScheduleTimeRead,
    CatalogScheduleTimeUpdate,
    generate_day_group_name_from_array,
)

router = APIRouter(tags=["catalog-schedule-time"])


@router.get("/catalog/schedule-times", response_model=PaginatedListResponse[CatalogScheduleTimeRead])
async def read_schedule_times(
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Solo Admin
    page: int = 1,
    items_per_page: int = 50,
):
    """Obtener lista paginada de horarios - Solo Admin."""
    schedule_times_data = await crud_catalog_schedule_time.get_multi(
        db=db, offset=compute_offset(page, items_per_page), limit=items_per_page
    )
    
    response: dict[str, Any] = paginated_response(crud_data=schedule_times_data, page=page, items_per_page=items_per_page)
    return response


@router.get("/catalog/schedule-times/active", response_model=list[CatalogScheduleTimeRead])
async def read_active_schedule_times(
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Solo Admin
):
    """Obtener todos los horarios activos - Solo Admin."""
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


@router.get("/catalog/schedule-times/{schedule_time_id}", response_model=CatalogScheduleTimeRead)
async def read_schedule_time(
    schedule_time_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Solo Admin
):
    """Obtener un horario específico por ID - Solo Admin."""
    schedule_time = await crud_catalog_schedule_time.get(db=db, id=schedule_time_id, schema_to_select=CatalogScheduleTimeRead)
    if schedule_time is None:
        raise NotFoundException("Horario no encontrado")
    return schedule_time


@router.post("/catalog/schedule-times", response_model=CatalogScheduleTimeRead, status_code=201)
async def create_schedule_time(
    schedule_time_data: CatalogScheduleTimeCreate,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Solo Admin
):
    """Crear un nuevo horario con generación automática de campos - Solo Admin."""
    created_schedule_time = await create_schedule_time_with_auto_fields(db=db, schedule_time_data=schedule_time_data)
    return created_schedule_time


@router.patch("/catalog/schedule-times/{schedule_time_id}", response_model=CatalogScheduleTimeRead)
async def update_schedule_time(
    schedule_time_id: int,
    schedule_time_data: CatalogScheduleTimeUpdate,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Solo Admin
):
    """Actualizar un horario existente con generación automática de campos - Solo Admin."""
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
    
    # Actualizar horario usando SQLAlchemy directamente
    # Importar el modelo
    from ...models.catalog_schedule_time import CatalogScheduleTime
    
    # Actualizar directamente con SQLAlchemy
    stmt = select(CatalogScheduleTime).where(CatalogScheduleTime.id == schedule_time_id)
    result = await db.execute(stmt)
    schedule_time_obj = result.scalar_one_or_none()
    
    if schedule_time_obj is None:
        raise NotFoundException("Horario no encontrado")
    
    # Actualizar campos
    for key, value in update_dict.items():
        setattr(schedule_time_obj, key, value)
    
    await db.commit()
    await db.refresh(schedule_time_obj)
    
    return schedule_time_obj


@router.patch("/catalog/schedule-times/{schedule_time_id}/toggle", response_model=CatalogScheduleTimeRead)
async def toggle_schedule_time(
    schedule_time_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Solo Admin
):
    """Alternar estado activo/inactivo de un horario - Solo Admin."""
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


@router.delete("/catalog/schedule-times/{schedule_time_id}")
async def delete_schedule_time(
    schedule_time_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Solo Admin
):
    """Eliminar un horario (soft delete) - Solo Admin."""
    # Verificar que el horario existe
    existing_schedule_time = await crud_catalog_schedule_time.get(db=db, id=schedule_time_id)
    if existing_schedule_time is None:
        raise NotFoundException("Horario no encontrado")
    
    # Soft delete: marcar como inactivo
    await crud_catalog_schedule_time.update(db=db, object={"is_active": False}, id=schedule_time_id)
    
    return {"message": "Horario eliminado correctamente"}
