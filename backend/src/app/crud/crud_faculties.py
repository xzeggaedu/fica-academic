"""Operaciones CRUD para el modelo Faculty."""

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


# Alias para compatibilidad
get_faculty_by_uuid = get_faculty_by_id
