"""API endpoints for Annual Holiday management."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.db.database import async_get_db
from ...crud import crud_annual_holiday
from ...schemas.annual_holiday import (
    AnnualHolidayCreate,
    AnnualHolidayRead,
    AnnualHolidayUpdate,
)

router = APIRouter()


@router.get("/", response_model=dict)
async def list_annual_holidays(
    session: Annotated[AsyncSession, Depends(async_get_db)],
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=1000)] = 1000,
    holiday_id: Annotated[int | None, Query()] = None,
    year: Annotated[int | None, Query(ge=2020, le=2100)] = None,
    type: Annotated[str | None, Query()] = None,
) -> dict:
    """List all annual holidays with optional filters.

    Args:
        session: Database session
        skip: Number of records to skip (pagination)
        limit: Maximum number of records to return
        holiday_id: Filter by specific holiday group
        year: Filter by specific year
        type: Filter by type ("Asueto Nacional" or "Personalizado")

    Returns:
        Dictionary with data and total count
    """
    annual_holidays = await crud_annual_holiday.get_annual_holidays(
        session=session, skip=skip, limit=limit, holiday_id=holiday_id, year=year, type_filter=type
    )

    # Simple count
    all_annual_holidays = await crud_annual_holiday.get_annual_holidays(
        session=session, skip=0, limit=100000, holiday_id=holiday_id, year=year, type_filter=type
    )
    total = len(all_annual_holidays)

    return {"data": [AnnualHolidayRead.model_validate(ah) for ah in annual_holidays], "total": total}


@router.get("/{annual_holiday_id}", response_model=AnnualHolidayRead)
async def get_annual_holiday(
    annual_holiday_id: int,
    session: Annotated[AsyncSession, Depends(async_get_db)],
) -> AnnualHolidayRead:
    """Get a specific annual holiday by ID.

    Args:
        annual_holiday_id: ID of the annual holiday
        session: Database session

    Returns:
        Annual holiday data

    Raises:
        HTTPException: 404 if annual holiday not found
    """
    annual_holiday = await crud_annual_holiday.get_annual_holiday(session=session, annual_holiday_id=annual_holiday_id)

    if not annual_holiday:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asueto anual con ID {annual_holiday_id} no encontrado",
        )

    return AnnualHolidayRead.model_validate(annual_holiday)


@router.post("/", response_model=AnnualHolidayRead, status_code=status.HTTP_201_CREATED)
async def create_annual_holiday(
    annual_holiday_data: AnnualHolidayCreate,
    session: Annotated[AsyncSession, Depends(async_get_db)],
) -> AnnualHolidayRead:
    """Create a new annual holiday (custom/personalized).

    Args:
        annual_holiday_data: Data for the new annual holiday
        session: Database session

    Returns:
        Created annual holiday data

    Raises:
        HTTPException: 400 if validation fails (invalid holiday_id, date conflicts, etc.)
    """
    try:
        new_annual_holiday = await crud_annual_holiday.create_annual_holiday(
            session=session, annual_holiday_data=annual_holiday_data
        )
        return AnnualHolidayRead.model_validate(new_annual_holiday)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/{annual_holiday_id}", response_model=AnnualHolidayRead)
async def update_annual_holiday(
    annual_holiday_id: int,
    annual_holiday_data: AnnualHolidayUpdate,
    session: Annotated[AsyncSession, Depends(async_get_db)],
) -> AnnualHolidayRead:
    """Update an existing annual holiday.

    Args:
        annual_holiday_id: ID of the annual holiday to update
        annual_holiday_data: Updated data
        session: Database session

    Returns:
        Updated annual holiday data

    Raises:
        HTTPException: 404 if annual holiday not found, 400 if validation fails
    """
    try:
        updated_annual_holiday = await crud_annual_holiday.update_annual_holiday(
            session=session, annual_holiday_id=annual_holiday_id, annual_holiday_data=annual_holiday_data
        )

        if not updated_annual_holiday:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Asueto anual con ID {annual_holiday_id} no encontrado",
            )

        return AnnualHolidayRead.model_validate(updated_annual_holiday)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{annual_holiday_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_annual_holiday(
    annual_holiday_id: int,
    session: Annotated[AsyncSession, Depends(async_get_db)],
) -> None:
    """Delete an annual holiday (hard delete).

    Args:
        annual_holiday_id: ID of the annual holiday to delete
        session: Database session

    Raises:
        HTTPException: 404 if annual holiday not found
    """
    deleted = await crud_annual_holiday.delete_annual_holiday(session=session, annual_holiday_id=annual_holiday_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asueto anual con ID {annual_holiday_id} no encontrado",
        )
