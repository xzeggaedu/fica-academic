import uuid as uuid_pkg
from typing import Annotated, Any

from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.db.database import async_get_db
from ..core.exceptions.http_exceptions import ForbiddenException, UnauthorizedException
from ..core.logger import logging
from ..core.rbac_scope import get_user_scope_filters, user_has_access_to_faculty, user_has_access_to_school
from ..core.security import TokenType, oauth2_scheme, verify_token_with_rbac
from ..models.role import UserRoleEnum

logger = logging.getLogger(__name__)


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> dict[str, Any] | None:
    """Get current user with RBAC claims from JWT token.

    Returns
    -------
    dict[str, Any] | None
        Dictionary containing user data with RBAC claims if token is valid, None otherwise.
    """
    user_data = await verify_token_with_rbac(token, TokenType.ACCESS, db)
    if user_data is None:
        raise UnauthorizedException("User not authenticated.")

    return user_data


async def get_optional_user(request: Request, db: AsyncSession = Depends(async_get_db)) -> dict | None:
    """Get optional user with RBAC claims from JWT token.

    Returns
    -------
    dict | None
        Dictionary containing user data with RBAC claims if token is valid, None otherwise.
    """
    token = request.headers.get("Authorization")
    if not token:
        return None

    try:
        token_type, _, token_value = token.partition(" ")
        if token_type.lower() != "bearer" or not token_value:
            return None

        user_data = await verify_token_with_rbac(token_value, TokenType.ACCESS, db)
        return user_data

    except HTTPException as http_exc:
        if http_exc.status_code != 401:
            logger.error(f"Unexpected HTTPException in get_optional_user: {http_exc.detail}")
        return None

    except Exception as exc:
        logger.error(f"Unexpected error in get_optional_user: {exc}")
        return None


async def get_current_superuser(current_user: Annotated[dict, Depends(get_current_user)]) -> dict:
    # Treat ADMIN role as superuser
    if current_user.get("role") != UserRoleEnum.ADMIN:
        raise ForbiddenException("You do not have enough privileges.")

    return current_user


async def get_current_user_scope(
    current_user: Annotated[dict, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(async_get_db)]
) -> dict[str, list[uuid_pkg.UUID] | uuid_pkg.UUID | None]:
    """Get the hierarchical scope for the current authenticated user.

    This dependency retrieves the scope assignments (faculty or schools) for the
    current user based on their role.

    Returns
    -------
    dict
        Dictionary with 'faculty_id' and 'school_ids' keys containing scope data.
        - ADMIN/VICERRECTOR: Both None (no restrictions)
        - DECANO: faculty_id set, school_ids None
        - DIRECTOR: school_ids set, faculty_id None

    Example
    -------
        @router.get("/data")
        async def get_data(scope: Annotated[dict, Depends(get_current_user_scope)]):
            faculty_id = scope.get("faculty_id")
            school_ids = scope.get("school_ids")
            # Apply filtering based on scope
    """
    user_id = current_user.get("user_id")
    user_role = current_user.get("role")

    scope = await get_user_scope_filters(db=db, user_id=user_id, user_role=user_role)
    return scope


class ScopeValidator:
    """Dependency class for validating access to specific faculties or schools.

    This class creates reusable dependencies that validate if the current user
    has access to a specific faculty or school based on their role and scope.

    Example
    -------
        @router.get("/school/{school_id}/data")
        async def get_school_data(
            school_id: UUID,
            _: None = Depends(ScopeValidator.require_school_access(school_id))
        ):
            # User has access to this school
            return {"data": "..."}
    """

    @staticmethod
    def require_school_access(school_id: uuid_pkg.UUID):
        """Create a dependency that validates access to a specific school.

        Args:
        ----
            school_id: UUID of the school to validate access for

        Returns:
        -------
            Dependency function that raises ForbiddenException if access denied

        Raises:
        ------
            ForbiddenException: If user doesn't have access to the school
        """

        async def validate_school_access(
            current_user: Annotated[dict, Depends(get_current_user)],
            db: Annotated[AsyncSession, Depends(async_get_db)],
        ) -> None:
            user_id = current_user.get("user_id")
            user_role = current_user.get("role")

            has_access = await user_has_access_to_school(
                db=db, user_id=user_id, user_role=user_role, school_id=school_id
            )

            if not has_access:
                raise ForbiddenException(f"You do not have access to school {school_id}")

        return validate_school_access

    @staticmethod
    def require_faculty_access(faculty_id: uuid_pkg.UUID):
        """Create a dependency that validates access to a specific faculty.

        Args:
        ----
            faculty_id: UUID of the faculty to validate access for

        Returns:
        -------
            Dependency function that raises ForbiddenException if access denied

        Raises:
        ------
            ForbiddenException: If user doesn't have access to the faculty
        """

        async def validate_faculty_access(
            current_user: Annotated[dict, Depends(get_current_user)],
            db: Annotated[AsyncSession, Depends(async_get_db)],
        ) -> None:
            user_id = current_user.get("user_id")
            user_role = current_user.get("role")

            has_access = await user_has_access_to_faculty(
                db=db, user_id=user_id, user_role=user_role, faculty_id=faculty_id
            )

            if not has_access:
                raise ForbiddenException(f"You do not have access to faculty {faculty_id}")

        return validate_faculty_access
