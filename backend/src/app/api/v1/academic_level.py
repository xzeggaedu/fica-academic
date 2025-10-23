"""API endpoints for Academic Level management."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_superuser
from ...core.db.database import async_get_db
from ...core.exceptions.http_exceptions import NotFoundException
from ...crud import crud_academic_level
from ...crud.crud_recycle_bin import create_recycle_bin_entry
from ...schemas.academic_level import (
    AcademicLevelCreate,
    AcademicLevelRead,
    AcademicLevelUpdate,
)

router = APIRouter()


@router.get("/", response_model=dict)
async def list_academic_levels(
    session: Annotated[AsyncSession, Depends(async_get_db)],
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=1000)] = 100,
    is_active: Annotated[bool | None, Query()] = None,
    priority: Annotated[int | None, Query(ge=1, le=5)] = None,
    include_deleted: Annotated[bool, Query()] = False,
) -> dict:
    """List all academic levels with optional filters.

    Args:
        session: Database session
        skip: Number of records to skip (pagination)
        limit: Maximum number of records to return
        is_active: Filter by active status (None = all)
        priority: Filter by specific priority level (1-5)
        include_deleted: Include soft deleted records

    Returns:
        Dictionary with data and total count
    """
    levels = await crud_academic_level.get_academic_levels(
        session=session, skip=skip, limit=limit, is_active=is_active, priority=priority, include_deleted=include_deleted
    )

    total = await crud_academic_level.count_academic_levels(
        session=session, is_active=is_active, include_deleted=include_deleted
    )

    return {"data": [AcademicLevelRead.model_validate(level) for level in levels], "total": total}


@router.get("/{level_id}", response_model=AcademicLevelRead)
async def get_academic_level(
    level_id: int,
    session: Annotated[AsyncSession, Depends(async_get_db)],
) -> AcademicLevelRead:
    """Get a specific academic level by ID.

    Args:
        level_id: ID of the academic level
        session: Database session

    Returns:
        Academic level data

    Raises:
        HTTPException: 404 if academic level not found
    """
    level = await crud_academic_level.get_academic_level(session=session, level_id=level_id)

    if not level:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nivel académico con ID {level_id} no encontrado",
        )

    return AcademicLevelRead.model_validate(level)


@router.post("/", response_model=AcademicLevelRead, status_code=status.HTTP_201_CREATED)
async def create_academic_level(
    level_data: AcademicLevelCreate,
    session: Annotated[AsyncSession, Depends(async_get_db)],
) -> AcademicLevelRead:
    """Create a new academic level.

    Args:
        level_data: Data for the new academic level
        session: Database session

    Returns:
        Created academic level data

    Raises:
        HTTPException: 400 if validation fails (duplicate code, name, or priority)
    """
    try:
        new_level = await crud_academic_level.create_academic_level(session=session, level_data=level_data)
        return AcademicLevelRead.model_validate(new_level)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/{level_id}", response_model=AcademicLevelRead)
async def update_academic_level(
    level_id: int,
    level_data: AcademicLevelUpdate,
    session: Annotated[AsyncSession, Depends(async_get_db)],
) -> AcademicLevelRead:
    """Update an existing academic level.

    Args:
        level_id: ID of the academic level to update
        level_data: Updated data
        session: Database session

    Returns:
        Updated academic level data

    Raises:
        HTTPException: 404 if academic level not found, 400 if validation fails
    """
    try:
        updated_level = await crud_academic_level.update_academic_level(
            session=session, level_id=level_id, level_data=level_data
        )

        if not updated_level:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Nivel académico con ID {level_id} no encontrado",
            )

        return AcademicLevelRead.model_validate(updated_level)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{level_id}", response_model=AcademicLevelRead)
async def delete_academic_level(
    level_id: int,
    session: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> AcademicLevelRead:
    """Soft delete an academic level (mark as deleted).

    Args:
        level_id: ID of the academic level to delete
        session: Database session
        current_user: Current authenticated admin user

    Returns:
        Deleted academic level data

    Raises:
        HTTPException: 404 if academic level not found
    """
    # Verificar si el nivel académico existe
    db_level = await crud_academic_level.get_academic_level(session=session, level_id=level_id)
    if db_level is None:
        raise NotFoundException(f"No se encontró el nivel académico con id '{level_id}'")

    # Soft delete academic level
    success = await crud_academic_level.soft_delete_academic_level(session=session, level_id=level_id)
    if not success:
        raise NotFoundException(f"Error al eliminar el nivel académico con id '{level_id}'")

    # Crear registro en RecycleBin
    await create_recycle_bin_entry(
        db=session,
        entity_type="academic-level",
        entity_id=str(level_id),
        entity_display_name=f"{db_level.name} ({db_level.code})",
        deleted_by_id=current_user["user_uuid"],
        deleted_by_name=current_user["name"],
        reason=None,
        can_restore=True,
    )

    # Retrieve and return updated level
    updated_level = await crud_academic_level.get_academic_level(session=session, level_id=level_id)
    return AcademicLevelRead.model_validate(updated_level)


@router.patch("/soft-delete/{level_id}", response_model=AcademicLevelRead)
async def soft_delete_academic_level_endpoint(
    level_id: int,
    session: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_superuser)],  # Admin only
) -> AcademicLevelRead:
    """Soft delete an academic level (mark as deleted) - Explicit endpoint.

    Args:
        level_id: ID of the academic level to delete
        session: Database session
        current_user: Current authenticated admin user

    Returns:
        Deleted academic level data

    Raises:
        HTTPException: 404 if academic level not found
    """
    # Verificar si el nivel académico existe
    db_level = await crud_academic_level.get_academic_level(session=session, level_id=level_id)
    if db_level is None:
        raise NotFoundException(f"No se encontró el nivel académico con id '{level_id}'")

    # Soft delete academic level
    success = await crud_academic_level.soft_delete_academic_level(session=session, level_id=level_id)
    if not success:
        raise NotFoundException(f"Error al eliminar el nivel académico con id '{level_id}'")

    # Crear registro en RecycleBin
    await create_recycle_bin_entry(
        db=session,
        entity_type="academic-level",
        entity_id=str(level_id),
        entity_display_name=f"{db_level.name} ({db_level.code})",
        deleted_by_id=current_user["user_uuid"],
        deleted_by_name=current_user["name"],
        reason=None,
        can_restore=True,
    )

    # Retrieve and return updated level
    updated_level = await crud_academic_level.get_academic_level(session=session, level_id=level_id)
    return AcademicLevelRead.model_validate(updated_level)


@router.patch("/restore/{level_id}", response_model=AcademicLevelRead)
async def restore_academic_level_endpoint(
    level_id: int,
    session: Annotated[AsyncSession, Depends(async_get_db)],
) -> AcademicLevelRead:
    """Restore a soft deleted academic level.

    Args:
        level_id: ID of the academic level to restore
        session: Database session

    Returns:
        Restored academic level data

    Raises:
        HTTPException: 404 if academic level not found
    """
    success = await crud_academic_level.restore_academic_level(session=session, level_id=level_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nivel académico con ID {level_id} no encontrado",
        )

    # Retrieve and return updated level
    updated_level = await crud_academic_level.get_academic_level(session=session, level_id=level_id)
    return AcademicLevelRead.model_validate(updated_level)
