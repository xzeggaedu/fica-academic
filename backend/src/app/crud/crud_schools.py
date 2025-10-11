"""Operaciones CRUD para el modelo School."""

from fastcrud import FastCRUD

from ..models.school import School

# Crear instancia CRUD para School
crud_schools = FastCRUD(School)


async def get_school_by_id(db, school_id: int):
    """Obtener escuela por ID."""
    return await crud_schools.get(db=db, id=school_id)


async def get_schools_by_faculty(db, faculty_id: int, offset: int = 0, limit: int = 100):
    """Obtener todas las escuelas de una facultad específica."""
    return await crud_schools.get_multi(db=db, offset=offset, limit=limit, fk_faculty=faculty_id)


async def get_active_schools(db, offset: int = 0, limit: int = 100):
    """Obtener todas las escuelas activas."""
    return await crud_schools.get_multi(db=db, offset=offset, limit=limit, is_active=True)


async def school_exists(db, name: str, faculty_id: int) -> bool:
    """Verificar si existe una escuela con el nombre dado en una facultad."""
    result = await crud_schools.exists(db=db, name=name, fk_faculty=faculty_id)
    return result


async def school_acronym_exists(db, acronym: str, faculty_id: int) -> bool:
    """Verificar si existe una escuela con el acrónimo dado en una facultad."""
    result = await crud_schools.exists(db=db, acronym=acronym, fk_faculty=faculty_id)
    return result


# Alias para compatibilidad
get_school_by_uuid = get_school_by_id
