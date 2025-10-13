"""Endpoints de API para el catálogo de asignaturas."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastcrud.paginated import PaginatedListResponse, compute_offset, paginated_response
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_superuser
from ...core.db.database import async_get_db
from ...crud.crud_catalog_course import (
    create_course_with_schools,
    crud_catalog_course,
    get_active_courses,
    get_course_with_schools,
    update_course_with_schools,
)
from ...models.user import User
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
    dependencies=[Depends(get_current_superuser)],
)
async def create_course(
    course_data: CatalogCourseCreate,
    db: AsyncSession = Depends(async_get_db),
) -> CatalogCourseRead:
    """
    Crear un nuevo curso en el catálogo.
    
    Requiere permisos de superusuario.
    """
    # Verificar si el código del curso ya existe
    existing_course = await crud_catalog_course.get(
        db=db,
        course_code=course_data.course_code
    )
    
    if existing_course:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un curso con el código '{course_data.course_code}'"
        )
    
    course = await create_course_with_schools(db, course_data)
    return CatalogCourseRead.model_validate(course)


@router.get(
    "",
    response_model=PaginatedListResponse[CatalogCourseRead],
    dependencies=[Depends(get_current_superuser)],
)
async def read_courses(
    db: AsyncSession = Depends(async_get_db),
    page: int = 1,
    items_per_page: int = 50,
) -> dict[str, Any]:
    """
    Obtener lista paginada de cursos.
    
    Requiere permisos de superusuario.
    """
    courses_data = await crud_catalog_course.get_multi(
        db=db,
        offset=compute_offset(page, items_per_page),
        limit=items_per_page,
        is_active=True,
    )
    
    return paginated_response(
        crud_data=courses_data,
        page=page,
        items_per_page=items_per_page
    )


@router.get(
    "/active",
    response_model=list[CatalogCourseRead],
    dependencies=[Depends(get_current_superuser)],
)
async def read_active_courses(
    db: AsyncSession = Depends(async_get_db),
) -> list[CatalogCourseRead]:
    """
    Obtener todos los cursos activos sin paginación.
    
    Útil para formularios y selects.
    Requiere permisos de superusuario.
    """
    courses = await get_active_courses(db)
    return [CatalogCourseRead.model_validate(course) for course in courses]


@router.get(
    "/{course_id}",
    response_model=CatalogCourseRead,
    dependencies=[Depends(get_current_superuser)],
)
async def read_course(
    course_id: int,
    db: AsyncSession = Depends(async_get_db),
) -> CatalogCourseRead:
    """
    Obtener un curso por su ID.
    
    Requiere permisos de superusuario.
    """
    course = await get_course_with_schools(db, course_id)
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado"
        )
    
    return CatalogCourseRead.model_validate(course)


@router.patch(
    "/{course_id}",
    response_model=CatalogCourseRead,
    dependencies=[Depends(get_current_superuser)],
)
async def update_course(
    course_id: int,
    course_data: CatalogCourseUpdate,
    db: AsyncSession = Depends(async_get_db),
) -> CatalogCourseRead:
    """
    Actualizar un curso existente.
    
    Requiere permisos de superusuario.
    """
    # Si se está actualizando el código, verificar que no exista otro curso con ese código
    if course_data.course_code:
        existing_course = await crud_catalog_course.get(
            db=db,
            course_code=course_data.course_code
        )
        
        if existing_course and existing_course.get("id") != course_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe otro curso con el código '{course_data.course_code}'"
            )
    
    course = await update_course_with_schools(db, course_id, course_data)
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado"
        )
    
    return CatalogCourseRead.model_validate(course)


@router.delete(
    "/{course_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(get_current_superuser)],
)
async def delete_course(
    course_id: int,
    db: AsyncSession = Depends(async_get_db),
) -> None:
    """
    Eliminar un curso del catálogo.
    
    Requiere permisos de superusuario.
    """
    course = await crud_catalog_course.get(db=db, id=course_id)
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado"
        )
    
    await crud_catalog_course.delete(db=db, id=course_id)

