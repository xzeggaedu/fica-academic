"""API endpoints for Fixed Holiday Rule management."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.db.database import async_get_db
from ...crud import crud_fixed_holiday_rule
from ...schemas.fixed_holiday_rule import (
    FixedHolidayRuleCreate,
    FixedHolidayRuleRead,
    FixedHolidayRuleUpdate,
)

router = APIRouter()


@router.get("/", response_model=dict)
async def list_fixed_holiday_rules(
    session: Annotated[AsyncSession, Depends(async_get_db)],
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=1000)] = 100,
    month: Annotated[int | None, Query(ge=1, le=12)] = None,
) -> dict:
    """List all fixed holiday rules with optional filters.

    Args:
        session: Database session
        skip: Number of records to skip (pagination)
        limit: Maximum number of records to return
        month: Filter by specific month (1-12)

    Returns:
        Dictionary with data and total count
    """
    rules = await crud_fixed_holiday_rule.get_fixed_holiday_rules(session=session, skip=skip, limit=limit, month=month)

    # Simple count (no filtering for total)
    all_rules = await crud_fixed_holiday_rule.get_fixed_holiday_rules(session=session, skip=0, limit=10000)
    total = len(all_rules)

    return {"data": [FixedHolidayRuleRead.model_validate(rule) for rule in rules], "total": total}


@router.get("/{rule_id}", response_model=FixedHolidayRuleRead)
async def get_fixed_holiday_rule(
    rule_id: int,
    session: Annotated[AsyncSession, Depends(async_get_db)],
) -> FixedHolidayRuleRead:
    """Get a specific fixed holiday rule by ID.

    Args:
        rule_id: ID of the fixed holiday rule
        session: Database session

    Returns:
        Fixed holiday rule data

    Raises:
        HTTPException: 404 if rule not found
    """
    rule = await crud_fixed_holiday_rule.get_fixed_holiday_rule(session=session, rule_id=rule_id)

    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Regla de asueto fijo con ID {rule_id} no encontrada",
        )

    return FixedHolidayRuleRead.model_validate(rule)


@router.post("/", response_model=FixedHolidayRuleRead, status_code=status.HTTP_201_CREATED)
async def create_fixed_holiday_rule(
    rule_data: FixedHolidayRuleCreate,
    session: Annotated[AsyncSession, Depends(async_get_db)],
) -> FixedHolidayRuleRead:
    """Create a new fixed holiday rule.

    Args:
        rule_data: Data for the new fixed holiday rule
        session: Database session

    Returns:
        Created fixed holiday rule data

    Raises:
        HTTPException: 400 if validation fails (duplicate month/day)
    """
    try:
        new_rule = await crud_fixed_holiday_rule.create_fixed_holiday_rule(session=session, rule_data=rule_data)
        return FixedHolidayRuleRead.model_validate(new_rule)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/{rule_id}", response_model=FixedHolidayRuleRead)
async def update_fixed_holiday_rule(
    rule_id: int,
    rule_data: FixedHolidayRuleUpdate,
    session: Annotated[AsyncSession, Depends(async_get_db)],
) -> FixedHolidayRuleRead:
    """Update an existing fixed holiday rule.

    Args:
        rule_id: ID of the rule to update
        rule_data: Updated data
        session: Database session

    Returns:
        Updated fixed holiday rule data

    Raises:
        HTTPException: 404 if rule not found, 400 if validation fails
    """
    try:
        updated_rule = await crud_fixed_holiday_rule.update_fixed_holiday_rule(
            session=session, rule_id=rule_id, rule_data=rule_data
        )

        if not updated_rule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Regla de asueto fijo con ID {rule_id} no encontrada",
            )

        return FixedHolidayRuleRead.model_validate(updated_rule)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fixed_holiday_rule(
    rule_id: int,
    session: Annotated[AsyncSession, Depends(async_get_db)],
) -> None:
    """Delete a fixed holiday rule (hard delete).

    Args:
        rule_id: ID of the rule to delete
        session: Database session

    Raises:
        HTTPException: 404 if rule not found
    """
    deleted = await crud_fixed_holiday_rule.delete_fixed_holiday_rule(session=session, rule_id=rule_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Regla de asueto fijo con ID {rule_id} no encontrada",
        )
