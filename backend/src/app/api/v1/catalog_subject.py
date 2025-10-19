"""Endpoints de API para el catálogo de asignaturas."""

from typing import Annotated, Any, cast

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastcrud.paginated import PaginatedListResponse, compute_offset
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_superuser, get_current_user
from ...core.db.database import async_get_db
from ...core.exceptions.http_exceptions import NotFoundException
from ...crud.crud_catalog_subject import (
    create_subject_with_schools,
    crud_catalog_subject,
    get_active_subjects,
    get_subject_with_schools,
    restore_subject,
    soft_delete_subject,
    update_subject_with_schools,
)
from ...crud.crud_recycle_bin import create_recycle_bin_entry, find_recycle_bin_entry, mark_as_restored
from ...models.catalog_subject import CatalogSubject
from ...schemas.catalog_subject import (
    CatalogSubjectCreate,
    CatalogSubjectRead,
    CatalogSubjectUpdate,
)

router = APIRouter(prefix="/catalog/subjects", tags=["catalog-subjects"])


@router.post(
    "",
    response_model=CatalogSubjectRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_subject(
    subject_data: CatalogSubjectCreate,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> CatalogSubjectRead:
    """Crear una nueva asignatura en el catálogo.

    Solo administradores.
    """
    # Verificar si el código de la asignatura ya existe
    existing_subject = await crud_catalog_subject.get(db=db, subject_code=subject_data.subject_code)

    if existing_subject:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe una asignatura con el código '{subject_data.subject_code}'",
        )

    subject = await create_subject_with_schools(db, subject_data)
    return CatalogSubjectRead.model_validate(subject)


@router.get(
    "",
    response_model=PaginatedListResponse[CatalogSubjectRead],
)
async def read_subjects(
    request: Request,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],  # All authenticated users
    page: int = 1,
    items_per_page: int = 50,
    search: str | None = None,
    is_active: bool | None = None,
    include_deleted: bool = False,
) -> dict[str, Any]:
    """Obtener lista paginada de asignaturas con búsqueda.

    Accesible para todos los usuarios autenticados.
    """
    from sqlalchemy import func, or_, select
    from sqlalchemy.orm import selectinload

    # Construir query base con relaciones cargadas
    query = select(CatalogSubject).options(selectinload(CatalogSubject.schools))

    # Filtrar por deleted (None se trata como False)
    if include_deleted:
        query = query.where(CatalogSubject.deleted.is_(True))
    else:
        query = query.where((CatalogSubject.deleted.is_(False)) | (CatalogSubject.deleted.is_(None)))

    # Aplicar filtro de búsqueda si se proporciona
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                CatalogSubject.subject_code.ilike(search_pattern),
                CatalogSubject.subject_name.ilike(search_pattern),
                CatalogSubject.department_code.ilike(search_pattern),
            )
        )

    # Filtrar por is_active si se proporciona
    if is_active is not None:
        query = query.where(CatalogSubject.is_active == is_active)

    # Contar total de registros
    count_query = select(func.count()).select_from(query.subquery())
    total_count_result = await db.execute(count_query)
    total_count = total_count_result.scalar_one()

    # Aplicar paginación y ordenamiento
    query = query.order_by(CatalogSubject.subject_code)
    query = query.offset(compute_offset(page, items_per_page)).limit(items_per_page)

    # Ejecutar query
    result = await db.execute(query)
    subjects = list(result.scalars().all())

    # Convertir a esquema de respuesta
    subjects_read = [CatalogSubjectRead.model_validate(subject) for subject in subjects]

    total_pages = (total_count + items_per_page - 1) // items_per_page if items_per_page else 1
    has_more = page < total_pages

    return {
        "data": subjects_read,
        "total_count": total_count,
        "page": page,
        "items_per_page": items_per_page,
        "total_pages": total_pages,
        "has_more": has_more,
    }


@router.get(
    "/active",
    response_model=list[CatalogSubjectRead],
)
async def read_active_subjects(
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],  # All authenticated users
) -> list[CatalogSubjectRead]:
    """Obtener todas las asignaturas activas sin paginación.

    Útil para formularios y selects. Accesible para todos los usuarios autenticados.
    """
    subjects = await get_active_subjects(db)
    return [CatalogSubjectRead.model_validate(subject) for subject in subjects]


@router.get(
    "/{subject_id}",
    response_model=CatalogSubjectRead,
)
async def read_subject(
    subject_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],  # All authenticated users
) -> CatalogSubjectRead:
    """Obtener una asignatura por su ID.

    Accesible para todos los usuarios autenticados.
    """
    subject = await get_subject_with_schools(db, subject_id)

    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asignatura no encontrada")

    return CatalogSubjectRead.model_validate(subject)


@router.patch(
    "/{subject_id}",
    response_model=CatalogSubjectRead,
)
async def update_subject(
    subject_id: int,
    subject_data: CatalogSubjectUpdate,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> CatalogSubjectRead:
    """Actualizar una asignatura existente.

    Solo administradores.
    """
    # Si se está actualizando el código, verificar que no exista otra asignatura con ese código
    if subject_data.subject_code:
        existing_subject = await crud_catalog_subject.get(db=db, subject_code=subject_data.subject_code)

        if existing_subject and existing_subject.get("id") != subject_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe otra asignatura con el código '{subject_data.subject_code}'",
            )

    subject = await update_subject_with_schools(db, subject_id, subject_data)

    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asignatura no encontrada")

    return CatalogSubjectRead.model_validate(subject)


