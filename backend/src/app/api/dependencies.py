from typing import Annotated, Any

from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.db.database import async_get_db
from ..core.exceptions.http_exceptions import ForbiddenException, UnauthorizedException
from ..core.logger import logging
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
