"""API endpoints for Term management."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.db.database import async_get_db
from ...crud import crud_term
from ...schemas.term import TermCreate, TermRead, TermUpdate

router = APIRouter()


@router.get("/", response_model=dict)
async def list_terms(
    session: Annotated[AsyncSession, Depends(async_get_db)],
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=1000)] = 100,
    year: Annotated[int | None, Query(ge=2020, le=2100)] = None,
) -> dict:
    """List all academic terms with optional filters.

    Args:
        session: Database session
        skip: Number of records to skip (pagination)
        limit: Maximum number of records to return
        year: Filter by specific year

    Returns:
        Dictionary with data and total count
    """
    terms = await crud_term.get_terms(session=session, skip=skip, limit=limit, year=year)

    # Simple count
    all_terms = await crud_term.get_terms(session=session, skip=0, limit=10000, year=year)
    total = len(all_terms)

    return {"data": [TermRead.model_validate(term) for term in terms], "total": total}


@router.get("/{term_id}", response_model=TermRead)
async def get_term(
    term_id: int,
    session: Annotated[AsyncSession, Depends(async_get_db)],
) -> TermRead:
    """Get a specific term by ID.

    Args:
        term_id: ID of the term
        session: Database session

    Returns:
        Term data

    Raises:
        HTTPException: 404 if term not found
    """
    term = await crud_term.get_term(session=session, term_id=term_id)

    if not term:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ciclo académico con ID {term_id} no encontrado",
        )

    return TermRead.model_validate(term)


@router.post("/", response_model=TermRead, status_code=status.HTTP_201_CREATED)
async def create_term(
    term_data: TermCreate,
    session: Annotated[AsyncSession, Depends(async_get_db)],
) -> TermRead:
    """Create a new academic term.

    Args:
        term_data: Data for the new term
        session: Database session

    Returns:
        Created term data

    Raises:
        HTTPException: 400 if validation fails (duplicate name, overlapping dates)
    """
    try:
        new_term = await crud_term.create_term(session=session, term_data=term_data)
        return TermRead.model_validate(new_term)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/{term_id}", response_model=TermRead)
async def update_term(
    term_id: int,
    term_data: TermUpdate,
    session: Annotated[AsyncSession, Depends(async_get_db)],
) -> TermRead:
    """Update an existing term.

    Args:
        term_id: ID of the term to update
        term_data: Updated data
        session: Database session

    Returns:
        Updated term data

    Raises:
        HTTPException: 404 if term not found, 400 if validation fails
    """
    try:
        updated_term = await crud_term.update_term(session=session, term_id=term_id, term_data=term_data)

        if not updated_term:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ciclo académico con ID {term_id} no encontrado",
            )

        return TermRead.model_validate(updated_term)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{term_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_term(
    term_id: int,
    session: Annotated[AsyncSession, Depends(async_get_db)],
) -> None:
    """Delete a term (hard delete).

    Args:
        term_id: ID of the term to delete
        session: Database session

    Raises:
        HTTPException: 404 if term not found
    """
    deleted = await crud_term.delete_term(session=session, term_id=term_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ciclo académico con ID {term_id} no encontrado",
        )
