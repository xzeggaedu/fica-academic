"""Operaciones CRUD para el modelo Faculty."""

from datetime import UTC, datetime

from fastcrud import FastCRUD

from ..models.faculty import Faculty

# Crear instancia CRUD para Faculty
crud_faculties = FastCRUD(Faculty)


async def get_faculty_by_id(db, faculty_id: int):
    """Obtener facultad por ID."""
    return await crud_faculties.get(db=db, id=faculty_id)


async def get_active_faculties(db, offset: int = 0, limit: int = 100):
    """Obtener todas las facultades activas."""
    return await crud_faculties.get_multi(db=db, offset=offset, limit=limit, is_active=True)


async def faculty_exists(db, name: str) -> bool:
    """Verificar si existe una facultad con el nombre dado."""
    result = await crud_faculties.exists(db=db, name=name)
    return result


async def faculty_acronym_exists(db, acronym: str) -> bool:
    """Verificar si existe una facultad con el acrónimo dado."""
    result = await crud_faculties.exists(db=db, acronym=acronym)
    return result


# Soft Delete operations
async def soft_delete_faculty(db, faculty_id: int) -> bool:
    """Marcar una facultad como eliminada (soft delete)."""
    from ..schemas.faculty import FacultyUpdate

    update_data = FacultyUpdate(deleted=True, deleted_at=datetime.now(UTC))

    await crud_faculties.update(db=db, object=update_data, id=faculty_id)
    await db.commit()
    return True


async def restore_faculty(db, faculty_id: int) -> bool:
    """Restaurar una facultad eliminada (revertir soft delete)."""
    from ..schemas.faculty import FacultyUpdate

    update_data = FacultyUpdate(deleted=False, deleted_at=None)

    await crud_faculties.update(db=db, object=update_data, id=faculty_id)
    await db.commit()
    return True


async def get_deleted_faculties(db, offset: int = 0, limit: int = 100):
    """Obtener todas las facultades eliminadas (soft deleted)."""
    return await crud_faculties.get_multi(db=db, offset=offset, limit=limit, deleted=True)


async def get_non_deleted_faculties(db, offset: int = 0, limit: int = 100, is_active: bool | None = None):
    """Obtener todas las facultades no eliminadas (soft delete)."""
    filters = {"deleted": False}
    if is_active is not None:
        filters["is_active"] = is_active

    return await crud_faculties.get_multi(db=db, offset=offset, limit=limit, **filters)


async def hard_delete_faculty(db, faculty_id: int) -> bool:
    """Eliminar permanentemente una facultad de la base de datos."""
    from sqlalchemy import delete

    stmt = delete(Faculty).where(Faculty.id == faculty_id)
    await db.execute(stmt)
    await db.commit()
    return True


# Alias para compatibilidad
get_faculty_by_uuid = get_faculty_by_id
