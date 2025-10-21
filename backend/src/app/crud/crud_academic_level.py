"""CRUD operations for Academic Level."""

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.academic_level import AcademicLevel
from ..schemas.academic_level import AcademicLevelCreate, AcademicLevelUpdate


async def get_academic_level(session: AsyncSession, level_id: int) -> AcademicLevel | None:
    """Get an academic level by ID.

    Args:
        session: Database session
        level_id: ID of the academic level

    Returns:
        AcademicLevel object or None if not found
    """
    result = await session.execute(select(AcademicLevel).where(AcademicLevel.id == level_id))
    return result.scalar_one_or_none()


async def get_academic_levels(
    session: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    is_active: bool | None = None,
    priority: int | None = None,
) -> list[AcademicLevel]:
    """Get list of academic levels with optional filters.

    Args:
        session: Database session
        skip: Number of records to skip
        limit: Maximum number of records to return
        is_active: Filter by active status (None = all)
        priority: Filter by specific priority level

    Returns:
        List of AcademicLevel objects
    """
    stmt = select(AcademicLevel)

    # Apply filters
    if is_active is not None:
        stmt = stmt.where(AcademicLevel.is_active == is_active)
    if priority is not None:
        stmt = stmt.where(AcademicLevel.priority == priority)

    # Order by priority descending (highest first), then by name
    stmt = stmt.order_by(AcademicLevel.priority.desc(), AcademicLevel.name)

    # Apply pagination
    stmt = stmt.offset(skip).limit(limit)

    result = await session.execute(stmt)
    return list(result.scalars().all())


async def create_academic_level(session: AsyncSession, level_data: AcademicLevelCreate) -> AcademicLevel:
    """Create a new academic level.

    Args:
        session: Database session
        level_data: Data for the new academic level

    Returns:
        Created AcademicLevel object

    Raises:
        ValueError: If code already exists or priority is duplicated for active levels
    """
    # Check if code already exists
    existing_code = await session.execute(select(AcademicLevel).where(AcademicLevel.code == level_data.code.upper()))
    if existing_code.scalar_one_or_none():
        raise ValueError(f"El código '{level_data.code}' ya existe")

    # Check if name already exists
    existing_name = await session.execute(select(AcademicLevel).where(AcademicLevel.name == level_data.name))
    if existing_name.scalar_one_or_none():
        raise ValueError(f"El nombre '{level_data.name}' ya existe")

    # Check if priority is duplicated among active levels
    if level_data.is_active:
        existing_priority = await session.execute(
            select(AcademicLevel).where(
                and_(
                    AcademicLevel.priority == level_data.priority,
                    AcademicLevel.is_active == True,  # noqa: E712
                )
            )
        )
        if existing_priority.scalar_one_or_none():
            raise ValueError(f"Ya existe un nivel académico activo con prioridad {level_data.priority}")

    # Create new academic level
    new_level = AcademicLevel(
        code=level_data.code.upper(),
        name=level_data.name,
        priority=level_data.priority,
        description=level_data.description,
        is_active=level_data.is_active,
    )

    session.add(new_level)
    await session.commit()
    await session.refresh(new_level)

    return new_level


async def update_academic_level(
    session: AsyncSession, level_id: int, level_data: AcademicLevelUpdate
) -> AcademicLevel | None:
    """Update an existing academic level.

    Args:
        session: Database session
        level_id: ID of the academic level to update
        level_data: Updated data

    Returns:
        Updated AcademicLevel object or None if not found

    Raises:
        ValueError: If code/name already exists or priority is duplicated
    """
    # Get existing level
    level = await get_academic_level(session, level_id)
    if not level:
        return None

    # Check if code is being updated and if it already exists
    if level_data.code and level_data.code.upper() != level.code:
        existing_code = await session.execute(
            select(AcademicLevel).where(
                and_(
                    AcademicLevel.code == level_data.code.upper(),
                    AcademicLevel.id != level_id,
                )
            )
        )
        if existing_code.scalar_one_or_none():
            raise ValueError(f"El código '{level_data.code}' ya existe")
        level.code = level_data.code.upper()

    # Check if name is being updated and if it already exists
    if level_data.name and level_data.name != level.name:
        existing_name = await session.execute(
            select(AcademicLevel).where(and_(AcademicLevel.name == level_data.name, AcademicLevel.id != level_id))
        )
        if existing_name.scalar_one_or_none():
            raise ValueError(f"El nombre '{level_data.name}' ya existe")
        level.name = level_data.name

    # Check if priority is being updated and if it's duplicated
    if level_data.priority is not None and level_data.priority != level.priority:
        # Only check if the level is active or will be active
        is_active = level_data.is_active if level_data.is_active is not None else level.is_active
        if is_active:
            existing_priority = await session.execute(
                select(AcademicLevel).where(
                    and_(
                        AcademicLevel.priority == level_data.priority,
                        AcademicLevel.is_active == True,  # noqa: E712
                        AcademicLevel.id != level_id,
                    )
                )
            )
            if existing_priority.scalar_one_or_none():
                raise ValueError(f"Ya existe un nivel académico activo con prioridad {level_data.priority}")
        level.priority = level_data.priority

    # Update other fields
    if level_data.description is not None:
        level.description = level_data.description
    if level_data.is_active is not None:
        level.is_active = level_data.is_active

    await session.commit()
    await session.refresh(level)

    return level


async def soft_delete_academic_level(session: AsyncSession, level_id: int) -> AcademicLevel | None:
    """Soft delete an academic level (mark as inactive).

    Args:
        session: Database session
        level_id: ID of the academic level to delete

    Returns:
        Updated AcademicLevel object or None if not found
    """
    level = await get_academic_level(session, level_id)
    if not level:
        return None

    level.is_active = False
    await session.commit()
    await session.refresh(level)

    return level


async def count_academic_levels(session: AsyncSession, is_active: bool | None = None) -> int:
    """Count academic levels with optional filter.

    Args:
        session: Database session
        is_active: Filter by active status (None = all)

    Returns:
        Count of academic levels
    """
    stmt = select(AcademicLevel)

    if is_active is not None:
        stmt = stmt.where(AcademicLevel.is_active == is_active)

    result = await session.execute(stmt)
    return len(list(result.scalars().all()))
