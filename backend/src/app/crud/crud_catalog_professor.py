"""Operaciones CRUD para el modelo CatalogProfessor."""

from datetime import UTC, datetime

from fastcrud import FastCRUD
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.catalog_professor import CatalogProfessor
from ..schemas.catalog_professor import CatalogProfessorCreate, CatalogProfessorRead, CatalogProfessorUpdate

CRUDCatalogProfessor = FastCRUD[
    CatalogProfessor,
    CatalogProfessorCreate,
    CatalogProfessorUpdate,
    CatalogProfessorRead,
    CatalogProfessorRead,
    CatalogProfessorRead,
]
crud_catalog_professor = CRUDCatalogProfessor(CatalogProfessor)


async def get_active_professors(db: AsyncSession):
    """Obtener todos los profesores activos y no eliminados."""
    stmt = select(CatalogProfessor).where(CatalogProfessor.is_active.is_(True), CatalogProfessor.deleted.is_(False))
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_professor_by_id(db: AsyncSession, professor_id: int):
    """Obtener un profesor por su ID numérico (PK)."""
    professor = await crud_catalog_professor.get(db=db, id=professor_id, schema_to_select=CatalogProfessorRead)
    return professor


async def professor_name_exists(db: AsyncSession, name: str, exclude_id: int | None = None) -> bool:
    """Verificar si ya existe un profesor con ese nombre."""
    stmt = select(CatalogProfessor).where(CatalogProfessor.professor_name == name)
    if exclude_id is not None:
        stmt = stmt.where(CatalogProfessor.id != exclude_id)

    result = await db.execute(stmt)
    return result.scalar_one_or_none() is not None


async def professor_code_exists(db: AsyncSession, professor_code: str, exclude_id: int | None = None) -> bool:
    """Verificar si ya existe un profesor con ese código institucional."""
    stmt = select(CatalogProfessor).where(CatalogProfessor.professor_id == professor_code)
    if exclude_id is not None:
        stmt = stmt.where(CatalogProfessor.id != exclude_id)

    result = await db.execute(stmt)
    return result.scalar_one_or_none() is not None


async def get_non_deleted_professors(
    db: AsyncSession,
    offset: int = 0,
    limit: int = 100,
    is_active: bool | None = None,
    is_paid: bool | None = None,
    is_bilingual: bool | None = None,
    professor_category: str | None = None,
):
    """Obtener todos los profesores no eliminados con filtros opcionales."""
    filters = {"deleted": False}

    if is_active is not None:
        filters["is_active"] = is_active
    if is_paid is not None:
        filters["is_paid"] = is_paid
    if is_bilingual is not None:
        filters["is_bilingual"] = is_bilingual
    if professor_category is not None:
        filters["professor_category"] = professor_category

    return await crud_catalog_professor.get_multi(db=db, offset=offset, limit=limit, **filters)


async def get_deleted_professors(db: AsyncSession, offset: int = 0, limit: int = 100):
    """Obtener todos los profesores eliminados (soft deleted)."""
    return await crud_catalog_professor.get_multi(db=db, offset=offset, limit=limit, deleted=True)


async def soft_delete_professor(db: AsyncSession, id: int) -> bool:
    """Marcar un profesor como eliminado (soft delete)."""
    update_data = CatalogProfessorUpdate(deleted=True, deleted_at=datetime.now(UTC))

    await crud_catalog_professor.update(db=db, object=update_data, id=id)
    await db.commit()
    return True


async def restore_professor(db: AsyncSession, id: int) -> bool:
    """Restaurar un profesor eliminado (revertir soft delete)."""
    update_data = CatalogProfessorUpdate(deleted=False, deleted_at=None)

    await crud_catalog_professor.update(db=db, object=update_data, id=id)
    await db.commit()
    return True


async def hard_delete_professor(db: AsyncSession, id: int) -> bool:
    """Eliminar permanentemente un profesor de la base de datos."""
    stmt = delete(CatalogProfessor).where(CatalogProfessor.id == id)
    await db.execute(stmt)
    await db.commit()
    return True
