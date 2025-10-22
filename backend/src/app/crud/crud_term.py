"""CRUD operations for Term."""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.term import Term
from ..schemas.term import TermCreate, TermUpdate


async def get_term(session: AsyncSession, term_id: int) -> Term | None:
    """Get a term by ID.

    Args:
        session: Database session
        term_id: ID of the term

    Returns:
        Term object or None if not found
    """
    result = await session.execute(select(Term).where(Term.id == term_id))
    return result.scalar_one_or_none()


async def get_terms(
    session: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    year: int | None = None,
) -> list[Term]:
    """Get list of terms with optional filters.

    Args:
        session: Database session
        skip: Number of records to skip
        limit: Maximum number of records to return
        year: Filter by specific year

    Returns:
        List of Term objects
    """
    stmt = select(Term)

    # Apply filters
    if year is not None:
        stmt = stmt.where(Term.year == year)

    # Order by year descending, then by start_date
    stmt = stmt.order_by(Term.year.desc(), Term.start_date)

    # Apply pagination
    stmt = stmt.offset(skip).limit(limit)

    result = await session.execute(stmt)
    return list(result.scalars().all())


async def create_term(session: AsyncSession, term_data: TermCreate) -> Term:
    """Create a new term.

    Args:
        session: Database session
        term_data: Data for the new term

    Returns:
        Created Term object

    Raises:
        ValueError: If a term with the same number/year combination already exists or dates overlap
    """
    from sqlalchemy import and_

    # Check if term number/year combination already exists
    existing = await session.execute(select(Term).where(and_(Term.term == term_data.term, Term.year == term_data.year)))
    if existing.scalar_one_or_none():
        raise ValueError(f"Ya existe el Ciclo {term_data.term}/{term_data.year}")

    # Check for overlapping terms in the same year
    overlapping = await session.execute(
        select(Term).where(
            Term.year == term_data.year,
            # Check if new term overlaps with existing terms
            # Overlap occurs if: new_start <= existing_end AND new_end >= existing_start
            Term.start_date <= term_data.end_date,
            Term.end_date >= term_data.start_date,
        )
    )
    if overlapping.scalar_one_or_none():
        raise ValueError(f"Las fechas del ciclo se superponen con otro ciclo existente del año {term_data.year}")

    # Create new term
    new_term = Term(
        id=None,
        term=term_data.term,
        year=term_data.year,
        description=term_data.description,
        start_date=term_data.start_date,
        end_date=term_data.end_date,
        created_at=datetime.utcnow(),
    )

    session.add(new_term)
    await session.commit()
    await session.refresh(new_term)

    return new_term


async def update_term(session: AsyncSession, term_id: int, term_data: TermUpdate) -> Term | None:
    """Update an existing term.

    Args:
        session: Database session
        term_id: ID of the term to update
        term_data: Updated data

    Returns:
        Updated Term object or None if not found

    Raises:
        ValueError: If the updated name conflicts or dates overlap
    """
    term = await get_term(session, term_id)
    if not term:
        return None

    from sqlalchemy import and_

    # Check for term/year conflicts if either is being updated
    new_term_num = term_data.term if term_data.term is not None else term.term
    new_year = term_data.year if term_data.year is not None else term.year

    if (term_data.term is not None or term_data.year is not None) and (
        new_term_num != term.term or new_year != term.year
    ):
        existing = await session.execute(
            select(Term).where(and_(Term.term == new_term_num, Term.year == new_year, Term.id != term_id))
        )
        if existing.scalar_one_or_none():
            raise ValueError(f"Ya existe el Ciclo {new_term_num}/{new_year}")

    # Update fields
    if term_data.term is not None:
        term.term = term_data.term
    if term_data.year is not None:
        term.year = term_data.year
    if term_data.description is not None:
        term.description = term_data.description
    if term_data.start_date is not None:
        term.start_date = term_data.start_date
    if term_data.end_date is not None:
        term.end_date = term_data.end_date

    # Validate date range after updates
    if term.end_date <= term.start_date:
        raise ValueError("La fecha de fin debe ser posterior a la fecha de inicio")

    await session.commit()
    await session.refresh(term)

    return term


async def delete_term(session: AsyncSession, term_id: int) -> bool:
    """Delete a term (hard delete).

    Args:
        session: Database session
        term_id: ID of the term to delete

    Returns:
        True if deleted, False if not found
    """
    term = await get_term(session, term_id)
    if not term:
        return False

    await session.delete(term)
    await session.commit()

    return True
