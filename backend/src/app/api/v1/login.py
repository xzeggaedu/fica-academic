from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Form, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.config import settings
from ...core.db.database import async_get_db
from ...core.exceptions.http_exceptions import UnauthorizedException
from ...core.schemas import Token
from ...core.security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    ACCESS_TOKEN_EXPIRE_MINUTES_REMEMBER,
    REFRESH_TOKEN_EXPIRE_DAYS_REMEMBER,
    TokenType,
    authenticate_user,
    create_access_token_with_rbac,
    create_refresh_token_with_rbac,
    verify_token_with_rbac,
)

router = APIRouter(tags=["login"])


@router.post("/login", response_model=Token)
async def login_for_access_token(
    response: Response,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[AsyncSession, Depends(async_get_db)],
    remember_me: bool = Form(False),
) -> dict[str, str]:
    """Endpoint de login con soporte para 'Recordarme'.

    Args:
    ----
        response: Respuesta HTTP para establecer cookies
        form_data: Credenciales del usuario (username/email y password)
        db: Sesión de base de datos
        remember_me: Si es True, usa tokens con duración extendida

    Returns:
    -------
        Token de acceso y tipo de token
    """
    user = await authenticate_user(username_or_email=form_data.username, password=form_data.password, db=db)
    if not user:
        raise UnauthorizedException("Wrong username, email or password.")

    # Determinar duración de tokens según 'remember_me'
    if remember_me:
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES_REMEMBER)
        refresh_token_expires_days = REFRESH_TOKEN_EXPIRE_DAYS_REMEMBER
    else:
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        refresh_token_expires_days = settings.REFRESH_TOKEN_EXPIRE_DAYS

    # Crear access token con duración apropiada
    access_token = await create_access_token_with_rbac(user_data=user, expires_delta=access_token_expires)

    # Crear refresh token con duración apropiada
    refresh_token_expires = timedelta(days=refresh_token_expires_days)
    refresh_token = await create_refresh_token_with_rbac(user_data=user, expires_delta=refresh_token_expires)
    max_age = refresh_token_expires_days * 24 * 60 * 60

    # Establecer cookie con refresh token
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=max_age,
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/refresh")
async def refresh_access_token(
    request: Request, response: Response, db: AsyncSession = Depends(async_get_db)
) -> dict[str, str]:
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise UnauthorizedException("Refresh token missing.")

    user_data = await verify_token_with_rbac(refresh_token, TokenType.REFRESH, db)
    if not user_data:
        raise UnauthorizedException("Invalid refresh token.")

    # Create new access token with RBAC claims
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    new_access_token = await create_access_token_with_rbac(user_data=user_data, expires_delta=access_token_expires)

    # Create new refresh token to rotate tokens
    new_refresh_token = await create_refresh_token_with_rbac(user_data=user_data)
    max_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60

    # Set new refresh token in cookie
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=True,
        max_age=max_age,
    )

    return {"access_token": new_access_token, "token_type": "bearer"}
