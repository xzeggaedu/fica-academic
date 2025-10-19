"""Operaciones CRUD para el modelo CatalogSubject."""

from fastcrud import FastCRUD
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models.catalog_subject import CatalogSubject
from ..models.subject_school import SubjectSchool
from ..schemas.catalog_subject import (
    CatalogSubjectCreate,
    CatalogSubjectRead,
    CatalogSubjectUpdate,
)

CRUDCatalogSubject = FastCRUD[
    CatalogSubject,
    CatalogSubjectCreate,
    CatalogSubjectUpdate,
    CatalogSubjectRead,
    CatalogSubjectRead,
    CatalogSubjectRead,
]
crud_catalog_subject = CRUDCatalogSubject(CatalogSubject)


async def create_subject_with_schools(db: AsyncSession, subject_data: CatalogSubjectCreate) -> CatalogSubject:
    """Crear una asignatura con sus escuelas asociadas.

    Args:
    ----
        db: Sesión de base de datos
        subject_data: Datos de la asignatura a crear

    Returns:
    -------
        La asignatura creada con sus escuelas
    """
    # Crear la asignatura
    subject = CatalogSubject(
        subject_code=subject_data.subject_code,
        subject_name=subject_data.subject_name,
        department_code=subject_data.department_code,
        is_bilingual=subject_data.is_bilingual,
        is_active=subject_data.is_active,
    )

    db.add(subject)
    await db.flush()  # Flush para obtener el ID

    # Crear las relaciones con escuelas
    for school_id in subject_data.school_ids:
        subject_school = SubjectSchool(subject_id=subject.id, school_id=school_id)
        db.add(subject_school)

    await db.commit()
    await db.refresh(subject)

    # Cargar las relaciones
    result = await db.execute(
        select(CatalogSubject).where(CatalogSubject.id == subject.id).options(selectinload(CatalogSubject.schools))
    )
    return result.scalar_one()


async def update_subject_with_schools(
    db: AsyncSession, subject_id: int, subject_data: CatalogSubjectUpdate
) -> CatalogSubject | None:
    """Actualizar una asignatura y sus escuelas asociadas.

    Args:
    ----
        db: Sesión de base de datos
        subject_id: ID de la asignatura a actualizar
        subject_data: Datos actualizados de la asignatura

    Returns:
    -------
        La asignatura actualizada o None si no existe
    """
    # Buscar la asignatura
    result = await db.execute(
        select(CatalogSubject).where(CatalogSubject.id == subject_id).options(selectinload(CatalogSubject.schools))
    )
    subject = result.scalar_one_or_none()

    if not subject:
        return None

    # Actualizar campos de la asignatura
    if subject_data.subject_code is not None:
        subject.subject_code = subject_data.subject_code
    if subject_data.subject_name is not None:
        subject.subject_name = subject_data.subject_name
    if subject_data.department_code is not None:
        subject.department_code = subject_data.department_code
    if subject_data.is_bilingual is not None:
        subject.is_bilingual = subject_data.is_bilingual
    if subject_data.is_active is not None:
        subject.is_active = subject_data.is_active

    # Si se proporcionaron school_ids, actualizar las relaciones
    if subject_data.school_ids is not None:
        # Eliminar relaciones existentes
        for school_rel in subject.schools:
            await db.delete(school_rel)

        await db.flush()

        # Crear nuevas relaciones
        for school_id in subject_data.school_ids:
            subject_school = SubjectSchool(subject_id=subject.id, school_id=school_id)
            db.add(subject_school)

    await db.commit()
    await db.refresh(subject)

    # Recargar con escuelas
    result = await db.execute(
        select(CatalogSubject).where(CatalogSubject.id == subject.id).options(selectinload(CatalogSubject.schools))
    )
    return result.scalar_one()


async def get_subject_with_schools(db: AsyncSession, subject_id: int) -> CatalogSubject | None:
    """Obtener una asignatura con sus escuelas asociadas.

    Args:
    ----
        db: Sesión de base de datos
        subject_id: ID de la asignatura

    Returns:
    -------
        La asignatura con sus escuelas o None si no existe
    """
    result = await db.execute(
        select(CatalogSubject).where(CatalogSubject.id == subject_id).options(selectinload(CatalogSubject.schools))
    )
    return result.scalar_one_or_none()


async def get_active_subjects(db: AsyncSession) -> list[CatalogSubject]:
    """Obtener todas las asignaturas activas con sus escuelas.

    Args:
    ----
        db: Sesión de base de datos

    Returns:
    -------
        Lista de asignaturas activas con sus escuelas
    """
    result = await db.execute(
        select(CatalogSubject)
        .where(CatalogSubject.is_active.is_(True))
        .where((CatalogSubject.deleted.is_(False)) | (CatalogSubject.deleted.is_(None)))
        .options(selectinload(CatalogSubject.schools))
        .order_by(CatalogSubject.subject_code)
    )
    return list(result.scalars().all())


async def get_non_deleted_subjects(
    db: AsyncSession, offset: int = 0, limit: int = 100, is_active: bool | None = None
) -> dict:
    """Obtener todas las asignaturas no eliminadas (soft delete).

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

    return await crud_catalog_subject.get_multi(db=db, offset=offset, limit=limit, **filters)


async def get_deleted_subjects(db: AsyncSession, offset: int = 0, limit: int = 100) -> dict:
    """Obtener todas las asignaturas eliminadas (soft delete).

    Args:
    ----
        db: Sesión de base de datos
        offset: Número de registros a saltar
        limit: Número máximo de registros a devolver

    Returns:
    -------
        Diccionario con datos y conteo total
    """
    return await crud_catalog_subject.get_multi(db=db, offset=offset, limit=limit, deleted=True)


async def soft_delete_subject(db: AsyncSession, subject_id: int) -> bool:
    """Marcar una asignatura como eliminada (soft delete).

    Args:
    ----
        db: Sesión de base de datos
        subject_id: ID de la asignatura a eliminar

    Returns:
    -------
        True si se eliminó correctamente
    """
    from datetime import UTC, datetime

    from ..schemas.catalog_subject import CatalogSubjectUpdate

    update_data = CatalogSubjectUpdate(deleted=True, deleted_at=datetime.now(UTC))

    await crud_catalog_subject.update(db=db, object=update_data, id=subject_id)
    await db.commit()
    return True


async def restore_subject(db: AsyncSession, subject_id: int) -> bool:
    """Restaurar una asignatura eliminada (revertir soft delete).

    Args:
    ----
        db: Sesión de base de datos
        subject_id: ID de la asignatura a restaurar

    Returns:
    -------
        True si se restauró correctamente
    """
    from ..schemas.catalog_subject import CatalogSubjectUpdate

    update_data = CatalogSubjectUpdate(deleted=False, deleted_at=None)

    await crud_catalog_subject.update(db=db, object=update_data, id=subject_id)
    await db.commit()
    return True


async def subject_code_exists(db: AsyncSession, subject_code: str) -> bool:
    """Verificar si existe una asignatura con el código dado.

    Args:
    ----
        db: Sesión de base de datos
        subject_code: Código de la asignatura a verificar

    Returns:
    -------
        True si el código existe
    """
    result = await crud_catalog_subject.exists(db=db, subject_code=subject_code)
    return result
