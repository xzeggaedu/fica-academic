"""RBAC Scope Filtering - Hierarchical data filtering based on user roles.

This module provides utilities for applying role-based hierarchical filters
to database queries for DIRECTOR, DECANO, and VICERRECTOR roles.
"""

import uuid as uuid_pkg

from sqlalchemy import Select, and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..crud.crud_user_scope import get_user_faculty_scope, get_user_school_scopes
from ..models.role import UserRoleEnum
from ..models.school import School


async def get_user_scope_filters(
    db: AsyncSession, user_id: int, user_role: UserRoleEnum | str
) -> dict[str, list[uuid_pkg.UUID] | uuid_pkg.UUID | None]:
    """Get scope filters for a user based on their role.

    Args:
    ----
        db: Database session
        user_id: ID of the user
        user_role: Role of the user

    Returns:
    -------
        Dictionary with 'faculty_id' and 'school_ids' keys containing scope data
        Returns None for both if user has no scope restrictions (ADMIN, VICERRECTOR)
    """
    # Convert string to enum if needed
    if isinstance(user_role, str):
        user_role = UserRoleEnum(user_role)

    # ADMIN and VICERRECTOR have no scope restrictions
    if user_role in [UserRoleEnum.ADMIN, UserRoleEnum.VICERRECTOR]:
        return {"faculty_id": None, "school_ids": None}

    # DECANO: Get faculty scope
    if user_role == UserRoleEnum.DECANO:
        faculty_id = await get_user_faculty_scope(db=db, user_id=user_id)
        return {"faculty_id": faculty_id, "school_ids": None}

    # DIRECTOR: Get school scopes
    if user_role == UserRoleEnum.DIRECTOR:
        school_ids = await get_user_school_scopes(db=db, user_id=user_id)
        return {"faculty_id": None, "school_ids": school_ids}

    # Default: No scope
    return {"faculty_id": None, "school_ids": None}


async def apply_scope_filter_to_query(
    query: Select,
    db: AsyncSession,
    user_id: int,
    user_role: UserRoleEnum | str,
    target_model: type,
    school_fk_column: str = "fk_school",
) -> Select:
    """Apply hierarchical scope filter to a SQLAlchemy query.

    This function modifies a query to include WHERE clauses based on the user's role:
    - ADMIN/VICERRECTOR: No filter applied (access to all data)
    - DECANO: Filter by faculty (through school relationship)
    - DIRECTOR: Filter by assigned schools

    Args:
    ----
        query: SQLAlchemy Select query to filter
        db: Database session
        user_id: ID of the authenticated user
        user_role: Role of the user
        target_model: The model being queried (e.g., CargaAcademica)
        school_fk_column: Name of the foreign key column linking to school
                         (default: 'fk_school')

    Returns:
    -------
        Modified query with scope filters applied

    Example:
    -------
        query = select(CargaAcademica)
        filtered_query = await apply_scope_filter_to_query(
            query, db, user_id=1, user_role="DIRECTOR",
            target_model=CargaAcademica, school_fk_column="fk_school"
        )
    """
    # Get scope filters for user
    scope = await get_user_scope_filters(db=db, user_id=user_id, user_role=user_role)

    # Convert string to enum if needed
    if isinstance(user_role, str):
        user_role = UserRoleEnum(user_role)

    # No filtering for ADMIN and VICERRECTOR
    if user_role in [UserRoleEnum.ADMIN, UserRoleEnum.VICERRECTOR]:
        return query

    # DIRECTOR: Filter by assigned schools
    if user_role == UserRoleEnum.DIRECTOR and scope["school_ids"]:
        school_ids = scope["school_ids"]
        if school_ids:
            # Get the foreign key attribute from the model
            fk_attr = getattr(target_model, school_fk_column)
            query = query.where(fk_attr.in_(school_ids))

    # DECANO: Filter by faculty (through school relationship)
    elif user_role == UserRoleEnum.DECANO and scope["faculty_id"]:
        faculty_id = scope["faculty_id"]
        if faculty_id:
            # Join with School table and filter by faculty
            fk_attr = getattr(target_model, school_fk_column)
            query = query.join(School, School.id_school == fk_attr).where(School.fk_faculty == faculty_id)

    return query


