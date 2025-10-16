"""Operaciones CRUD para el modelo CatalogCourse."""

from fastcrud import FastCRUD
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models.catalog_course import CatalogCourse
from ..models.course_school import CourseSchool
from ..schemas.catalog_course import (
    CatalogCourseCreate,
    CatalogCourseRead,
    CatalogCourseUpdate,
)

CRUDCatalogCourse = FastCRUD[
    CatalogCourse,
    CatalogCourseCreate,
    CatalogCourseUpdate,
    CatalogCourseRead,
    CatalogCourseRead,
    CatalogCourseRead,
]
crud_catalog_course = CRUDCatalogCourse(CatalogCourse)


async def create_course_with_schools(db: AsyncSession, course_data: CatalogCourseCreate) -> CatalogCourse:
    """Crear un curso con sus escuelas asociadas.

    Args:
    ----
        db: Sesión de base de datos
        course_data: Datos del curso a crear

    Returns:
    -------
        El curso creado con sus escuelas
    """
    # Crear el curso
    course = CatalogCourse(
        course_code=course_data.course_code,
        course_name=course_data.course_name,
        department_code=course_data.department_code,
        is_active=course_data.is_active,
    )

    db.add(course)
    await db.flush()  # Flush para obtener el ID

    # Crear las relaciones con escuelas
    for school_id in course_data.school_ids:
        course_school = CourseSchool(course_id=course.id, school_id=school_id)
        db.add(course_school)

    await db.commit()
    await db.refresh(course)

    # Cargar las relaciones
    result = await db.execute(
        select(CatalogCourse).where(CatalogCourse.id == course.id).options(selectinload(CatalogCourse.schools))
    )
    return result.scalar_one()


async def update_course_with_schools(
    db: AsyncSession, course_id: int, course_data: CatalogCourseUpdate
) -> CatalogCourse | None:
    """Actualizar un curso y sus escuelas asociadas.

    Args:
    ----
        db: Sesión de base de datos
        course_id: ID del curso a actualizar
        course_data: Datos actualizados del curso

    Returns:
    -------
        El curso actualizado o None si no existe
    """
    # Buscar el curso
    result = await db.execute(
        select(CatalogCourse).where(CatalogCourse.id == course_id).options(selectinload(CatalogCourse.schools))
    )
    course = result.scalar_one_or_none()

    if not course:
        return None

    # Actualizar campos del curso
    if course_data.course_code is not None:
        course.course_code = course_data.course_code
    if course_data.course_name is not None:
        course.course_name = course_data.course_name
    if course_data.department_code is not None:
        course.department_code = course_data.department_code
    if course_data.is_active is not None:
        course.is_active = course_data.is_active

    # Si se proporcionaron school_ids, actualizar las relaciones
    if course_data.school_ids is not None:
        # Eliminar relaciones existentes
        for school_rel in course.schools:
            await db.delete(school_rel)

        await db.flush()

        # Crear nuevas relaciones
        for school_id in course_data.school_ids:
            course_school = CourseSchool(course_id=course.id, school_id=school_id)
            db.add(course_school)

    await db.commit()
    await db.refresh(course)

    # Recargar con escuelas
    result = await db.execute(
        select(CatalogCourse).where(CatalogCourse.id == course.id).options(selectinload(CatalogCourse.schools))
    )
    return result.scalar_one()


async def get_course_with_schools(db: AsyncSession, course_id: int) -> CatalogCourse | None:
    """Obtener un curso con sus escuelas asociadas.

    Args:
    ----
        db: Sesión de base de datos
        course_id: ID del curso

    Returns:
    -------
        El curso con sus escuelas o None si no existe
    """
    result = await db.execute(
        select(CatalogCourse).where(CatalogCourse.id == course_id).options(selectinload(CatalogCourse.schools))
    )
    return result.scalar_one_or_none()


async def get_active_courses(db: AsyncSession) -> list[CatalogCourse]:
    """Obtener todos los cursos activos con sus escuelas.

    Args:
    ----
        db: Sesión de base de datos

    Returns:
    -------
        Lista de cursos activos con sus escuelas
    """
    result = await db.execute(
        select(CatalogCourse)
        .where(CatalogCourse.is_active.is_(True))
        .where((CatalogCourse.deleted.is_(False)) | (CatalogCourse.deleted.is_(None)))
        .options(selectinload(CatalogCourse.schools))
        .order_by(CatalogCourse.course_code)
    )
    return list(result.scalars().all())


async def get_non_deleted_courses(
    db: AsyncSession, offset: int = 0, limit: int = 100, is_active: bool | None = None
) -> dict:
    """Obtener todos los cursos no eliminados (soft delete).

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

    return await crud_catalog_course.get_multi(db=db, offset=offset, limit=limit, **filters)


async def get_deleted_courses(db: AsyncSession, offset: int = 0, limit: int = 100) -> dict:
    """Obtener todos los cursos eliminados (soft delete).

    Args:
    ----
        db: Sesión de base de datos
        offset: Número de registros a saltar
        limit: Número máximo de registros a devolver

    Returns:
    -------
        Diccionario con datos y conteo total
    """
    return await crud_catalog_course.get_multi(db=db, offset=offset, limit=limit, deleted=True)


async def soft_delete_course(db: AsyncSession, course_id: int) -> bool:
    """Marcar un curso como eliminado (soft delete).

    Args:
    ----
        db: Sesión de base de datos
        course_id: ID del curso a eliminar

    Returns:
    -------
        True si se eliminó correctamente
    """
    from datetime import UTC, datetime

    from ..schemas.catalog_course import CatalogCourseUpdate

    update_data = CatalogCourseUpdate(deleted=True, deleted_at=datetime.now(UTC))

    await crud_catalog_course.update(db=db, object=update_data, id=course_id)
    await db.commit()
    return True


async def restore_course(db: AsyncSession, course_id: int) -> bool:
    """Restaurar un curso eliminado (revertir soft delete).

    Args:
    ----
        db: Sesión de base de datos
        course_id: ID del curso a restaurar

    Returns:
    -------
        True si se restauró correctamente
    """
    from ..schemas.catalog_course import CatalogCourseUpdate

    update_data = CatalogCourseUpdate(deleted=False, deleted_at=None)

    await crud_catalog_course.update(db=db, object=update_data, id=course_id)
    await db.commit()
    return True


async def course_code_exists(db: AsyncSession, course_code: str) -> bool:
    """Verificar si existe un curso con el código dado.

    Args:
    ----
        db: Sesión de base de datos
        course_code: Código del curso a verificar

    Returns:
    -------
        True si el código existe
    """
    result = await crud_catalog_course.exists(db=db, course_code=course_code)
    return result
