"""RecycleBin endpoints - CRUD operations for deleted items (Admin only)."""

from typing import Annotated, Any, cast

from fastapi import APIRouter, Depends, Request
from fastcrud.paginated import PaginatedListResponse, compute_offset, paginated_response
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_superuser
from ...core.db.database import async_get_db
from ...core.exceptions.http_exceptions import NotFoundException
from ...crud.crud_recycle_bin import (
    get_all_deleted_items,
    get_deleted_items_by_type,
    get_recycle_bin_by_id,
    get_restored_items,
    mark_as_restored,
    update_can_restore,
)
from ...schemas.recycle_bin import RecycleBinRead, RecycleBinRestore

router = APIRouter(tags=["recycle-bin"])


@router.get("/recycle-bin", response_model=PaginatedListResponse[RecycleBinRead])
async def list_recycle_bin(
    request: Request,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
    page: int = 1,
    items_per_page: int = 10,
    entity_type: str | None = None,
    show_restored: bool = False,
) -> dict:
    """Obtener lista paginada de elementos en la papelera de reciclaje - Solo Admin.

    Args:
    ----
        request: Objeto request de FastAPI
        db: Sesión de base de datos
        current_user: Usuario admin autenticado actual
        page: Número de página (default: 1)
        items_per_page: Items por página (default: 10)
        entity_type: Filtrar por tipo de entidad (opcional)
        show_restored: Mostrar elementos restaurados (default: False)

    Returns:
    -------
        Lista paginada de elementos eliminados
    """
    if show_restored:
        # Mostrar elementos restaurados
        items = await get_restored_items(db=db, offset=compute_offset(page, items_per_page), limit=items_per_page)
        # Crear respuesta paginada manualmente para items restaurados
        response: dict[str, Any] = {
            "data": [RecycleBinRead.model_validate(item) for item in items],
            "total_count": len(items),
            "page": page,
            "items_per_page": items_per_page,
            "total_pages": 1,
        }
        return response
    elif entity_type:
        # Filtrar por tipo de entidad
        items_data = await get_deleted_items_by_type(
            db=db, entity_type=entity_type, offset=compute_offset(page, items_per_page), limit=items_per_page
        )
    else:
        # Todos los elementos no restaurados
        items_data = await get_all_deleted_items(
            db=db, offset=compute_offset(page, items_per_page), limit=items_per_page
        )

    response: dict[str, Any] = paginated_response(crud_data=items_data, page=page, items_per_page=items_per_page)
    return response


