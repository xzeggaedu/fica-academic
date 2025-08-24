# app/auth/routes/auth_router.py
from __future__ import annotations

from typing import Optional

from fastapi import (  # noqa: E501
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Response,
    status,
)
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.auth.services.auth_service import AuthService
from app.auth.utils.auth_utils import decode_access_token
from app.core.database import get_db
from app.user.models.user import User
from app.user.schemas.user import UserCreate
from app.user.services.user_service import UserService

router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    role: Optional[str] = None  # se validará contra UserRoleEnum


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Decodifica el access token JWT, extrae el ID de usuario y devuelve
    el objeto User correspondiente. Lanza 401 si el token no es válido.
    """
    try:
        payload = decode_access_token(token)
        user_id: str | None = payload.get("sub")
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token",  # noqa: E510
        ) from exc
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token",  # noqa: E510
        )
    user = UserService(db).get(int(user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return user


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,  # noqa: E510
)
def register(
    data: RegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """
    Endpoint de registro. Convierte la solicitud en un UserCreate, crea
    el usuario a través de AuthService y devuelve un par de tokens.
    """
    user_create = UserCreate(
        email=data.email, password=data.password, role=data.role
    )  # noqa: E510
    auth_service = AuthService(db)
    access_token, refresh_token = auth_service.register_user(
        schema=user_create,
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return TokenResponse(
        access_token=access_token, refresh_token=refresh_token
    )  # noqa: E510


@router.post("/login", response_model=TokenResponse)
def login(
    data: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """
    Inicio de sesión. Verifica credenciales y emite tokens si son válidas.
    """
    auth_service = AuthService(db)
    access_token, refresh_token = auth_service.authenticate(
        email=data.email,
        password=data.password,
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return TokenResponse(
        access_token=access_token, refresh_token=refresh_token
    )  # noqa: E510


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    data: RefreshRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TokenResponse:
    """
    Intercambia un refresh token válido por un nuevo par de tokens.
    Se requiere un access token vigente para identificar al usuario.
    """
    auth_service = AuthService(db)
    access_token, new_refresh = auth_service.refresh(
        user=current_user,
        refresh_token=data.refresh_token,
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return TokenResponse(access_token=access_token, refresh_token=new_refresh)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    data: RefreshRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    """
    Cierra la sesión revocando explícitamente un refresh token.
    """
    AuthService(db).logout(
        user=current_user,
        refresh_token=data.refresh_token,
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return Response(status_code=status.HTTP_204_NO_CONTENT, content=b"")
