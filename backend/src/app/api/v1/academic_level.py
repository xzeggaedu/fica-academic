"""API endpoints for Academic Level management."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.db.database import async_get_db
from ...crud import crud_academic_level
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
) -> dict:
    """List all academic levels with optional filters.

    Args:
        session: Database session
        skip: Number of records to skip (pagination)
        limit: Maximum number of records to return
        is_active: Filter by active status (None = all)
        priority: Filter by specific priority level (1-5)

    Returns:
        Dictionary with data and total count
    """
    levels = await crud_academic_level.get_academic_levels(
        session=session, skip=skip, limit=limit, is_active=is_active, priority=priority
    )

    total = await crud_academic_level.count_academic_levels(session=session, is_active=is_active)

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
) -> AcademicLevelRead:
    """Soft delete an academic level (mark as inactive).

    Args:
        level_id: ID of the academic level to delete
        session: Database session

    Returns:
        Deleted (inactivated) academic level data

    Raises:
        HTTPException: 404 if academic level not found
    """
    deleted_level = await crud_academic_level.soft_delete_academic_level(session=session, level_id=level_id)

    if not deleted_level:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nivel académico con ID {level_id} no encontrado",
        )

    return AcademicLevelRead.model_validate(deleted_level)
