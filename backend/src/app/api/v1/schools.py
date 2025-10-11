"""School endpoints - CRUD operations for schools (Admin only)."""

from typing import Annotated, Any, cast

from fastapi import APIRouter, Depends, Request
from fastcrud.paginated import PaginatedListResponse, compute_offset, paginated_response
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_superuser
from ...core.db.database import async_get_db
from ...core.exceptions.http_exceptions import DuplicateValueException, NotFoundException
from ...crud.crud_faculties import get_faculty_by_uuid
from ...crud.crud_schools import crud_schools, get_school_by_uuid, school_acronym_exists, school_exists
from ...schemas.school import SchoolCreate, SchoolRead, SchoolReadWithFaculty, SchoolUpdate

router = APIRouter(tags=["schools"])


@router.post("/school", response_model=SchoolRead, status_code=201)
async def create_school(
    request: Request,
    school: SchoolCreate,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> SchoolRead:
    """Crear una nueva escuela - Solo Admin.

    Args:
    ----
        request: Objeto request de FastAPI
        school: Datos de la escuela a crear
        db: Sesión de base de datos
        current_user: Usuario admin autenticado actual

    Returns:
    -------
        Datos de la escuela creada

    Raises:
    ------
        NotFoundException: Si la facultad no se encuentra
        DuplicateValueException: Si el nombre o acrónimo de la escuela ya existe en la facultad
    """
    # Validar que la facultad existe
    faculty = await get_faculty_by_uuid(db=db, faculty_id=school.fk_faculty)
    if faculty is None:
        raise NotFoundException(f"No se encontró la facultad con id '{school.fk_faculty}'")

    # Verificar si el nombre de la escuela ya existe en esta facultad
    if await school_exists(db=db, name=school.name, faculty_id=school.fk_faculty):
        raise DuplicateValueException(f"Ya existe una escuela con el nombre '{school.name}' en esta facultad")

    # Verificar si el acrónimo de la escuela ya existe en esta facultad
    if await school_acronym_exists(db=db, acronym=school.acronym, faculty_id=school.fk_faculty):
        raise DuplicateValueException(f"Ya existe una escuela con el acrónimo '{school.acronym}' en esta facultad")

    # Create school
    created_school = await crud_schools.create(db=db, object=school)

    # Retrieve and return the created school
    school_read = await crud_schools.get(db=db, id=created_school.id, schema_to_select=SchoolRead)
    if school_read is None:
        raise NotFoundException("Created school not found")

    return cast(SchoolRead, school_read)


@router.get("/schools", response_model=PaginatedListResponse[SchoolRead])
async def list_schools(
    request: Request,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
    page: int = 1,
    items_per_page: int = 10,
    faculty_id: int | None = None,
    is_active: bool | None = None,
) -> dict:
    """Obtener lista paginada de escuelas - Solo Admin.

    Args:
    ----
        request: Objeto request de FastAPI
        db: Sesión de base de datos
        current_user: Usuario admin autenticado actual
        page: Número de página (default: 1)
        items_per_page: Items por página (default: 10)
        faculty_id: Filtrar por ID de facultad (opcional)
        is_active: Filtrar por estado activo (opcional)

    Returns:
    -------
        Lista paginada de escuelas
    """
    filters = {}
    if faculty_id is not None:
        filters["fk_faculty"] = faculty_id
    if is_active is not None:
        filters["is_active"] = is_active

    schools_data = await crud_schools.get_multi(
        db=db, offset=compute_offset(page, items_per_page), limit=items_per_page, **filters
    )

    response: dict[str, Any] = paginated_response(crud_data=schools_data, page=page, items_per_page=items_per_page)
    return response


@router.get("/school/{school_id}", response_model=SchoolReadWithFaculty)
async def get_school(
    request: Request,
    school_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> SchoolReadWithFaculty:
    """Obtener una escuela específica por UUID con su facultad - Solo Admin.

    Args:
    ----
        request: Objeto request de FastAPI
        school_id: UUID de la escuela
        db: Sesión de base de datos
        current_user: Usuario admin autenticado actual

    Returns:
    -------
        Datos de la escuela con facultad relacionada

    Raises:
    ------
        NotFoundException: Si la escuela no se encuentra
    """
    school = await get_school_by_uuid(db=db, school_id=school_id)
    if school is None:
        raise NotFoundException(f"No se encontró la escuela con id '{school_id}'")

    return cast(SchoolReadWithFaculty, school)


@router.patch("/school/{school_id}", response_model=SchoolRead)
async def update_school(
    request: Request,
    school_id: int,
    values: SchoolUpdate,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> SchoolRead:
    """Actualizar una escuela - Solo Admin.

    Args:
    ----
        request: Objeto request de FastAPI
        school_id: UUID de la escuela a actualizar
        values: Datos actualizados de la escuela
        db: Sesión de base de datos
        current_user: Usuario admin autenticado actual

    Returns:
    -------
        Datos de la escuela actualizada

    Raises:
    ------
        NotFoundException: Si la escuela o la nueva facultad no se encuentra
        DuplicateValueException: Si el nuevo nombre o acrónimo ya existe en la facultad
    """
    # Verificar si la escuela existe
    db_school = await get_school_by_uuid(db=db, school_id=school_id)
    if db_school is None:
        raise NotFoundException(f"No se encontró la escuela con id '{school_id}'")

    # Si se está cambiando la facultad, validar que la nueva facultad existe
    if values.fk_faculty is not None and values.fk_faculty != db_school["fk_faculty"]:
        faculty = await get_faculty_by_uuid(db=db, faculty_id=values.fk_faculty)
        if faculty is None:
            raise NotFoundException(f"No se encontró la facultad con id '{values.fk_faculty}'")

    # Verificar si el nuevo nombre entra en conflicto con una escuela existente en la misma facultad
    target_faculty_id = values.fk_faculty if values.fk_faculty is not None else db_school["fk_faculty"]
    if values.name is not None and values.name != db_school["name"]:
        if await school_exists(db=db, name=values.name, faculty_id=target_faculty_id):
            raise DuplicateValueException(f"Ya existe una escuela con el nombre '{values.name}' en esta facultad")

    # Verificar si el nuevo acrónimo entra en conflicto con una escuela existente en la misma facultad
    if values.acronym is not None and values.acronym != db_school["acronym"]:
        if await school_acronym_exists(db=db, acronym=values.acronym, faculty_id=target_faculty_id):
            raise DuplicateValueException(f"Ya existe una escuela con el acrónimo '{values.acronym}' en esta facultad")

    # Update school
    await crud_schools.update(db=db, object=values, id=school_id)

    # Retrieve and return updated school
    updated_school = await get_school_by_uuid(db=db, school_id=school_id)
    return cast(SchoolRead, updated_school)


@router.delete("/school/{school_id}", status_code=204)
async def delete_school(
    request: Request,
    school_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> None:
    """Eliminar una escuela - Solo Admin.

    Esto eliminará en cascada todas las asignaciones de alcance de usuario relacionadas.

    Args:
    ----
        request: Objeto request de FastAPI
        school_id: UUID de la escuela a eliminar
        db: Sesión de base de datos
        current_user: Usuario admin autenticado actual

    Raises:
    ------
        NotFoundException: Si la escuela no se encuentra
    """
    # Verificar si la escuela existe
    db_school = await get_school_by_uuid(db=db, school_id=school_id)
    if db_school is None:
        raise NotFoundException(f"No se encontró la escuela con id '{school_id}'")

    # Delete school (cascade will handle related records)
    await crud_schools.delete(db=db, id=school_id)
