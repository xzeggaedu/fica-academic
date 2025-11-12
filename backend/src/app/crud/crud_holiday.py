"""CRUD operations for Holiday."""

from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models.annual_holiday import AnnualHoliday
from ..models.fixed_holiday_rule import FixedHolidayRule
from ..models.holiday import Holiday
from ..schemas.holiday import HolidayCreate, HolidayUpdate


def calculate_easter_sunday(year: int) -> date:
    """Calculate Easter Sunday for a given year using Meeus/Gauss algorithm.

    This date is the starting point for all Holy Week calculations.

    Args:
        year: Year to calculate Easter for

    Returns:
        Date of Easter Sunday
    """
    # Meeus/Gauss algorithm calculations
    a = year % 19
    b = year // 100
    c = year % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    L = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * L) // 451

    # Calculate month and day of Easter
    month = (h + L - 7 * m + 114) // 31
    day = ((h + L - 7 * m + 114) % 31) + 1

    return date(year, month, day)


def generate_extended_easter_break(year: int) -> list[date]:
    """Generate extended Easter break dates from Monday before Good Friday to Monday after Easter.

    Institutional Easter break rule:
    - Starts: Monday before Good Friday (Lunes Santo) - 6 days before Easter Sunday
    - Ends: Monday after Easter Sunday (Lunes de Pascua) - 1 day after Easter Sunday
    - Total: 8 days (Monday to Monday)

    Args:
        year: Year to generate Easter break dates for

    Returns:
        List of dates for the extended Easter break
    """
    # 1. Calculate Easter Sunday
    easter_sunday = calculate_easter_sunday(year)

    # 2. Calculate start date: Lunes Santo (Monday before Good Friday)
    # Lunes Santo is 6 days before Easter Sunday
    start_date = easter_sunday - timedelta(days=6)

    # 3. Calculate end date: Lunes de Pascua (Monday after Easter Sunday)
    # Lunes de Pascua is 1 day after Easter Sunday
    end_date = easter_sunday + timedelta(days=1)

    # 4. Generate list of all dates in the range (inclusive)
    break_dates = []
    current_date = start_date

    while current_date <= end_date:
        break_dates.append(current_date)
        current_date += timedelta(days=1)

    return break_dates


async def get_holiday(session: AsyncSession, holiday_id: int) -> Holiday | None:
    """Get a holiday by ID with its annual holidays.

    Args:
        session: Database session
        holiday_id: ID of the holiday

    Returns:
        Holiday object or None if not found
    """
    result = await session.execute(
        select(Holiday).options(selectinload(Holiday.annual_holidays)).where(Holiday.id == holiday_id)
    )
    return result.scalar_one_or_none()


async def get_holidays(
    session: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    year: int | None = None,
) -> list[Holiday]:
    """Get list of holidays with optional filters.

    Args:
        session: Database session
        skip: Number of records to skip
        limit: Maximum number of records to return
        year: Filter by specific year

    Returns:
        List of Holiday objects
    """
    stmt = select(Holiday).options(selectinload(Holiday.annual_holidays))

    # Apply filters
    if year is not None:
        stmt = stmt.where(Holiday.year == year)

    # Order by year descending (most recent first)
    stmt = stmt.order_by(Holiday.year.desc())

    # Apply pagination
    stmt = stmt.offset(skip).limit(limit)

    result = await session.execute(stmt)
    return list(result.scalars().all())


