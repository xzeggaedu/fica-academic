"""CRUD operations for Annual Holiday."""

from datetime import datetime

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.annual_holiday import AnnualHoliday
from ..models.holiday import Holiday
from ..schemas.annual_holiday import AnnualHolidayCreate, AnnualHolidayUpdate


async def get_annual_holiday(session: AsyncSession, annual_holiday_id: int) -> AnnualHoliday | None:
    """Get an annual holiday by ID.

    Args:
        session: Database session
        annual_holiday_id: ID of the annual holiday

    Returns:
        AnnualHoliday object or None if not found
    """
    result = await session.execute(select(AnnualHoliday).where(AnnualHoliday.id == annual_holiday_id))
    return result.scalar_one_or_none()


async def get_annual_holidays(
    session: AsyncSession,
    skip: int = 0,
    limit: int = 1000,
    holiday_id: int | None = None,
    year: int | None = None,
    type_filter: str | None = None,
) -> list[AnnualHoliday]:
    """Get list of annual holidays with optional filters.

    Args:
        session: Database session
        skip: Number of records to skip
        limit: Maximum number of records to return
        holiday_id: Filter by specific holiday group
        year: Filter by specific year
        type_filter: Filter by type ("Asueto Nacional" or "Personalizado")

    Returns:
        List of AnnualHoliday objects
    """
    stmt = select(AnnualHoliday)

    # Apply filters
    if holiday_id is not None:
        stmt = stmt.where(AnnualHoliday.holiday_id == holiday_id)

    if year is not None:
        # Join with Holiday to filter by year
        stmt = stmt.join(Holiday).where(Holiday.year == year)

    if type_filter is not None:
        stmt = stmt.where(AnnualHoliday.type == type_filter)

    # Order by date
    stmt = stmt.order_by(AnnualHoliday.date)

    # Apply pagination
    stmt = stmt.offset(skip).limit(limit)

    result = await session.execute(stmt)
    return list(result.scalars().all())


async def create_annual_holiday(session: AsyncSession, annual_holiday_data: AnnualHolidayCreate) -> AnnualHoliday:
    """Create a new annual holiday (custom/personalized).

    Args:
        session: Database session
        annual_holiday_data: Data for the new annual holiday

    Returns:
        Created AnnualHoliday object

    Raises:
        ValueError: If holiday_id doesn't exist or date already exists for this holiday
    """
    # Verify that holiday_id exists
    holiday_result = await session.execute(select(Holiday).where(Holiday.id == annual_holiday_data.holiday_id))
    holiday = holiday_result.scalar_one_or_none()
    if not holiday:
        raise ValueError(f"No existe el grupo de asuetos con ID {annual_holiday_data.holiday_id}")

    # Verify that date is in the correct year
    if annual_holiday_data.date.year != holiday.year:
        raise ValueError(f"La fecha {annual_holiday_data.date} no corresponde al año {holiday.year}")

    # Check if date already exists for this holiday
    existing = await session.execute(
        select(AnnualHoliday).where(
            and_(
                AnnualHoliday.holiday_id == annual_holiday_data.holiday_id,
                AnnualHoliday.date == annual_holiday_data.date,
            )
        )
    )
    existing_holiday = existing.scalar_one_or_none()

    if existing_holiday:
        # Formatear fecha para mensaje más amigable
        date_str = annual_holiday_data.date.strftime("%d de %B de %Y")
        raise ValueError(f"Ya existe un asueto anual para el {date_str}")

    # Create new annual holiday
    new_annual_holiday = AnnualHoliday(
        id=None,
        holiday_id=annual_holiday_data.holiday_id,
        date=annual_holiday_data.date,
        name=annual_holiday_data.name,
        type=annual_holiday_data.type,
        created_at=datetime.utcnow(),
    )

    session.add(new_annual_holiday)
    await session.commit()
    await session.refresh(new_annual_holiday)

    return new_annual_holiday


async def update_annual_holiday(
    session: AsyncSession, annual_holiday_id: int, annual_holiday_data: AnnualHolidayUpdate
) -> AnnualHoliday | None:
    """Update an existing annual holiday.

    Args:
        session: Database session
        annual_holiday_id: ID of the annual holiday to update
        annual_holiday_data: Updated data

    Returns:
        Updated AnnualHoliday object or None if not found

    Raises:
        ValueError: If the updated date conflicts with another holiday
    """
    annual_holiday = await get_annual_holiday(session, annual_holiday_id)
    if not annual_holiday:
        return None

    # Check for conflicts if date is being updated
    if annual_holiday_data.date is not None and annual_holiday_data.date != annual_holiday.date:
        existing = await session.execute(
            select(AnnualHoliday).where(
                and_(
                    AnnualHoliday.holiday_id == annual_holiday.holiday_id,
                    AnnualHoliday.date == annual_holiday_data.date,
                    AnnualHoliday.id != annual_holiday_id,
                )
            )
        )
        existing_holiday = existing.scalar_one_or_none()
        if existing_holiday:
            # Formatear fecha para mensaje más amigable
            date_str = annual_holiday_data.date.strftime("%d de %B de %Y")
            raise ValueError(f"Ya existe un asueto anual para el {date_str}")

    # Update fields
    if annual_holiday_data.date is not None:
        annual_holiday.date = annual_holiday_data.date
    if annual_holiday_data.name is not None:
        annual_holiday.name = annual_holiday_data.name
    if annual_holiday_data.type is not None:
        annual_holiday.type = annual_holiday_data.type

    await session.commit()
    await session.refresh(annual_holiday)

    return annual_holiday


async def delete_annual_holiday(session: AsyncSession, annual_holiday_id: int) -> bool:
    """Delete an annual holiday (hard delete).

    Args:
        session: Database session
        annual_holiday_id: ID of the annual holiday to delete

    Returns:
        True if deleted, False if not found
    """
    annual_holiday = await get_annual_holiday(session, annual_holiday_id)
    if not annual_holiday:
        return False

    await session.delete(annual_holiday)
    await session.commit()

    return True
