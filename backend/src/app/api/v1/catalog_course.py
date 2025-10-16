"""Endpoints de API para el catálogo de asignaturas."""

from typing import Annotated, Any, cast

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastcrud.paginated import PaginatedListResponse, compute_offset
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_superuser, get_current_user
from ...core.db.database import async_get_db
from ...core.exceptions.http_exceptions import NotFoundException
from ...crud.crud_catalog_course import (
    create_course_with_schools,
    crud_catalog_course,
    get_active_courses,
    get_course_with_schools,
    restore_course,
    soft_delete_course,
    update_course_with_schools,
)
from ...crud.crud_recycle_bin import create_recycle_bin_entry, find_recycle_bin_entry, mark_as_restored
from ...models.catalog_course import CatalogCourse
from ...schemas.catalog_course import (
    CatalogCourseCreate,
    CatalogCourseRead,
    CatalogCourseUpdate,
)

router = APIRouter(prefix="/catalog/courses", tags=["catalog-courses"])


@router.post(
    "",
    response_model=CatalogCourseRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_course(
    course_data: CatalogCourseCreate,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> CatalogCourseRead:
    """Crear un nuevo curso en el catálogo.

    Solo administradores.
    """
    # Verificar si el código del curso ya existe
    existing_course = await crud_catalog_course.get(db=db, course_code=course_data.course_code)

    if existing_course:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un curso con el código '{course_data.course_code}'",
        )

    course = await create_course_with_schools(db, course_data)
    return CatalogCourseRead.model_validate(course)


@router.get(
    "",
    response_model=PaginatedListResponse[CatalogCourseRead],
)
async def read_courses(
    request: Request,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],  # All authenticated users
    page: int = 1,
    items_per_page: int = 50,
    search: str | None = None,
    is_active: bool | None = None,
    include_deleted: bool = False,
) -> dict[str, Any]:
    """Obtener lista paginada de cursos con búsqueda.

    Accesible para todos los usuarios autenticados.
    """
    from sqlalchemy import func, or_, select
    from sqlalchemy.orm import selectinload

    # Construir query base con relaciones cargadas
    query = select(CatalogCourse).options(selectinload(CatalogCourse.schools))

    # Filtrar por deleted (None se trata como False)
    if include_deleted:
        query = query.where(CatalogCourse.deleted.is_(True))
    else:
        query = query.where((CatalogCourse.deleted.is_(False)) | (CatalogCourse.deleted.is_(None)))

    # Aplicar filtro de búsqueda si se proporciona
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                CatalogCourse.course_code.ilike(search_pattern),
                CatalogCourse.course_name.ilike(search_pattern),
                CatalogCourse.department_code.ilike(search_pattern),
            )
        )

    # Filtrar por is_active si se proporciona
    if is_active is not None:
        query = query.where(CatalogCourse.is_active == is_active)

    # Contar total de registros
    count_query = select(func.count()).select_from(query.subquery())
    total_count_result = await db.execute(count_query)
    total_count = total_count_result.scalar_one()

    # Aplicar paginación y ordenamiento
    query = query.order_by(CatalogCourse.course_code)
    query = query.offset(compute_offset(page, items_per_page)).limit(items_per_page)

    # Ejecutar query
    result = await db.execute(query)
    courses = list(result.scalars().all())

    # Convertir a esquema de respuesta
    courses_read = [CatalogCourseRead.model_validate(course) for course in courses]

    total_pages = (total_count + items_per_page - 1) // items_per_page if items_per_page else 1
    has_more = page < total_pages

    return {
        "data": courses_read,
        "total_count": total_count,
        "page": page,
        "items_per_page": items_per_page,
        "total_pages": total_pages,
        "has_more": has_more,
    }


@router.get(
    "/active",
    response_model=list[CatalogCourseRead],
)
async def read_active_courses(
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],  # All authenticated users
) -> list[CatalogCourseRead]:
    """Obtener todos los cursos activos sin paginación.

    Útil para formularios y selects. Accesible para todos los usuarios autenticados.
    """
    courses = await get_active_courses(db)
    return [CatalogCourseRead.model_validate(course) for course in courses]


@router.get(
    "/{course_id}",
    response_model=CatalogCourseRead,
)
async def read_course(
    course_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],  # All authenticated users
) -> CatalogCourseRead:
    """Obtener un curso por su ID.

    Accesible para todos los usuarios autenticados.
    """
    course = await get_course_with_schools(db, course_id)

    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado")

    return CatalogCourseRead.model_validate(course)