async def create_holiday(session: AsyncSession, holiday_data: HolidayCreate) -> Holiday:
    """Create a new holiday year group and auto-generate annual holidays.

    This function:
    1. Creates the Holiday record for the year
    2. Fetches all FixedHolidayRules and creates AnnualHoliday entries
    3. Calculates Extended Easter Break (Semana Santa) using Meeus/Gauss algorithm
    4. Auto-generates AnnualHoliday entries for Easter break (8 days: Mon-Mon)
       - From Monday before Good Friday to Monday after Easter Sunday
    5. Returns the Holiday with all generated annual_holidays

    Args:
        session: Database session
        holiday_data: Data for the new holiday

    Returns:
        Created Holiday object with generated annual_holidays (fixed + 8-day Easter break)

    Raises:
        ValueError: If a holiday for this year already exists
    """
    # Check if holiday for this year already exists
    existing = await session.execute(select(Holiday).where(Holiday.year == holiday_data.year))
    if existing.scalar_one_or_none():
        raise ValueError(f"Ya existe un grupo de asuetos para el año {holiday_data.year}")

    # Create new holiday
    new_holiday = Holiday(
        year=holiday_data.year,
        description=holiday_data.description,
    )

    session.add(new_holiday)
    await session.flush()  # Get the ID without committing

    # Get all fixed holiday rules
    fixed_rules_result = await session.execute(
        select(FixedHolidayRule).order_by(FixedHolidayRule.month, FixedHolidayRule.day)
    )
    fixed_rules = list(fixed_rules_result.scalars().all())

    # Create annual holidays from fixed rules
    for rule in fixed_rules:
        annual_holiday = AnnualHoliday(
            holiday_id=new_holiday.id,
            date=date(holiday_data.year, rule.month, rule.day),
            name=rule.name,
            type="Asueto Nacional",
        )
        session.add(annual_holiday)

    # Generate Extended Easter Break dates (Semana Santa) - formula-based
    # Generates dates from Monday before Good Friday to Monday after Easter (8 days total)
    easter_break_dates = generate_extended_easter_break(holiday_data.year)
    for holy_date in easter_break_dates:
        # Check if this date already exists (avoid duplicates)
        existing_check = await session.execute(
            select(AnnualHoliday).where(
                AnnualHoliday.holiday_id == new_holiday.id,
                AnnualHoliday.date == holy_date,
            )
        )
        if not existing_check.scalar_one_or_none():
            easter_holiday = AnnualHoliday(
                holiday_id=new_holiday.id,
                date=holy_date,
                name="Semana Santa",  # Nombre uniforme para todo el período
                type="Personalizado",  # Generado por fórmula, no de fixed rules
            )
            session.add(easter_holiday)

    # TODO: Add more formula-based holiday generation here if needed

    await session.commit()
    await session.refresh(new_holiday)

    return new_holiday


async def update_holiday(session: AsyncSession, holiday_id: int, holiday_data: HolidayUpdate) -> Holiday | None:
    """Update an existing holiday.

    Args:
        session: Database session
        holiday_id: ID of the holiday to update
        holiday_data: Updated data

    Returns:
        Updated Holiday object or None if not found

    Raises:
        ValueError: If the updated year conflicts with another holiday
    """
    holiday = await get_holiday(session, holiday_id)
    if not holiday:
        return None

    # Check for conflicts if year is being updated
    if holiday_data.year is not None and holiday_data.year != holiday.year:
        existing = await session.execute(
            select(Holiday).where(
                Holiday.year == holiday_data.year,
                Holiday.id != holiday_id,
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError(f"Ya existe otro grupo de asuetos para el año {holiday_data.year}")

    # Update fields
    if holiday_data.year is not None:
        holiday.year = holiday_data.year
    if holiday_data.description is not None:
        holiday.description = holiday_data.description

    await session.commit()
    await session.refresh(holiday)

    return holiday


async def delete_holiday(session: AsyncSession, holiday_id: int) -> bool:
    """Delete a holiday and all its annual holidays (hard delete with cascade).

    Args:
        session: Database session
        holiday_id: ID of the holiday to delete

    Returns:
        True if deleted, False if not found
    """
    holiday = await get_holiday(session, holiday_id)
    if not holiday:
        return False

    # Cascade delete will automatically remove all annual_holidays
    await session.delete(holiday)
    await session.commit()

    return True
