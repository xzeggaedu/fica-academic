"""Operaciones CRUD para el modelo RecycleBin."""

from datetime import UTC, datetime
from uuid import UUID

from fastcrud import FastCRUD

from ..models.recycle_bin import RecycleBin
from ..schemas.recycle_bin import RecycleBinUpdate

# Crear instancia CRUD para RecycleBin
crud_recycle_bin = FastCRUD(RecycleBin)


async def get_recycle_bin_by_id(db, recycle_bin_id: int):
    """Obtener registro de RecycleBin por ID."""
    return await crud_recycle_bin.get(db=db, id=recycle_bin_id)


async def get_all_deleted_items(db, offset: int = 0, limit: int = 100):
    """Obtener todos los elementos en la papelera de reciclaje (incluyendo restaurados)."""
    from sqlalchemy import desc, select

    # Query personalizada con ordenamiento descendente por deleted_at
    stmt = select(RecycleBin).order_by(desc(RecycleBin.deleted_at)).offset(offset).limit(limit)
    result = await db.execute(stmt)
    items = result.scalars().all()

    # Contar total de registros
    from sqlalchemy import func

    count_stmt = select(func.count()).select_from(RecycleBin)
    count_result = await db.execute(count_stmt)
    total = count_result.scalar() or 0

    return {"data": items, "total_count": total}


async def get_deleted_items_by_type(db, entity_type: str, offset: int = 0, limit: int = 100):
    """Obtener elementos eliminados por tipo de entidad."""
    return await crud_recycle_bin.get_multi(
        db=db, offset=offset, limit=limit, entity_type=entity_type, restored_at=None
    )


async def get_restored_items(db, offset: int = 0, limit: int = 100):
    """Obtener elementos que han sido restaurados."""
    # Necesitamos usar una query personalizada para esto
    from sqlalchemy import select

    stmt = select(RecycleBin).where(RecycleBin.restored_at.isnot(None)).offset(offset).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


async def create_recycle_bin_entry(
    db,
    entity_type: str,
    entity_id: str,
    entity_display_name: str,
    deleted_by_id: UUID,
    deleted_by_name: str,
    reason: str | None = None,
    can_restore: bool = True,
):
    """Crear un registro en RecycleBin cuando se elimina un elemento."""
    from ..schemas.recycle_bin import RecycleBinCreate

    entry_data = RecycleBinCreate(
        entity_type=entity_type,
        entity_id=entity_id,
        entity_display_name=entity_display_name,
        deleted_by_id=deleted_by_id,
        deleted_by_name=deleted_by_name,
        reason=reason,
        can_restore=can_restore,
    )

    return await crud_recycle_bin.create(db=db, object=entry_data)


async def mark_as_restored(db, recycle_bin_id: int, restored_by_id: str, restored_by_name: str) -> bool:
    """Marcar un registro en RecycleBin como restaurado."""
    update_data = RecycleBinUpdate(
        restored_at=datetime.now(UTC),
        restored_by_id=restored_by_id,
        restored_by_name=restored_by_name,
        can_restore=False,  # Ya fue restaurado, no se puede restaurar de nuevo
    )

    await crud_recycle_bin.update(db=db, object=update_data, id=recycle_bin_id)
    await db.commit()
    return True


async def update_can_restore(db, recycle_bin_id: int, can_restore: bool) -> bool:
    """Actualizar si un registro puede ser restaurado."""
    update_data = RecycleBinUpdate(can_restore=can_restore)

    await crud_recycle_bin.update(db=db, object=update_data, id=recycle_bin_id)
    await db.commit()
    return True


async def delete_recycle_bin_entry(db, recycle_bin_id: int) -> None:
    """Eliminar permanentemente un registro de RecycleBin."""
    await crud_recycle_bin.delete(db=db, id=recycle_bin_id)


async def find_recycle_bin_entry(db, entity_type: str, entity_id: str):
    """Encontrar un registro en RecycleBin por tipo de entidad y ID."""
    result = await crud_recycle_bin.get_multi(
        db=db, entity_type=entity_type, entity_id=entity_id, restored_at=None, limit=1
    )

    if result and result.get("data"):
        return result["data"][0] if len(result["data"]) > 0 else None
    return None
