"""CRUD operations for Hourly Rate History with temporal logic."""

from datetime import date, datetime, timedelta
from uuid import UUID

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.hourly_rate_history import HourlyRateHistory
from ..schemas.hourly_rate_history import HourlyRateHistoryCreate, HourlyRateHistoryUpdate


async def get_hourly_rate(session: AsyncSession, rate_id: int) -> HourlyRateHistory | None:
    """Get a hourly rate by ID.

    Args:
        session: Database session
        rate_id: ID of the hourly rate

    Returns:
        HourlyRateHistory object or None if not found
    """
    result = await session.execute(select(HourlyRateHistory).where(HourlyRateHistory.id == rate_id))
    return result.scalar_one_or_none()


async def get_hourly_rates(
    session: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    level_id: int | None = None,
    is_active: bool | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
) -> list[HourlyRateHistory]:
    """Get list of hourly rates with optional filters.

    Args:
        session: Database session
        skip: Number of records to skip
        limit: Maximum number of records to return
        level_id: Filter by academic level ID
        is_active: Filter by active status (end_date IS NULL)
        start_date: Filter by start date (rates starting on or after this date)
        end_date: Filter by end date (rates ending on or before this date)

    Returns:
        List of HourlyRateHistory objects
    """
    stmt = select(HourlyRateHistory)

    # Apply filters
    if level_id is not None:
        stmt = stmt.where(HourlyRateHistory.level_id == level_id)

    if is_active is not None:
        if is_active:
            stmt = stmt.where(HourlyRateHistory.end_date.is_(None))
        else:
            stmt = stmt.where(HourlyRateHistory.end_date.isnot(None))

    if start_date is not None:
        stmt = stmt.where(HourlyRateHistory.start_date >= start_date)

    if end_date is not None:
        stmt = stmt.where(
            or_(
                HourlyRateHistory.end_date.is_(None),
                HourlyRateHistory.end_date <= end_date,
            )
        )

    # Order by level_id, then start_date descending (newest first)
    stmt = stmt.order_by(HourlyRateHistory.level_id, HourlyRateHistory.start_date.desc())

    # Apply pagination
    stmt = stmt.offset(skip).limit(limit)

    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_current_rate(
    session: AsyncSession, level_id: int, reference_date: date | None = None
) -> HourlyRateHistory | None:
    """Get the current active rate for a specific level and date.

    This is the critical function used by the ingestion engine to determine
    the applicable rate for a given date.

    Args:
        session: Database session
        level_id: Academic level ID
        reference_date: Reference date (default: today)

    Returns:
        HourlyRateHistory object or None if no rate found
    """
    if reference_date is None:
        reference_date = date.today()

    stmt = select(HourlyRateHistory).where(
        and_(
            HourlyRateHistory.level_id == level_id,
            HourlyRateHistory.start_date <= reference_date,
            or_(
                HourlyRateHistory.end_date.is_(None),
                HourlyRateHistory.end_date >= reference_date,
            ),
        )
    )

    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_rate_timeline(session: AsyncSession, level_id: int) -> list[HourlyRateHistory]:
    """Get complete timeline of rates for a specific level.

    Args:
        session: Database session
        level_id: Academic level ID

    Returns:
        List of HourlyRateHistory objects ordered by start_date descending
    """
    stmt = (
        select(HourlyRateHistory)
        .where(HourlyRateHistory.level_id == level_id)
        .order_by(HourlyRateHistory.start_date.desc())
    )

    result = await session.execute(stmt)
    return list(result.scalars().all())


