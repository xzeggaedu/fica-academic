"""Operaciones CRUD para el modelo CatalogCoordination."""

from datetime import UTC, datetime

from fastcrud import FastCRUD
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.catalog_coordination import CatalogCoordination
from ..schemas.catalog_coordination import (
    CatalogCoordinationCreate,
    CatalogCoordinationRead,
    CatalogCoordinationUpdate,
)

CRUDCatalogCoordination = FastCRUD[
    CatalogCoordination,
    CatalogCoordinationCreate,
    CatalogCoordinationUpdate,
    CatalogCoordinationRead,
    CatalogCoordinationRead,
    CatalogCoordinationRead,
]
crud_catalog_coordination = CRUDCatalogCoordination(CatalogCoordination)


async def get_non_deleted_coordinations(
    db: AsyncSession, offset: int = 0, limit: int = 100, is_active: bool | None = None
) -> dict:
    """Obtener todas las coordinaciones no eliminadas (soft delete).

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

    return await crud_catalog_coordination.get_multi(db=db, offset=offset, limit=limit, **filters)


async def get_deleted_coordinations(db: AsyncSession, offset: int = 0, limit: int = 100) -> dict:
    """Obtener todas las coordinaciones eliminadas (soft delete).

    Args:
    ----
        db: Sesión de base de datos
        offset: Número de registros a saltar
        limit: Número máximo de registros a devolver

    Returns:
    -------
        Diccionario con datos y conteo total
    """
    return await crud_catalog_coordination.get_multi(db=db, offset=offset, limit=limit, deleted=True)


async def soft_delete_coordination(db: AsyncSession, coordination_id: int) -> bool:
    """Marcar una coordinación como eliminada (soft delete).

    Args:
    ----
        db: Sesión de base de datos
        coordination_id: ID de la coordinación a eliminar

    Returns:
    -------
        True si se eliminó correctamente
    """
    update_data = CatalogCoordinationUpdate(deleted=True, deleted_at=datetime.now(UTC))

    await crud_catalog_coordination.update(db=db, object=update_data, id=coordination_id)
    await db.commit()
    return True


async def restore_coordination(db: AsyncSession, coordination_id: int) -> bool:
    """Restaurar una coordinación eliminada (revertir soft delete).

    Args:
    ----
        db: Sesión de base de datos
        coordination_id: ID de la coordinación a restaurar

    Returns:
    -------
        True si se restauró correctamente
    """
    update_data = CatalogCoordinationUpdate(deleted=False, deleted_at=None)

    await crud_catalog_coordination.update(db=db, object=update_data, id=coordination_id)
    await db.commit()
    return True


async def coordination_code_exists(db: AsyncSession, code: str) -> bool:
    """Verificar si existe una coordinación con el código dado.

    Args:
    ----
        db: Sesión de base de datos
        code: Código de la coordinación a verificar

    Returns:
    -------
        True si el código existe
    """
    result = await crud_catalog_coordination.exists(db=db, code=code)
    return result


async def coordination_name_exists(db: AsyncSession, name: str) -> bool:
    """Verificar si existe una coordinación con el nombre dado.

    Args:
    ----
        db: Sesión de base de datos
        name: Nombre de la coordinación a verificar

    Returns:
    -------
        True si el nombre existe
    """
    result = await crud_catalog_coordination.exists(db=db, name=name)
    return result


async def hard_delete_coordination(db: AsyncSession, coordination_id: int) -> bool:
    """Eliminar permanentemente una coordinación de la base de datos.

    Args:
    ----
        db: Sesión de base de datos
        coordination_id: ID de la coordinación a eliminar

    Returns:
    -------
        True si se eliminó correctamente
    """
    from sqlalchemy import delete

    stmt = delete(CatalogCoordination).where(CatalogCoordination.id == coordination_id)
    await db.execute(stmt)
    await db.commit()
    return True