@router.patch(
    "/{course_id}",
    response_model=CatalogCourseRead,
)
async def update_course(
    course_id: int,
    course_data: CatalogCourseUpdate,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> CatalogCourseRead:
    """Actualizar un curso existente.

    Solo administradores.
    """
    # Si se está actualizando el código, verificar que no exista otro curso con ese código
    if course_data.course_code:
        existing_course = await crud_catalog_course.get(db=db, course_code=course_data.course_code)

        if existing_course and existing_course.get("id") != course_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe otro curso con el código '{course_data.course_code}'",
            )

    course = await update_course_with_schools(db, course_id, course_data)

    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado")

    return CatalogCourseRead.model_validate(course)


@router.delete(
    "/{course_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_course(
    course_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> None:
    """Eliminar un curso del catálogo (hard delete).

    Solo administradores.
    """
    course = await crud_catalog_course.get(db=db, id=course_id)

    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado")

    await crud_catalog_course.delete(db=db, id=course_id)


@router.patch("/soft-delete/{course_id}", response_model=CatalogCourseRead)
async def soft_delete_course_endpoint(
    request: Request,
    course_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
    values: dict = None,
) -> CatalogCourseRead:
    """Eliminar un curso (soft delete) - Solo Admin.

    Esto marcará el curso como eliminado pero no lo removerá físicamente de la base de datos.
    También crea un registro en RecycleBin para auditoría y posible restauración.

    Args:
    ----
        request: Objeto request de FastAPI
        course_id: ID del curso a eliminar
        db: Sesión de base de datos
        current_user: Usuario admin autenticado actual

    Returns:
    -------
        Datos del curso eliminado

    Raises:
    ------
        NotFoundException: Si el curso no se encuentra
    """
    # Verificar si el curso existe
    db_course = await get_course_with_schools(db=db, course_id=course_id)
    if db_course is None:
        raise NotFoundException(f"No se encontró el curso con id '{course_id}'")

    # Soft delete course
    success = await soft_delete_course(db=db, course_id=course_id)
    if not success:
        raise NotFoundException(f"Error al eliminar el curso con id '{course_id}'")

    # Crear registro en RecycleBin
    await create_recycle_bin_entry(
        db=db,
        entity_type="course",
        entity_id=str(course_id),
        entity_display_name=f"{db_course.course_name} ({db_course.course_code})",
        deleted_by_id=current_user["user_uuid"],
        deleted_by_name=current_user["name"],
        reason=None,
        can_restore=True,
    )

    # Retrieve and return updated course
    updated_course = await get_course_with_schools(db=db, course_id=course_id)
    return cast(CatalogCourseRead, CatalogCourseRead.model_validate(updated_course))


@router.patch("/restore/{course_id}", response_model=CatalogCourseRead)
async def restore_course_endpoint(
    request: Request,
    course_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
    values: dict = None,
) -> CatalogCourseRead:
    """Restaurar un curso eliminado (soft delete) - Solo Admin.

    Esto revertirá la eliminación del curso y actualizará el registro en RecycleBin.

    Args:
    ----
        request: Objeto request de FastAPI
        course_id: ID del curso a restaurar
        db: Sesión de base de datos
        current_user: Usuario admin autenticado actual

    Returns:
    -------
        Datos del curso restaurado

    Raises:
    ------
        NotFoundException: Si el curso no se encuentra
    """
    # Verificar si el curso existe
    db_course = await get_course_with_schools(db=db, course_id=course_id)
    if db_course is None:
        raise NotFoundException(f"No se encontró el curso con id '{course_id}'")

    # Restore course
    success = await restore_course(db=db, course_id=course_id)
    if not success:
        raise NotFoundException(f"Error al restaurar el curso con id '{course_id}'")

    # Buscar y actualizar registro en RecycleBin
    recycle_bin_entry = await find_recycle_bin_entry(db=db, entity_type="course", entity_id=str(course_id))
    if recycle_bin_entry:
        await mark_as_restored(
            db=db,
            recycle_bin_id=recycle_bin_entry["id"],
            restored_by_id=current_user["user_uuid"],
            restored_by_name=current_user["name"],
        )

    # Retrieve and return updated course
    updated_course = await get_course_with_schools(db=db, course_id=course_id)
    return cast(CatalogCourseRead, CatalogCourseRead.model_validate(updated_course))