async def check_date_overlap(
    session: AsyncSession,
    level_id: int,
    start_date: date,
    end_date: date | None,
    exclude_rate_id: int | None = None,
) -> bool:
    """Check if there's a date overlap for the same level_id.

    Args:
        session: Database session
        level_id: Academic level ID
        start_date: Start date to check
        end_date: End date to check (None = infinite)
        exclude_rate_id: Rate ID to exclude from check (for updates)

    Returns:
        True if there's an overlap, False otherwise
    """
    # Build overlap query
    # Overlap occurs if:
    # 1. New start_date is between existing start_date and end_date
    # 2. New end_date is between existing start_date and end_date
    # 3. New range completely contains existing range
    # 4. Existing range completely contains new range

    stmt = select(HourlyRateHistory).where(HourlyRateHistory.level_id == level_id)

    if exclude_rate_id is not None:
        stmt = stmt.where(HourlyRateHistory.id != exclude_rate_id)

    # Overlap logic
    if end_date is None:
        # New rate is open-ended (active)
        # Overlaps if any existing rate's end_date is None or >= new start_date
        stmt = stmt.where(
            or_(
                HourlyRateHistory.end_date.is_(None),
                HourlyRateHistory.end_date >= start_date,
            )
        )
    else:
        # New rate has an end date
        # Overlaps if existing rate's date range intersects
        stmt = stmt.where(
            and_(
                HourlyRateHistory.start_date <= end_date,
                or_(
                    HourlyRateHistory.end_date.is_(None),
                    HourlyRateHistory.end_date >= start_date,
                ),
            )
        )

    result = await session.execute(stmt)
    return result.scalar_one_or_none() is not None


async def create_hourly_rate(
    session: AsyncSession,
    rate_data: HourlyRateHistoryCreate,
    created_by_id: UUID | None = None,
) -> HourlyRateHistory:
    """Create a new hourly rate (Salary Increase).

    This is the CRITICAL endpoint. It executes an atomic transaction:
    1. Validates no date overlap
    2. Finds the previous active rate (end_date = NULL) for same level_id
    3. Sets its end_date to 1 second before the new start_date
    4. Creates the new rate with end_date = NULL

    Args:
        session: Database session
        rate_data: Data for the new rate
        created_by_id: User ID who created this rate (for audit)

    Returns:
        Created HourlyRateHistory object

    Raises:
        ValueError: If validation fails (overlap detected, no level found, etc.)
    """
    # Find the current active rate for this level
    current_active_rate = await session.execute(
        select(HourlyRateHistory).where(
            and_(
                HourlyRateHistory.level_id == rate_data.level_id,
                HourlyRateHistory.end_date.is_(None),
            )
        )
    )
    active_rate = current_active_rate.scalar_one_or_none()

    # If there's an active rate, close it first
    if active_rate:
        # Set end_date to 1 second before the new start_date
        active_rate.end_date = rate_data.start_date - timedelta(seconds=1)

    # Now check for date overlap (excluding the rate we just closed)
    has_overlap = await check_date_overlap(
        session=session,
        level_id=rate_data.level_id,
        start_date=rate_data.start_date,
        end_date=None,  # New rates are always active (end_date = NULL)
        exclude_rate_id=active_rate.id if active_rate else None,
    )

    if has_overlap:
        raise ValueError(f"Ya existe una tarifa vigente que se solapa con la fecha {rate_data.start_date}")

    # Create new rate (always with end_date = NULL for new rates)
    new_rate = HourlyRateHistory(
        id=None,  # Dejar que la base de datos genere el ID automáticamente
        level_id=rate_data.level_id,
        rate_per_hour=rate_data.rate_per_hour,
        start_date=rate_data.start_date,
        end_date=None,  # Always NULL for new rates
        created_by_id=created_by_id,
        created_at=datetime.utcnow(),  # Establecer explícitamente para evitar lambda
    )

    session.add(new_rate)
    await session.commit()
    await session.refresh(new_rate)

    return new_rate


