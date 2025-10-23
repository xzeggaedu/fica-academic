"""CRUD operations for Fixed Holiday Rule."""

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.fixed_holiday_rule import FixedHolidayRule
from ..schemas.fixed_holiday_rule import FixedHolidayRuleCreate, FixedHolidayRuleUpdate


async def get_fixed_holiday_rule(session: AsyncSession, rule_id: int) -> FixedHolidayRule | None:
    """Get a fixed holiday rule by ID.

    Args:
        session: Database session
        rule_id: ID of the fixed holiday rule

    Returns:
        FixedHolidayRule object or None if not found
    """
    result = await session.execute(select(FixedHolidayRule).where(FixedHolidayRule.id == rule_id))
    return result.scalar_one_or_none()


async def get_fixed_holiday_rules(
    session: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    month: int | None = None,
) -> list[FixedHolidayRule]:
    """Get list of fixed holiday rules with optional filters.

    Args:
        session: Database session
        skip: Number of records to skip
        limit: Maximum number of records to return
        month: Filter by specific month (1-12)

    Returns:
        List of FixedHolidayRule objects
    """
    stmt = select(FixedHolidayRule)

    # Apply filters
    if month is not None:
        stmt = stmt.where(FixedHolidayRule.month == month)

    # Order by month, then day
    stmt = stmt.order_by(FixedHolidayRule.month, FixedHolidayRule.day)

    # Apply pagination
    stmt = stmt.offset(skip).limit(limit)

    result = await session.execute(stmt)
    return list(result.scalars().all())


async def create_fixed_holiday_rule(session: AsyncSession, rule_data: FixedHolidayRuleCreate) -> FixedHolidayRule:
    """Create a new fixed holiday rule.

    Args:
        session: Database session
        rule_data: Data for the new fixed holiday rule

    Returns:
        Created FixedHolidayRule object

    Raises:
        ValueError: If a rule for the same month/day already exists
    """
    from datetime import datetime

    # Check if a rule already exists for this month/day
    existing = await session.execute(
        select(FixedHolidayRule).where(
            and_(FixedHolidayRule.month == rule_data.month, FixedHolidayRule.day == rule_data.day)
        )
    )
    existing_rule = existing.scalar_one_or_none()

    if existing_rule:
        # Convertir mes a nombre para mensaje más amigable
        month_names = [
            "",
            "Enero",
            "Febrero",
            "Marzo",
            "Abril",
            "Mayo",
            "Junio",
            "Julio",
            "Agosto",
            "Septiembre",
            "Octubre",
            "Noviembre",
            "Diciembre",
        ]
        month_name = month_names[rule_data.month] if 1 <= rule_data.month <= 12 else f"Mes {rule_data.month}"
        raise ValueError(f"Ya existe un asueto fijo para el {rule_data.day} de {month_name}")

    # Create new rule
    new_rule = FixedHolidayRule(
        id=None,
        name=rule_data.name,
        month=rule_data.month,
        day=rule_data.day,
        created_at=datetime.utcnow(),
    )

    session.add(new_rule)
    await session.commit()
    await session.refresh(new_rule)

    return new_rule


async def update_fixed_holiday_rule(
    session: AsyncSession, rule_id: int, rule_data: FixedHolidayRuleUpdate
) -> FixedHolidayRule | None:
    """Update an existing fixed holiday rule.

    Args:
        session: Database session
        rule_id: ID of the rule to update
        rule_data: Updated data

    Returns:
        Updated FixedHolidayRule object or None if not found

    Raises:
        ValueError: If the updated month/day conflicts with another rule
    """
    rule = await get_fixed_holiday_rule(session, rule_id)
    if not rule:
        return None

    # Check for conflicts if month or day is being updated
    if rule_data.month is not None or rule_data.day is not None:
        new_month = rule_data.month if rule_data.month is not None else rule.month
        new_day = rule_data.day if rule_data.day is not None else rule.day

        # Check if another rule exists with the new month/day
        existing = await session.execute(
            select(FixedHolidayRule).where(
                and_(
                    FixedHolidayRule.month == new_month,
                    FixedHolidayRule.day == new_day,
                    FixedHolidayRule.id != rule_id,
                )
            )
        )
        if existing.scalar_one_or_none():
            # Convertir mes a nombre para mensaje más amigable
            month_names = [
                "",
                "Enero",
                "Febrero",
                "Marzo",
                "Abril",
                "Mayo",
                "Junio",
                "Julio",
                "Agosto",
                "Septiembre",
                "Octubre",
                "Noviembre",
                "Diciembre",
            ]
            month_name = month_names[new_month] if 1 <= new_month <= 12 else f"Mes {new_month}"
            raise ValueError(f"Ya existe un asueto fijo para el {new_day} de {month_name}")

    # Update fields
    if rule_data.name is not None:
        rule.name = rule_data.name
    if rule_data.month is not None:
        rule.month = rule_data.month
    if rule_data.day is not None:
        rule.day = rule_data.day

    await session.commit()
    await session.refresh(rule)

    return rule


async def delete_fixed_holiday_rule(session: AsyncSession, rule_id: int) -> bool:
    """Delete a fixed holiday rule (hard delete).

    Args:
        session: Database session
        rule_id: ID of the rule to delete

    Returns:
        True if deleted, False if not found
    """
    rule = await get_fixed_holiday_rule(session, rule_id)
    if not rule:
        return False

    await session.delete(rule)
    await session.commit()

    return True