@router.get("/recycle-bin/{recycle_bin_id}", response_model=RecycleBinRead)
async def get_recycle_bin_item(
    request: Request,
    recycle_bin_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> RecycleBinRead:
    """Obtener un elemento específico de la papelera de reciclaje - Solo Admin.

    Args:
    ----
        request: Objeto request de FastAPI
        recycle_bin_id: ID del registro en RecycleBin
        db: Sesión de base de datos
        current_user: Usuario admin autenticado actual

    Returns:
    -------
        Datos del elemento en la papelera

    Raises:
    ------
        NotFoundException: Si el elemento no se encuentra
    """
    item = await get_recycle_bin_by_id(db=db, recycle_bin_id=recycle_bin_id)
    if item is None:
        raise NotFoundException(f"No se encontró el elemento con id '{recycle_bin_id}' en la papelera de reciclaje")

    return cast(RecycleBinRead, item)


@router.post("/recycle-bin/{recycle_bin_id}/restore", response_model=RecycleBinRead)
async def restore_from_recycle_bin(
    request: Request,
    recycle_bin_id: int,
    restore_data: RecycleBinRestore,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> RecycleBinRead:
    """Restaurar un elemento desde la papelera de reciclaje - Solo Admin.

    Este endpoint marca el registro en RecycleBin como restaurado y delega la restauración
    real del elemento a los endpoints específicos de cada entidad (ej. /faculty/{id}/restore).

    Args:
    ----
        request: Objeto request de FastAPI
        recycle_bin_id: ID del registro en RecycleBin
        restore_data: Datos de restauración (usuario que restaura)
        db: Sesión de base de datos
        current_user: Usuario admin autenticado actual

    Returns:
    -------
        Datos del registro actualizado en RecycleBin

    Raises:
    ------
        NotFoundException: Si el elemento no se encuentra o no puede ser restaurado
    """
    # Verificar si el elemento existe
    item = await get_recycle_bin_by_id(db=db, recycle_bin_id=recycle_bin_id)
    if item is None:
        raise NotFoundException(f"No se encontró el elemento con id '{recycle_bin_id}' en la papelera de reciclaje")

    # Verificar si puede ser restaurado
    if not item.get("can_restore"):
        raise NotFoundException(
            f"El elemento con id '{recycle_bin_id}' no puede ser restaurado debido a conflictos de integridad"
        )

    # Restaurar la entidad original basándose en el tipo
    entity_type = item.get("entity_type")
    entity_id = item.get("entity_id")

    restore_success = False

    if entity_type == "faculty":
        from ...crud.crud_faculties import restore_faculty

        restore_success = await restore_faculty(db=db, faculty_id=int(entity_id))
    elif entity_type == "user":
        from uuid import UUID

        from ...crud.crud_users import restore_user

        restore_success = await restore_user(db=db, user_uuid=UUID(entity_id))
    elif entity_type == "professor":
        from ...crud.crud_catalog_professor import restore_professor

        restore_success = await restore_professor(db=db, id=int(entity_id))
    elif entity_type == "subject":
        from ...crud.crud_catalog_subject import restore_subject

        restore_success = await restore_subject(db=db, subject_id=int(entity_id))
    elif entity_type == "schedule-time":
        from ...crud.crud_catalog_schedule_time import restore_schedule_time

        restore_success = await restore_schedule_time(db=db, schedule_time_id=int(entity_id))
    elif entity_type == "coordination":
        from ...crud.crud_catalog_coordination import restore_coordination

        restore_success = await restore_coordination(db=db, coordination_id=int(entity_id))
    elif entity_type == "terms":
        from ...crud.crud_term import restore_term

        restore_success = await restore_term(session=db, term_id=int(entity_id))
    else:
        raise NotFoundException(f"Tipo de entidad '{entity_type}' no soportado para restauración")

    if not restore_success:
        raise NotFoundException(f"Error al restaurar la entidad original '{entity_type}' con id '{entity_id}'")

    # Marcar como restaurado en RecycleBin
    success = await mark_as_restored(
        db=db,
        recycle_bin_id=recycle_bin_id,
        restored_by_id=restore_data.restored_by_id,
        restored_by_name=restore_data.restored_by_name,
    )

    if not success:
        raise NotFoundException(f"Error al marcar como restaurado el elemento con id '{recycle_bin_id}'")

    # Recuperar el registro actualizado
    updated_item = await get_recycle_bin_by_id(db=db, recycle_bin_id=recycle_bin_id)
    return cast(RecycleBinRead, updated_item)


@router.delete("/recycle-bin/{recycle_bin_id}", response_model=RecycleBinRead)
async def mark_as_permanently_deleted(
    request: Request,
    recycle_bin_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> RecycleBinRead:
    """Marcar un elemento como eliminado permanentemente - Solo Admin.

    Este endpoint elimina físicamente el registro de la entidad original
    y marca el registro de RecycleBin como que no se puede restaurar.
    Esto mantiene el historial completo en el Recycle Bin.

    Args:
    ----
        request: Objeto request de FastAPI
        recycle_bin_id: ID del registro en RecycleBin
        db: Sesión de base de datos
        current_user: Usuario admin autenticado actual

    Returns:
    -------
        Datos del registro actualizado en RecycleBin

    Raises:
    ------
        NotFoundException: Si el elemento no se encuentra
    """
    # Verificar si el elemento existe
    item = await get_recycle_bin_by_id(db=db, recycle_bin_id=recycle_bin_id)
    if item is None:
        raise NotFoundException(f"No se encontró el elemento con id '{recycle_bin_id}' en la papelera de reciclaje")

    entity_type = item.get("entity_type")
    entity_id = item.get("entity_id")

    # Eliminar físicamente el registro de la entidad original
    if entity_type == "faculty":
        from ...crud.crud_faculties import hard_delete_faculty

        await hard_delete_faculty(db=db, faculty_id=int(entity_id))
        # hard_delete_faculty ya hace commit internamente
    elif entity_type == "user":
        from uuid import UUID

        from ...crud.crud_users import hard_delete_user

        await hard_delete_user(db=db, user_uuid=UUID(entity_id))
        # hard_delete_user ya hace commit internamente
    elif entity_type == "professor":
        from ...crud.crud_catalog_professor import hard_delete_professor

        await hard_delete_professor(db=db, id=int(entity_id))
        # hard_delete_professor ya hace commit internamente
    elif entity_type == "subject":
        from ...crud.crud_catalog_subject import crud_catalog_subject

        await crud_catalog_subject.delete(db=db, id=int(entity_id))
        await db.commit()
    elif entity_type == "schedule-time":
        from ...crud.crud_catalog_schedule_time import crud_catalog_schedule_time

        await crud_catalog_schedule_time.delete(db=db, id=int(entity_id))
        await db.commit()
    elif entity_type == "coordination":
        from ...crud.crud_catalog_coordination import hard_delete_coordination

        await hard_delete_coordination(db=db, coordination_id=int(entity_id))
    # Agregar más tipos de entidades aquí según sea necesario

    # Marcar como que no se puede restaurar en RecycleBin (mantener historial)
    from ...crud.crud_recycle_bin import update_can_restore

    await update_can_restore(db=db, recycle_bin_id=recycle_bin_id, can_restore=False)
    await db.commit()

    # Recuperar el registro actualizado
    updated_item = await get_recycle_bin_by_id(db=db, recycle_bin_id=recycle_bin_id)
    return cast(RecycleBinRead, updated_item)


@router.patch("/recycle-bin/{recycle_bin_id}/can-restore", response_model=RecycleBinRead)
async def update_can_restore_status(
    request: Request,
    recycle_bin_id: int,
    can_restore: bool,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> RecycleBinRead:
    """Actualizar si un elemento puede ser restaurado - Solo Admin.

    Args:
    ----
        request: Objeto request de FastAPI
        recycle_bin_id: ID del registro en RecycleBin
        can_restore: Nuevo estado de can_restore
        db: Sesión de base de datos
        current_user: Usuario admin autenticado actual

    Returns:
    -------
        Datos del registro actualizado

    Raises:
    ------
        NotFoundException: Si el elemento no se encuentra
    """
    # Verificar si el elemento existe
    item = await get_recycle_bin_by_id(db=db, recycle_bin_id=recycle_bin_id)
    if item is None:
        raise NotFoundException(f"No se encontró el elemento con id '{recycle_bin_id}' en la papelera de reciclaje")

    # Actualizar can_restore
    success = await update_can_restore(db=db, recycle_bin_id=recycle_bin_id, can_restore=can_restore)

    if not success:
        raise NotFoundException(f"Error al actualizar el elemento con id '{recycle_bin_id}'")

    # Recuperar el registro actualizado
    updated_item = await get_recycle_bin_by_id(db=db, recycle_bin_id=recycle_bin_id)
    return cast(RecycleBinRead, updated_item)
