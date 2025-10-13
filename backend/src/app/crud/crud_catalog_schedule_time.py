"""Operaciones CRUD para el modelo CatalogScheduleTime."""

from fastcrud import FastCRUD
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.catalog_schedule_time import CatalogScheduleTime
from ..schemas.catalog_schedule_time import (
    CatalogScheduleTimeCreate,
    CatalogScheduleTimeRead,
    CatalogScheduleTimeUpdate,
    generate_day_group_name_from_array,
)

CRUDCatalogScheduleTime = FastCRUD[
    CatalogScheduleTime,
    CatalogScheduleTimeCreate,
    CatalogScheduleTimeUpdate,
    CatalogScheduleTimeRead,
    CatalogScheduleTimeRead,
    CatalogScheduleTimeRead,
]
crud_catalog_schedule_time = CRUDCatalogScheduleTime(CatalogScheduleTime)


async def get_active_schedule_times(db: AsyncSession) -> list[CatalogScheduleTime]:
    """Obtener todos los horarios activos.
    
    Args:
    ----
        db: Sesión de base de datos
        
    Returns:
    -------
        Lista de horarios activos
    """
    stmt = select(CatalogScheduleTime).where(CatalogScheduleTime.is_active == True)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_schedule_times_by_day_group(db: AsyncSession, day_group: str) -> list[CatalogScheduleTime]:
    """Obtener horarios por grupo de días.
    
    Args:
    ----
        db: Sesión de base de datos
        day_group: Nombre del grupo de días (ej: "Lu-Vie", "Lunes")
        
    Returns:
    -------
        Lista de horarios para el grupo de días especificado
    """
    stmt = select(CatalogScheduleTime).where(CatalogScheduleTime.day_group_name == day_group)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_schedule_time_with_auto_fields(db: AsyncSession, schedule_time_data: CatalogScheduleTimeCreate) -> CatalogScheduleTime:
    """Crear un horario con generación automática de campos derivados.
    
    Args:
    ----
        db: Sesión de base de datos
        schedule_time_data: Datos del horario a crear
        
    Returns:
    -------
        Horario creado
    """
    # Generar campos automáticamente
    day_group_name = generate_day_group_name_from_array(schedule_time_data.days_array)
    
    # Generar range_text automáticamente
    start_str = schedule_time_data.start_time.strftime("%I:%M %p").lower().replace(" 0", " ")
    end_str = schedule_time_data.end_time.strftime("%I:%M %p").lower().replace(" 0", " ")
    range_text = f"{start_str} a {end_str}"
    
    # Calcular duration_min
    start_minutes = schedule_time_data.start_time.hour * 60 + schedule_time_data.start_time.minute
    end_minutes = schedule_time_data.end_time.hour * 60 + schedule_time_data.end_time.minute
    duration_min = abs(end_minutes - start_minutes)
    
    # Crear objeto del modelo con todos los campos
    schedule_time = CatalogScheduleTime(
        days_array=schedule_time_data.days_array,
        day_group_name=day_group_name,
        range_text=range_text,
        start_time=schedule_time_data.start_time,
        end_time=schedule_time_data.end_time,
        duration_min=duration_min,
        is_active=schedule_time_data.is_active,
    )
    
    db.add(schedule_time)
    await db.commit()
    await db.refresh(schedule_time)
    return schedule_time


async def update_schedule_time_with_auto_fields(
    db: AsyncSession, 
    schedule_time_id: int, 
    update_data: CatalogScheduleTimeUpdate
) -> CatalogScheduleTime | None:
    """Actualizar un horario con generación automática de campos derivados.
    
    Args:
    ----
        db: Sesión de base de datos
        schedule_time_id: ID del horario a actualizar
        update_data: Datos a actualizar
        
    Returns:
    -------
        Horario actualizado o None si no se encuentra
    """
    # Obtener horario actual
    current_schedule = await crud_catalog_schedule_time.get(db=db, id=schedule_time_id)
    if current_schedule is None:
        return None
    
    # Preparar datos de actualización
    update_dict = update_data.model_dump(exclude_unset=True)
    
    # Si se actualiza days_array, generar day_group_name automáticamente
    if "days_array" in update_dict:
        update_dict["day_group_name"] = generate_day_group_name_from_array(update_dict["days_array"])
    
    # Si se actualiza start_time o end_time, recalcular duration_min y range_text
    start_time = update_dict.get("start_time", current_schedule["start_time"])
    end_time = update_dict.get("end_time", current_schedule["end_time"])
    
    if "start_time" in update_dict or "end_time" in update_dict:
        # Calcular duration_min
        start_minutes = start_time.hour * 60 + start_time.minute
        end_minutes = end_time.hour * 60 + end_time.minute
        update_dict["duration_min"] = abs(end_minutes - start_minutes)
        
        # Generar range_text
        start_str = start_time.strftime("%I:%M %p").lower().replace(" 0", " ")
        end_str = end_time.strftime("%I:%M %p").lower().replace(" 0", " ")
        update_dict["range_text"] = f"{start_str} a {end_str}"
    
    # Actualizar horario
    return await crud_catalog_schedule_time.update(db=db, object=update_dict, id=schedule_time_id)


async def toggle_schedule_time_status(db: AsyncSession, schedule_time_id: int) -> CatalogScheduleTime | None:
    """Alternar estado activo/inactivo de un horario.
    
    Args:
    ----
        db: Sesión de base de datos
        schedule_time_id: ID del horario
        
    Returns:
    -------
        Horario actualizado o None si no se encuentra
    """
    schedule_time = await crud_catalog_schedule_time.get(db=db, id=schedule_time_id)
    if schedule_time is None:
        return None
    
    # Alternar estado
    new_status = not schedule_time.is_active
    await crud_catalog_schedule_time.update(db=db, object={"is_active": new_status}, id=schedule_time_id)
    
    # Retornar horario actualizado
    return await crud_catalog_schedule_time.get(db=db, id=schedule_time_id)