def build_scope_where_conditions(
    faculty_id: uuid_pkg.UUID | None = None,
    school_ids: list[uuid_pkg.UUID] | None = None,
    target_model: type | None = None,
    school_fk_column: str = "fk_school",
) -> list:
    """Build WHERE conditions for scope filtering.

    This is a lower-level function for building filter conditions manually.
    Useful when you need to combine with other filters.

    Args:
    ----
        faculty_id: Faculty UUID to filter by (for DECANO)
        school_ids: List of school UUIDs to filter by (for DIRECTOR)
        target_model: The model being queried
        school_fk_column: Name of the foreign key column linking to school

    Returns:
    -------
        List of SQLAlchemy filter conditions

    Example:
    -------
        conditions = build_scope_where_conditions(
            school_ids=[uuid1, uuid2],
            target_model=CargaAcademica,
            school_fk_column="fk_school"
        )
        query = select(CargaAcademica).where(and_(*conditions))
    """
    conditions = []

    # DIRECTOR: Filter by schools
    if school_ids and target_model:
        fk_attr = getattr(target_model, school_fk_column)
        conditions.append(fk_attr.in_(school_ids))

    # DECANO: Filter by faculty through school
    if faculty_id and target_model:
        fk_attr = getattr(target_model, school_fk_column)
        conditions.append(School.id_school == fk_attr)
        conditions.append(School.fk_faculty == faculty_id)

    return conditions


async def user_has_access_to_school(
    db: AsyncSession, user_id: int, user_role: UserRoleEnum | str, school_id: uuid_pkg.UUID
) -> bool:
    """Check if a user has access to a specific school based on their scope.

    Args:
    ----
        db: Database session
        user_id: ID of the user
        user_role: Role of the user
        school_id: UUID of the school to check access for

    Returns:
    -------
        True if user has access, False otherwise
    """
    # Convert string to enum if needed
    if isinstance(user_role, str):
        user_role = UserRoleEnum(user_role)

    # ADMIN and VICERRECTOR have access to everything
    if user_role in [UserRoleEnum.ADMIN, UserRoleEnum.VICERRECTOR]:
        return True

    # Get scope filters
    scope = await get_user_scope_filters(db=db, user_id=user_id, user_role=user_role)

    # DIRECTOR: Check if school is in assigned schools
    if user_role == UserRoleEnum.DIRECTOR and scope["school_ids"]:
        return school_id in scope["school_ids"]

    # DECANO: Check if school belongs to assigned faculty
    if user_role == UserRoleEnum.DECANO and scope["faculty_id"]:
        # Query school to get its faculty
        stmt = select(School.fk_faculty).where(School.id_school == school_id)
        result = await db.execute(stmt)
        school_faculty_id = result.scalar_one_or_none()

        if school_faculty_id:
            return school_faculty_id == scope["faculty_id"]

    return False


async def user_has_access_to_faculty(
    db: AsyncSession, user_id: int, user_role: UserRoleEnum | str, faculty_id: uuid_pkg.UUID
) -> bool:
    """Check if a user has access to a specific faculty based on their scope.

    Args:
    ----
        db: Database session
        user_id: ID of the user
        user_role: Role of the user
        faculty_id: UUID of the faculty to check access for

    Returns:
    -------
        True if user has access, False otherwise
    """
    # Convert string to enum if needed
    if isinstance(user_role, str):
        user_role = UserRoleEnum(user_role)

    # ADMIN and VICERRECTOR have access to everything
    if user_role in [UserRoleEnum.ADMIN, UserRoleEnum.VICERRECTOR]:
        return True

    # Get scope filters
    scope = await get_user_scope_filters(db=db, user_id=user_id, user_role=user_role)

    # DECANO: Check if faculty matches assigned faculty
    if user_role == UserRoleEnum.DECANO and scope["faculty_id"]:
        return scope["faculty_id"] == faculty_id

    # DIRECTOR: Check if any assigned school belongs to this faculty
    if user_role == UserRoleEnum.DIRECTOR and scope["school_ids"]:
        # Query schools to check if any belong to this faculty
        stmt = select(School.id_school).where(
            and_(School.id_school.in_(scope["school_ids"]), School.fk_faculty == faculty_id)
        )
        result = await db.execute(stmt)
        matching_schools = result.scalars().all()

        return len(matching_schools) > 0

    return False
