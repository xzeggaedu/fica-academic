"""API endpoint for calculating workdays in a month."""

from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.db.database import async_get_db
from ...models.annual_holiday import AnnualHoliday
from ...models.holiday import Holiday
from ...models.term import Term

router = APIRouter()


class WorkdaysCalculationRequest(BaseModel):
    """Request schema for workdays calculation."""

    term_id: Annotated[int, Field(examples=[1], description="ID del ciclo académico")]
    month: Annotated[int, Field(ge=1, le=12, examples=[8], description="Mes (1-12)")]
    weekdays: Annotated[
        list[int],
        Field(
            min_length=1,
            max_length=7,
            examples=[[0, 4]],
            description="Días de la semana (0=Lunes, 1=Martes, ..., 6=Domingo)",
        ),
    ]


class WorkdaysCalculationResponse(BaseModel):
    """Response schema for workdays calculation."""

    term_id: int
    term_number: int
    year: int
    month: int
    term_start_date: str
    term_end_date: str
    calculation_start_date: str
    calculation_end_date: str
    weekdays_requested: list[int]
    total_days_in_range: int
    matching_weekdays: int
    holidays_on_matching_days: int
    workable_days: int
    holidays_list: list[str]


@router.post("/", response_model=WorkdaysCalculationResponse)
async def calculate_workdays(
    request: WorkdaysCalculationRequest,
    session: Annotated[AsyncSession, Depends(async_get_db)],
) -> WorkdaysCalculationResponse:
    """Calculate workable days in a month for specific weekdays within a term, excluding holidays.

    This endpoint calculates how many days in a given month match the specified
    weekdays (e.g., Mondays and Fridays) and are NOT holidays, considering the
    term's date range.

    Important: If the term starts or ends mid-month, only days within the term
    range are counted.

    Args:
        request: Calculation parameters (term_id, month, weekdays)
        session: Database session

    Returns:
        Detailed calculation of workable days within the term range

    Example:
        Request: {term_id: 1, month: 6, weekdays: [0, 4]}
        If term ends on June 13, only counts until June 13, not the whole month.

    Raises:
        HTTPException: 400 if invalid weekdays, 404 if term not found
    """
    # Validate weekdays
    if not all(0 <= day <= 6 for day in request.weekdays):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Los días de la semana deben estar entre 0 (Lunes) y 6 (Domingo)",
        )

    # Get the Term
    term_result = await session.execute(select(Term).where(Term.id == request.term_id))
    term = term_result.scalar_one_or_none()

    if not term:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ciclo académico con ID {request.term_id} no encontrado",
        )

    # Get the Holiday record for the term's year
    holiday_result = await session.execute(select(Holiday).where(Holiday.year == term.year))
    holiday = holiday_result.scalar_one_or_none()

    # Get all annual holidays for this year
    holiday_dates_set = set()
    if holiday:
        annual_holidays_result = await session.execute(
            select(AnnualHoliday).where(AnnualHoliday.holiday_id == holiday.id)
        )
        annual_holidays = annual_holidays_result.scalars().all()
        holiday_dates_set = {ah.date for ah in annual_holidays}

    # Calculate the date range for this month within the term
    # First day of month
    first_day_of_month = date(term.year, request.month, 1)

    # Last day of month
    if request.month == 12:
        last_day_of_month = date(term.year + 1, 1, 1) - timedelta(days=1)
    else:
        last_day_of_month = date(term.year, request.month + 1, 1) - timedelta(days=1)

    # Adjust range based on term boundaries
    calculation_start = max(first_day_of_month, term.start_date)
    calculation_end = min(last_day_of_month, term.end_date)

    # Validate that the month is within the term
    if calculation_start > calculation_end:
        # The requested month is completely outside the term range
        return WorkdaysCalculationResponse(
            term_id=term.id,
            term_number=term.term,
            year=term.year,
            month=request.month,
            term_start_date=term.start_date.isoformat(),
            term_end_date=term.end_date.isoformat(),
            calculation_start_date=calculation_start.isoformat(),
            calculation_end_date=calculation_end.isoformat(),
            weekdays_requested=request.weekdays,
            total_days_in_range=0,
            matching_weekdays=0,
            holidays_on_matching_days=0,
            workable_days=0,
            holidays_list=[],
        )

    # Iterate through days in the calculated range
    matching_weekdays_count = 0
    holidays_on_matching_days_count = 0
    holidays_list = []

    current_date = calculation_start
    while current_date <= calculation_end:
        # Check if this day's weekday matches any of the requested weekdays
        if current_date.weekday() in request.weekdays:
            matching_weekdays_count += 1

            # Check if this day is a holiday
            if current_date in holiday_dates_set:
                holidays_on_matching_days_count += 1
                holidays_list.append(current_date.isoformat())

        current_date += timedelta(days=1)

    # Calculate workable days
    workable_days = matching_weekdays_count - holidays_on_matching_days_count

    # Calculate total days in the calculation range
    total_days_in_range = (calculation_end - calculation_start).days + 1

    return WorkdaysCalculationResponse(
        term_id=term.id,
        term_number=term.term,
        year=term.year,
        month=request.month,
        term_start_date=term.start_date.isoformat(),
        term_end_date=term.end_date.isoformat(),
        calculation_start_date=calculation_start.isoformat(),
        calculation_end_date=calculation_end.isoformat(),
        weekdays_requested=request.weekdays,
        total_days_in_range=total_days_in_range,
        matching_weekdays=matching_weekdays_count,
        holidays_on_matching_days=holidays_on_matching_days_count,
        workable_days=workable_days,
        holidays_list=holidays_list,
    )