async def update_hourly_rate(
    session: AsyncSession, rate_id: int, rate_data: HourlyRateHistoryUpdate
) -> HourlyRateHistory | None:
    """Update an existing hourly rate (Administrative Correction).

    This is used for corrections and adjustments. It validates that
    no date overlaps are created.

    Args:
        session: Database session
        rate_id: ID of the rate to update
        rate_data: Updated data

    Returns:
        Updated HourlyRateHistory object or None if not found

    Raises:
        ValueError: If validation fails (overlap detected, invalid dates)
    """
    # Get existing rate
    rate = await get_hourly_rate(session, rate_id)
    if not rate:
        return None

    # Prepare updated dates for overlap check
    new_start_date = rate_data.start_date if rate_data.start_date is not None else rate.start_date
    new_end_date = rate_data.end_date if rate_data.end_date is not None else rate.end_date

    # Validate dates
    if new_end_date and new_start_date:
        if new_end_date <= new_start_date:
            raise ValueError("La fecha de fin debe ser posterior a la fecha de inicio")

    # Check for date overlap (excluding current rate)
    has_overlap = await check_date_overlap(
        session=session,
        level_id=rate.level_id,
        start_date=new_start_date,
        end_date=new_end_date,
        exclude_rate_id=rate_id,
    )

    if has_overlap:
        raise ValueError("Las fechas actualizadas se solapan con otra tarifa existente")

    # Update fields
    if rate_data.rate_per_hour is not None:
        rate.rate_per_hour = rate_data.rate_per_hour
    if rate_data.start_date is not None:
        rate.start_date = rate_data.start_date
    if rate_data.end_date is not None:
        rate.end_date = rate_data.end_date

    await session.commit()
    await session.refresh(rate)

    return rate


async def count_hourly_rates(
    session: AsyncSession,
    level_id: int | None = None,
    is_active: bool | None = None,
) -> int:
    """Count hourly rates with optional filters.

    Args:
        session: Database session
        level_id: Filter by academic level ID
        is_active: Filter by active status

    Returns:
        Count of hourly rates
    """
    stmt = select(HourlyRateHistory)

    if level_id is not None:
        stmt = stmt.where(HourlyRateHistory.level_id == level_id)

    if is_active is not None:
        if is_active:
            stmt = stmt.where(HourlyRateHistory.end_date.is_(None))
        else:
            stmt = stmt.where(HourlyRateHistory.end_date.isnot(None))

    result = await session.execute(stmt)
    return len(list(result.scalars().all()))


async def delete_hourly_rate(session: AsyncSession, rate_id: int) -> bool:
    """Delete an hourly rate record.

    This function allows deletion of hourly rate records that are less than 24 hours old.
    When a current rate is deleted, the previous rate (if any) is automatically reactivated.

    Args:
        session: Database session
        rate_id: ID of the rate to delete

    Returns:
        True if deletion was successful, False if rate not found

    Raises:
        ValueError: If rate cannot be deleted (older than 24 hours)
    """
    from datetime import datetime, timedelta

    # Get the rate to delete
    stmt = select(HourlyRateHistory).where(HourlyRateHistory.id == rate_id)
    result = await session.execute(stmt)
    rate_to_delete = result.scalar_one_or_none()

    if not rate_to_delete:
        return False

    # Check if rate is less than 24 hours old
    now = datetime.utcnow()
    time_diff = now - rate_to_delete.created_at
    if time_diff >= timedelta(hours=24):
        raise ValueError("No se puede eliminar esta tarifa. Ha pasado más de 24 horas desde su creación.")

    # If this is the current active rate, reactivate the previous one
    if rate_to_delete.end_date is None:  # This is the current active rate
        # Find the previous rate for the same level
        prev_stmt = (
            select(HourlyRateHistory)
            .where(
                HourlyRateHistory.level_id == rate_to_delete.level_id,
                HourlyRateHistory.id != rate_to_delete.id,
                HourlyRateHistory.end_date.isnot(None),
            )
            .order_by(HourlyRateHistory.end_date.desc())
        )
        prev_result = await session.execute(prev_stmt)
        previous_rate = prev_result.scalar_one_or_none()

        if previous_rate:
            # Reactivate the previous rate by setting end_date to None
            previous_rate.end_date = None
            previous_rate.updated_at = datetime.utcnow()

    # Delete the rate
    await session.delete(rate_to_delete)
    await session.commit()

    return True
