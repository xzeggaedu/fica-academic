"""Endpoints de API para el catálogo de asignaturas."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastcrud.paginated import PaginatedListResponse, compute_offset
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_superuser, get_current_user
from ...core.db.database import async_get_db
from ...crud.crud_catalog_course import (
    create_course_with_schools,
    crud_catalog_course,
    get_active_courses,
    get_course_with_schools,
    update_course_with_schools,
)
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
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],  # All authenticated users
    page: int = 1,
    items_per_page: int = 50,
    search: str | None = None,
) -> dict[str, Any]:
    """Obtener lista paginada de cursos con búsqueda.

    Accesible para todos los usuarios autenticados.
    """
    from sqlalchemy import func, or_, select
    from sqlalchemy.orm import selectinload

    # Construir query base con relaciones cargadas
    query = select(CatalogCourse).options(selectinload(CatalogCourse.schools))

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

    # No filtrar por is_active - mostrar todos los cursos para gestión completa

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
    """Eliminar un curso del catálogo.

    Solo administradores.
    """
    course = await crud_catalog_course.get(db=db, id=course_id)

    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado")

    await crud_catalog_course.delete(db=db, id=course_id)