@router.delete(
    "/{subject_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_subject(
    subject_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> None:
    """Eliminar una asignatura del catálogo (hard delete).

    Solo administradores.
    """
    subject = await crud_catalog_subject.get(db=db, id=subject_id)

    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asignatura no encontrada")

    await crud_catalog_subject.delete(db=db, id=subject_id)


@router.patch("/soft-delete/{subject_id}", response_model=CatalogSubjectRead)
async def soft_delete_subject_endpoint(
    request: Request,
    subject_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
    values: dict = None,
) -> CatalogSubjectRead:
    """Eliminar una asignatura (soft delete) - Solo Admin.

    Esto marcará la asignatura como eliminada pero no la removerá físicamente de la base de datos.
    También crea un registro en RecycleBin para auditoría y posible restauración.

    Args:
    ----
        request: Objeto request de FastAPI
        subject_id: ID de la asignatura a eliminar
        db: Sesión de base de datos
        current_user: Usuario admin autenticado actual

    Returns:
    -------
        Datos de la asignatura eliminada

    Raises:
    ------
        NotFoundException: Si la asignatura no se encuentra
    """
    # Verificar si la asignatura existe
    db_subject = await get_subject_with_schools(db=db, subject_id=subject_id)
    if db_subject is None:
        raise NotFoundException(f"No se encontró la asignatura con id '{subject_id}'")

    # Soft delete subject
    success = await soft_delete_subject(db=db, subject_id=subject_id)
    if not success:
        raise NotFoundException(f"Error al eliminar la asignatura con id '{subject_id}'")

    # Crear registro en RecycleBin
    await create_recycle_bin_entry(
        db=db,
        entity_type="subject",
        entity_id=str(subject_id),
        entity_display_name=f"{db_subject.subject_name} ({db_subject.subject_code})",
        deleted_by_id=current_user["user_uuid"],
        deleted_by_name=current_user["name"],
        reason=None,
        can_restore=True,
    )

    # Retrieve and return updated subject
    updated_subject = await get_subject_with_schools(db=db, subject_id=subject_id)
    return cast(CatalogSubjectRead, CatalogSubjectRead.model_validate(updated_subject))


@router.patch("/restore/{subject_id}", response_model=CatalogSubjectRead)
async def restore_subject_endpoint(
    request: Request,
    subject_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
    values: dict = None,
) -> CatalogSubjectRead:
    """Restaurar una asignatura eliminada (soft delete) - Solo Admin.

    Esto revertirá la eliminación de la asignatura y actualizará el registro en RecycleBin.

    Args:
    ----
        request: Objeto request de FastAPI
        subject_id: ID de la asignatura a restaurar
        db: Sesión de base de datos
        current_user: Usuario admin autenticado actual

    Returns:
    -------
        Datos de la asignatura restaurada

    Raises:
    ------
        NotFoundException: Si la asignatura no se encuentra
    """
    # Verificar si la asignatura existe
    db_subject = await get_subject_with_schools(db=db, subject_id=subject_id)
    if db_subject is None:
        raise NotFoundException(f"No se encontró la asignatura con id '{subject_id}'")

    # Restore subject
    success = await restore_subject(db=db, subject_id=subject_id)
    if not success:
        raise NotFoundException(f"Error al restaurar la asignatura con id '{subject_id}'")

    # Buscar y actualizar registro en RecycleBin
    recycle_bin_entry = await find_recycle_bin_entry(db=db, entity_type="subject", entity_id=str(subject_id))
    if recycle_bin_entry:
        await mark_as_restored(
            db=db,
            recycle_bin_id=recycle_bin_entry["id"],
            restored_by_id=current_user["user_uuid"],
            restored_by_name=current_user["name"],
        )

    # Retrieve and return updated subject
    updated_subject = await get_subject_with_schools(db=db, subject_id=subject_id)
    return cast(CatalogSubjectRead, CatalogSubjectRead.model_validate(updated_subject))


@router.post(
    "",
    response_model=CatalogSubjectRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_course(
    subject_data: CatalogSubjectCreate,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> CatalogSubjectRead:
    """Crear una nueva asignatura en el catálogo.

    Solo administradores.
    """
    # Verificar si el código del curso ya existe
    existing_subject = await crud_catalog_subject.get(db=db, subject_code=subject_data.subject_code)

    if existing_subject:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe una asignatura con el código '{subject_data.subject_code}'",
        )

    subject = await create_subject_with_schools(db, subject_data)
    return CatalogSubjectRead.model_validate(subject)


@router.get(
    "/{subject_id}",
    response_model=CatalogSubjectRead,
)
async def read_course(
    subject_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],  # All authenticated users
) -> CatalogSubjectRead:
    """Obtener un curso por su ID.

    Accesible para todos los usuarios autenticados.
    """
    subject = await get_subject_with_schools(db, subject_id)

    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asignatura no encontrada")

    return CatalogSubjectRead.model_validate(subject)


@router.patch(
    "/{subject_id}",
    response_model=CatalogSubjectRead,
)
async def update_course(
    subject_id: int,
    subject_data: CatalogSubjectUpdate,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> CatalogSubjectRead:
    """Actualizar un curso existente.

    Solo administradores.
    """
    # Si se está actualizando el código, verificar que no exista otro curso con ese código
    if subject_data.subject_code:
        existing_subject = await crud_catalog_subject.get(db=db, subject_code=subject_data.subject_code)

        if existing_subject and existing_subject.id != subject_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe otro curso con el código '{subject_data.subject_code}'",
            )

    subject = await update_subject_with_schools(db, subject_id, subject_data)

    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asignatura no encontrada")

    return CatalogSubjectRead.model_validate(subject)


@router.delete(
    "/{subject_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_course(
    subject_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> None:
    """Eliminar un curso del catálogo (hard delete).

    Solo administradores.
    """
    subject = await crud_catalog_subject.get(db=db, id=subject_id)

    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asignatura no encontrada")

    await crud_catalog_subject.delete(db=db, id=subject_id)
