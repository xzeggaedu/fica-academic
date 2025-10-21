"""API endpoints for Hourly Rate History management."""

from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_user
from ...core.db.database import async_get_db
from ...crud import crud_hourly_rate_history
from ...schemas.hourly_rate_history import (
    HourlyRateHistoryCreate,
    HourlyRateHistoryRead,
    HourlyRateHistoryUpdate,
    HourlyRateTimelineItem,
)

router = APIRouter()


@router.get("/", response_model=dict)
async def list_hourly_rates(
    session: Annotated[AsyncSession, Depends(async_get_db)],
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=1000)] = 100,
    level_id: Annotated[int | None, Query(gt=0)] = None,
    is_active: Annotated[bool | None, Query()] = None,
    start_date: Annotated[date | None, Query()] = None,
    end_date: Annotated[date | None, Query()] = None,
) -> dict:
    """List all hourly rates with optional filters.

    Used by audit team to consult all rates and by the ingestion engine
    to filter by level_id and date to find the applicable rate.

    Args:
        session: Database session
        skip: Number of records to skip (pagination)
        limit: Maximum number of records to return
        level_id: Filter by academic level ID
        is_active: Filter by active status (end_date IS NULL)
        start_date: Filter by start date (rates starting on or after)
        end_date: Filter by end date (rates ending on or before)

    Returns:
        Dictionary with data and total count
    """
    rates = await crud_hourly_rate_history.get_hourly_rates(
        session=session,
        skip=skip,
        limit=limit,
        level_id=level_id,
        is_active=is_active,
        start_date=start_date,
        end_date=end_date,
    )

    total = await crud_hourly_rate_history.count_hourly_rates(session=session, level_id=level_id, is_active=is_active)

    return {"data": [HourlyRateHistoryRead.model_validate(rate) for rate in rates], "total": total}


@router.get("/{rate_id}", response_model=HourlyRateHistoryRead)
async def get_hourly_rate(
    rate_id: int,
    session: Annotated[AsyncSession, Depends(async_get_db)],
) -> HourlyRateHistoryRead:
    """Get a specific hourly rate by ID.

    Args:
        rate_id: ID of the hourly rate
        session: Database session

    Returns:
        Hourly rate data

    Raises:
        HTTPException: 404 if hourly rate not found
    """
    rate = await crud_hourly_rate_history.get_hourly_rate(session=session, rate_id=rate_id)

    if not rate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tarifa horaria con ID {rate_id} no encontrada",
        )

    return HourlyRateHistoryRead.model_validate(rate)


@router.get("/current/{level_id}", response_model=HourlyRateHistoryRead)
async def get_current_rate(
    level_id: int,
    session: Annotated[AsyncSession, Depends(async_get_db)],
    reference_date: Annotated[date | None, Query()] = None,
) -> HourlyRateHistoryRead:
    """Get the current active rate for a specific academic level.

    This endpoint is used by the ingestion engine to determine the applicable
    rate for a given date.

    Args:
        level_id: Academic level ID
        session: Database session
        reference_date: Reference date (default: today)

    Returns:
        Current hourly rate data

    Raises:
        HTTPException: 404 if no rate found for the level and date
    """
    rate = await crud_hourly_rate_history.get_current_rate(
        session=session, level_id=level_id, reference_date=reference_date
    )

    if not rate:
        date_str = reference_date.isoformat() if reference_date else "hoy"
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró tarifa vigente para el nivel {level_id} en la fecha {date_str}",
        )

    return HourlyRateHistoryRead.model_validate(rate)


@router.get("/timeline/{level_id}", response_model=list[HourlyRateTimelineItem])
async def get_rate_timeline(
    level_id: int,
    session: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[HourlyRateTimelineItem]:
    """Get complete timeline of rates for a specific academic level.

    Used for visualization and audit purposes.

    Args:
        level_id: Academic level ID
        session: Database session

    Returns:
        List of rate timeline items ordered by date (newest first)
    """
    rates = await crud_hourly_rate_history.get_rate_timeline(session=session, level_id=level_id)

    return [HourlyRateTimelineItem.from_rate(HourlyRateHistoryRead.model_validate(rate)) for rate in rates]


@router.post("/", response_model=HourlyRateHistoryRead, status_code=status.HTTP_201_CREATED)
async def create_hourly_rate(
    rate_data: HourlyRateHistoryCreate,
    session: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
) -> HourlyRateHistoryRead:
    """Create a new hourly rate (Salary Increase).

    This is the CRITICAL endpoint. When an administrator sets a new rate
    (e.g., Doctorate increases to $15.00 starting 01/01/2026), the API
    executes an automated transaction:

    1. Locates the previous rate for the same level
    2. Sets its end_date to the day before the new start_date
    3. Creates the new record with the new amount and start_date

    This ensures no date overlap and maintains an immutable history.

    Args:
        rate_data: Data for the new rate
        session: Database session
        current_user: Current authenticated user (for audit)

    Returns:
        Created hourly rate data

    Raises:
        HTTPException: 400 if validation fails (overlap, invalid dates)
    """
    try:
        # Get user_id from current_user dict
        user_id = UUID(current_user.get("sub")) if current_user.get("sub") else None
        new_rate = await crud_hourly_rate_history.create_hourly_rate(
            session=session, rate_data=rate_data, created_by_id=user_id
        )
        return HourlyRateHistoryRead.model_validate(new_rate)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{rate_id}", response_model=HourlyRateHistoryRead)
async def update_hourly_rate(
    rate_id: int,
    rate_data: HourlyRateHistoryUpdate,
    session: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
) -> HourlyRateHistoryRead:
    """Update an existing hourly rate (Administrative Correction).

    This is a correction and adjustment tool. It allows modifying the
    start_date, end_date, or rate_per_hour of a historical record to
    fix administrative errors, maintaining traceability for audit purposes.

    Args:
        rate_id: ID of the rate to update
        rate_data: Updated data
        session: Database session
        current_user: Current authenticated user (for audit)

    Returns:
        Updated hourly rate data

    Raises:
        HTTPException: 404 if rate not found, 400 if validation fails
    """
    try:
        updated_rate = await crud_hourly_rate_history.update_hourly_rate(
            session=session, rate_id=rate_id, rate_data=rate_data
        )

        if not updated_rate:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tarifa horaria con ID {rate_id} no encontrada",
            )

        return HourlyRateHistoryRead.model_validate(updated_rate)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{rate_id}")
async def delete_hourly_rate(
    rate_id: int,
    session: Annotated[AsyncSession, Depends(async_get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
) -> dict:
    """Delete an hourly rate record.

    This endpoint allows deletion of hourly rate records that are less than 24 hours old.
    When a current rate is deleted, the previous rate (if any) is automatically reactivated.

    Args:
        rate_id: ID of the rate to delete
        session: Database session
        current_user: Current authenticated user (for audit)

    Returns:
        Success message

    Raises:
        HTTPException: 404 if rate not found, 400 if rate cannot be deleted
    """
    try:
        success = await crud_hourly_rate_history.delete_hourly_rate(session=session, rate_id=rate_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tarifa horaria con ID {rate_id} no encontrada",
            )

        return {"message": f"Tarifa horaria con ID {rate_id} eliminada exitosamente"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
