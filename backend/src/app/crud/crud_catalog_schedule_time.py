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
    stmt = select(CatalogScheduleTime).where(CatalogScheduleTime.is_active.is_(True))
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


async def create_schedule_time_with_auto_fields(
    db: AsyncSession, schedule_time_data: CatalogScheduleTimeCreate
) -> CatalogScheduleTime:
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
    if schedule_time_data.start_time_ext and schedule_time_data.end_time_ext:
        # Horario extendido (dos rangos)
        start_str = schedule_time_data.start_time.strftime("%I:%M %p").lower().replace(" 0", " ")
        end_str = schedule_time_data.end_time.strftime("%I:%M %p").lower().replace(" 0", " ")
        start_ext_str = schedule_time_data.start_time_ext.strftime("%I:%M %p").lower().replace(" 0", " ")
        end_ext_str = schedule_time_data.end_time_ext.strftime("%I:%M %p").lower().replace(" 0", " ")
        range_text = f"{start_str} a {end_str} y {start_ext_str} a {end_ext_str}"

        # Calcular duration_min total (ambos rangos)
        start_minutes = schedule_time_data.start_time.hour * 60 + schedule_time_data.start_time.minute
        end_minutes = schedule_time_data.end_time.hour * 60 + schedule_time_data.end_time.minute
        start_ext_minutes = schedule_time_data.start_time_ext.hour * 60 + schedule_time_data.start_time_ext.minute
        end_ext_minutes = schedule_time_data.end_time_ext.hour * 60 + schedule_time_data.end_time_ext.minute

        duration_first = abs(end_minutes - start_minutes)
        duration_second = abs(end_ext_minutes - start_ext_minutes)
        duration_min = duration_first + duration_second
    else:
        # Horario normal (un solo rango)
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
        start_time_ext=schedule_time_data.start_time_ext,
        end_time_ext=schedule_time_data.end_time_ext,
        duration_min=duration_min,
        is_active=schedule_time_data.is_active,
    )

    db.add(schedule_time)
    await db.commit()
    await db.refresh(schedule_time)
    return schedule_time


async def update_schedule_time_with_auto_fields(
    db: AsyncSession, schedule_time_id: int, update_data: CatalogScheduleTimeUpdate
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

    # Si se actualiza start_time, end_time, start_time_ext o end_time_ext, recalcular duration_min y range_text
    start_time = update_dict.get("start_time", current_schedule["start_time"])
    end_time = update_dict.get("end_time", current_schedule["end_time"])
    start_time_ext = update_dict.get("start_time_ext", current_schedule.get("start_time_ext"))
    end_time_ext = update_dict.get("end_time_ext", current_schedule.get("end_time_ext"))

    if (
        "start_time" in update_dict
        or "end_time" in update_dict
        or "start_time_ext" in update_dict
        or "end_time_ext" in update_dict
    ):
        if start_time_ext and end_time_ext:
            # Horario extendido (dos rangos)
            start_str = start_time.strftime("%I:%M %p").lower().replace(" 0", " ")
            end_str = end_time.strftime("%I:%M %p").lower().replace(" 0", " ")
            start_ext_str = start_time_ext.strftime("%I:%M %p").lower().replace(" 0", " ")
            end_ext_str = end_time_ext.strftime("%I:%M %p").lower().replace(" 0", " ")
            update_dict["range_text"] = f"{start_str} a {end_str} y {start_ext_str} a {end_ext_str}"

            # Calcular duration_min total (ambos rangos)
            start_minutes = start_time.hour * 60 + start_time.minute
            end_minutes = end_time.hour * 60 + end_time.minute
            start_ext_minutes = start_time_ext.hour * 60 + start_time_ext.minute
            end_ext_minutes = end_time_ext.hour * 60 + end_time_ext.minute

            duration_first = abs(end_minutes - start_minutes)
            duration_second = abs(end_ext_minutes - start_ext_minutes)
            update_dict["duration_min"] = duration_first + duration_second
        else:
            # Horario normal (un solo rango)
            start_str = start_time.strftime("%I:%M %p").lower().replace(" 0", " ")
            end_str = end_time.strftime("%I:%M %p").lower().replace(" 0", " ")
            update_dict["range_text"] = f"{start_str} a {end_str}"

            # Calcular duration_min
            start_minutes = start_time.hour * 60 + start_time.minute
            end_minutes = end_time.hour * 60 + end_time.minute
            update_dict["duration_min"] = abs(end_minutes - start_minutes)

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


async def get_non_deleted_schedule_times(
    db: AsyncSession, offset: int = 0, limit: int = 100, is_active: bool | None = None
) -> dict:
    """Obtener todos los horarios no eliminados (soft delete).

    Args:
    ----
        db: Sesión de base de datos
        offset: Número de registros a saltar
        limit: Número máximo de registros a devolver
        is_active: Filtrar por estado activo (opcional)

    Returns:
    -------
        Diccionario con datos y conteo total
    """
    filters = {"deleted": False}
    if is_active is not None:
        filters["is_active"] = is_active

    return await crud_catalog_schedule_time.get_multi(db=db, offset=offset, limit=limit, **filters)


async def get_deleted_schedule_times(db: AsyncSession, offset: int = 0, limit: int = 100) -> dict:
    """Obtener todos los horarios eliminados (soft delete).

    Args:
    ----
        db: Sesión de base de datos
        offset: Número de registros a saltar
        limit: Número máximo de registros a devolver

    Returns:
    -------
        Diccionario con datos y conteo total
    """
    return await crud_catalog_schedule_time.get_multi(db=db, offset=offset, limit=limit, deleted=True)


async def soft_delete_schedule_time(db: AsyncSession, schedule_time_id: int) -> bool:
    """Marcar un horario como eliminado (soft delete).

    Args:
    ----
        db: Sesión de base de datos
        schedule_time_id: ID del horario a eliminar

    Returns:
    -------
        True si se eliminó correctamente
    """
    from datetime import UTC, datetime

    update_data = CatalogScheduleTimeUpdate(deleted=True, deleted_at=datetime.now(UTC))

    await crud_catalog_schedule_time.update(db=db, object=update_data, id=schedule_time_id)
    await db.commit()
    return True


async def restore_schedule_time(db: AsyncSession, schedule_time_id: int) -> bool:
    """Restaurar un horario eliminado (revertir soft delete).

    Args:
    ----
        db: Sesión de base de datos
        schedule_time_id: ID del horario a restaurar

    Returns:
    -------
        True si se restauró correctamente
    """
    update_data = CatalogScheduleTimeUpdate(deleted=False, deleted_at=None)

    await crud_catalog_schedule_time.update(db=db, object=update_data, id=schedule_time_id)
    await db.commit()
    return True
