"""Endpoints de API para el catálogo de profesores."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastcrud.paginated import PaginatedListResponse, compute_offset
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_superuser, get_current_user
from ...core.db.database import async_get_db
from ...crud.crud_catalog_professor import (
    crud_catalog_professor,
    get_active_professors,
    professor_code_exists,
    professor_name_exists,
    restore_professor,
    soft_delete_professor,
)
from ...crud.crud_recycle_bin import create_recycle_bin_entry
from ...models.catalog_professor import CatalogProfessor
from ...schemas.catalog_professor import CatalogProfessorCreate, CatalogProfessorRead, CatalogProfessorUpdate

router = APIRouter(prefix="/catalog/professors", tags=["catalog-professors"])


@router.post(
    "",
    response_model=CatalogProfessorRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_professor(
    professor_data: CatalogProfessorCreate,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> CatalogProfessorRead:
    """Crear un nuevo profesor en el catálogo.

    Solo administradores.
    """
    # Verificar si el código del profesor ya existe
    if await professor_code_exists(db, professor_data.professor_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un profesor con el código '{professor_data.professor_id}'",
        )

    # Verificar si el nombre del profesor ya existe
    if await professor_name_exists(db, professor_data.professor_name):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un profesor con el nombre '{professor_data.professor_name}'",
        )

    professor = await crud_catalog_professor.create(db=db, object=professor_data)
    return CatalogProfessorRead.model_validate(professor)


@router.get(
    "",
    response_model=PaginatedListResponse[CatalogProfessorRead],
)
async def read_professors(
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],  # All authenticated users
    page: int = 1,
    items_per_page: int = 50,
    search: str | None = None,
    is_active: bool | None = None,
    is_paid: bool | None = None,
    is_bilingual: bool | None = None,
    professor_category: str | None = None,
) -> dict[str, Any]:
    """Obtener lista paginada de profesores con búsqueda y filtros.

    Accesible para todos los usuarios autenticados.
    """
    from sqlalchemy import func, or_, select

    # Construir query base
    query = select(CatalogProfessor).where(CatalogProfessor.deleted.is_(False))

    # Aplicar filtros opcionales
    if is_active is not None:
        query = query.where(CatalogProfessor.is_active.is_(is_active))
    if is_paid is not None:
        query = query.where(CatalogProfessor.is_paid.is_(is_paid))
    if is_bilingual is not None:
        query = query.where(CatalogProfessor.is_bilingual.is_(is_bilingual))
    if professor_category is not None:
        query = query.where(CatalogProfessor.professor_category == professor_category)

    # Aplicar filtro de búsqueda si se proporciona
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                CatalogProfessor.professor_id.ilike(search_pattern),
                CatalogProfessor.professor_name.ilike(search_pattern),
                CatalogProfessor.institutional_email.ilike(search_pattern),
                CatalogProfessor.personal_email.ilike(search_pattern),
            )
        )

    # Contar total de registros
    count_query = select(func.count()).select_from(query.subquery())
    total_count_result = await db.execute(count_query)
    total_count = total_count_result.scalar_one()

    # Aplicar paginación y ordenamiento
    query = query.order_by(CatalogProfessor.professor_name)
    query = query.offset(compute_offset(page, items_per_page)).limit(items_per_page)

    # Ejecutar query
    result = await db.execute(query)
    professors = list(result.scalars().all())

    # Convertir a esquema de respuesta
    professors_read = [CatalogProfessorRead.model_validate(professor) for professor in professors]

    total_pages = (total_count + items_per_page - 1) // items_per_page if items_per_page else 1
    has_more = page < total_pages

    return {
        "data": professors_read,
        "total_count": total_count,
        "page": page,
        "items_per_page": items_per_page,
        "total_pages": total_pages,
        "has_more": has_more,
    }


@router.get(
    "/active",
    response_model=list[CatalogProfessorRead],
)
async def read_active_professors(
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],  # All authenticated users
) -> list[CatalogProfessorRead]:
    """Obtener todos los profesores activos (is_active=True y deleted=False).

    Accesible para todos los usuarios autenticados.
    """
    professors = await get_active_professors(db)
    return [CatalogProfessorRead.model_validate(professor) for professor in professors]


@router.get(
    "/{professor_id}",
    response_model=CatalogProfessorRead,
)
async def read_professor(
    professor_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],  # All authenticated users
) -> CatalogProfessorRead:
    """Obtener un profesor por su ID.

    Accesible para todos los usuarios autenticados.
    """
    professor = await crud_catalog_professor.get(db=db, id=professor_id, schema_to_select=CatalogProfessorRead)

    if not professor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profesor no encontrado")

    return professor


@router.patch(
    "/{professor_id}",
    response_model=CatalogProfessorRead,
)
async def update_professor(
    professor_id: int,
    professor_data: CatalogProfessorUpdate,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> CatalogProfessorRead:
    """Actualizar un profesor existente.

    Solo administradores.
    """
    # Verificar que el profesor existe
    db_professor = await crud_catalog_professor.get(db=db, id=professor_id)
    if not db_professor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profesor no encontrado")

    # Verificar unicidad del código si se está actualizando
    if professor_data.professor_id and professor_data.professor_id != db_professor["professor_id"]:
        if await professor_code_exists(db, professor_data.professor_id, exclude_id=professor_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un profesor con el código '{professor_data.professor_id}'",
            )

    # Verificar unicidad del nombre si se está actualizando
    if professor_data.professor_name and professor_data.professor_name != db_professor["professor_name"]:
        if await professor_name_exists(db, professor_data.professor_name, exclude_id=professor_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un profesor con el nombre '{professor_data.professor_name}'",
            )

    # Actualizar el profesor
    await crud_catalog_professor.update(db=db, object=professor_data, id=professor_id)
    await db.commit()

    # Obtener el profesor actualizado
    updated_professor = await crud_catalog_professor.get(db=db, id=professor_id, schema_to_select=CatalogProfessorRead)
    return updated_professor


@router.delete(
    "/{professor_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_professor(
    professor_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> None:
    """Eliminar un profesor (soft delete).

    Solo administradores.
    """
    # Verificar que el profesor existe
    db_professor = await crud_catalog_professor.get(db=db, id=professor_id)
    if not db_professor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profesor no encontrado")

    # Soft delete
    await soft_delete_professor(db, professor_id)


@router.patch(
    "/soft-delete/{professor_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def soft_delete_professor_endpoint(
    professor_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> None:
    """Marcar un profesor como eliminado (soft delete).

    Solo administradores.
    """
    db_professor = await crud_catalog_professor.get(db=db, id=professor_id)
    if not db_professor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profesor no encontrado")

    # Soft delete professor
    await soft_delete_professor(db, professor_id)

    # Crear registro en RecycleBin
    await create_recycle_bin_entry(
        db=db,
        entity_type="professor",
        entity_id=str(professor_id),  # ID como string
        entity_display_name=f"{db_professor['professor_name']} ({db_professor['professor_id']})",
        deleted_by_id=current_user["user_uuid"],
        deleted_by_name=current_user["name"],
    )


@router.patch(
    "/restore/{professor_id}",
    response_model=CatalogProfessorRead,
)
async def restore_professor_endpoint(
    professor_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> CatalogProfessorRead:
    """Restaurar un profesor eliminado.

    Solo administradores.
    """
    db_professor = await crud_catalog_professor.get(db=db, id=professor_id)
    if not db_professor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profesor no encontrado")

    await restore_professor(db, professor_id)

    restored_professor = await crud_catalog_professor.get(db=db, id=professor_id, schema_to_select=CatalogProfessorRead)
    return restored_professor
