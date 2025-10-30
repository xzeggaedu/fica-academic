"""API endpoints for Holiday management."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_superuser, get_current_user
from ...core.db.database import async_get_db
from ...crud import crud_holiday
from ...schemas.annual_holiday import AnnualHolidayRead
from ...schemas.holiday import HolidayCreate, HolidayRead, HolidayUpdate

router = APIRouter()


@router.get("/", response_model=dict)
async def list_holidays(
    session: Annotated[AsyncSession, Depends(async_get_db)],
    _current_user: Annotated[dict, Depends(get_current_user)],  # cualquier usuario autenticado
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=1000)] = 100,
    year: Annotated[int | None, Query(ge=2020, le=2100)] = None,
) -> dict:
    """List all holiday year groups with optional filters.

    Args:
        session: Database session
        skip: Number of records to skip (pagination)
        limit: Maximum number of records to return
        year: Filter by specific year

    Returns:
        Dictionary with data and total count
    """
    holidays = await crud_holiday.get_holidays(session=session, skip=skip, limit=limit, year=year)

    # Simple count
    all_holidays = await crud_holiday.get_holidays(session=session, skip=0, limit=10000)
    total = len(all_holidays)

    # Add count of annual_holidays to each holiday
    result_data = []
    for holiday in holidays:
        holiday_dict = HolidayRead.model_validate(holiday).model_dump()
        holiday_dict["annual_holidays_count"] = len(holiday.annual_holidays)
        result_data.append(holiday_dict)

    return {"data": result_data, "total": total}


@router.get("/{holiday_id}", response_model=dict)
async def get_holiday(
    holiday_id: int,
    session: Annotated[AsyncSession, Depends(async_get_db)],
    _current_user: Annotated[dict, Depends(get_current_user)],  # cualquier usuario autenticado
) -> dict:
    """Get a specific holiday by ID with all its annual holidays.

    Args:
        holiday_id: ID of the holiday
        session: Database session

    Returns:
        Holiday data with annual_holidays array

    Raises:
        HTTPException: 404 if holiday not found
    """
    holiday = await crud_holiday.get_holiday(session=session, holiday_id=holiday_id)

    if not holiday:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Grupo de asuetos con ID {holiday_id} no encontrado",
        )

    # Build response with annual holidays
    holiday_data = HolidayRead.model_validate(holiday).model_dump()
    holiday_data["annual_holidays"] = [
        AnnualHolidayRead.model_validate(ah).model_dump() for ah in holiday.annual_holidays
    ]
    holiday_data["annual_holidays_count"] = len(holiday.annual_holidays)

    return holiday_data


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_holiday(
    holiday_data: HolidayCreate,
    session: Annotated[AsyncSession, Depends(async_get_db)],
    _admin: Annotated[dict, Depends(get_current_superuser)],  # solo admin
) -> dict:
    """Create a new holiday year group and auto-generate annual holidays from fixed rules.

    This endpoint will:
    1. Create the Holiday record for the specified year
    2. Automatically copy all FixedHolidayRules to create AnnualHoliday entries
    3. Return the Holiday with all generated annual_holidays

    Args:
        holiday_data: Data for the new holiday (year and optional description)
        session: Database session

    Returns:
        Created holiday data with generated annual_holidays

    Raises:
        HTTPException: 400 if validation fails (year already exists)
    """
    try:
        new_holiday = await crud_holiday.create_holiday(session=session, holiday_data=holiday_data)

        # Build response with generated annual holidays
        holiday_response = HolidayRead.model_validate(new_holiday).model_dump()
        holiday_response["annual_holidays"] = [
            AnnualHolidayRead.model_validate(ah).model_dump() for ah in new_holiday.annual_holidays
        ]
        holiday_response["annual_holidays_count"] = len(new_holiday.annual_holidays)

        return holiday_response
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/{holiday_id}", response_model=HolidayRead)
async def update_holiday(
    holiday_id: int,
    holiday_data: HolidayUpdate,
    session: Annotated[AsyncSession, Depends(async_get_db)],
    _admin: Annotated[dict, Depends(get_current_superuser)],  # solo admin
) -> HolidayRead:
    """Update an existing holiday.

    Args:
        holiday_id: ID of the holiday to update
        holiday_data: Updated data
        session: Database session

    Returns:
        Updated holiday data

    Raises:
        HTTPException: 404 if holiday not found, 400 if validation fails
    """
    try:
        updated_holiday = await crud_holiday.update_holiday(
            session=session, holiday_id=holiday_id, holiday_data=holiday_data
        )

        if not updated_holiday:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Grupo de asuetos con ID {holiday_id} no encontrado",
            )

        return HolidayRead.model_validate(updated_holiday)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{holiday_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_holiday(
    holiday_id: int,
    session: Annotated[AsyncSession, Depends(async_get_db)],
    _admin: Annotated[dict, Depends(get_current_superuser)],  # solo admin
) -> None:
    """Delete a holiday and all its annual holidays (hard delete with cascade).

    Args:
        holiday_id: ID of the holiday to delete
        session: Database session

    Raises:
        HTTPException: 404 if holiday not found
    """
    deleted = await crud_holiday.delete_holiday(session=session, holiday_id=holiday_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Grupo de asuetos con ID {holiday_id} no encontrado",
        )
