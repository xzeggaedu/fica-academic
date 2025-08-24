# app/user/routes/user_router.py
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.auth.routes.auth_router import get_current_user
from app.core.database import get_db
from app.user.models.user import User, UserRoleEnum
from app.user.schemas.user import UserCreate, UserOut
from app.user.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])


def require_admin(current_user: User = Depends(get_current_user)) -> None:
    if current_user.role != UserRoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Insufficient privileges")


@router.get("/", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db)) -> List[UserOut]:
    """
    Devuelve todos los usuarios registrados. Solo devuelve campos públicos
    definidos en UserOut, excluyendo la contraseña.
    """
    service = UserService(db)
    return service.list()


@router.get("/me", response_model=UserOut)
def read_me(current_user: User = Depends(get_current_user)) -> UserOut:
    """Retorna la información del usuario autenticado."""
    return current_user


@router.get("/{user_id}", response_model=UserOut)
def read_user(user_id: int, db: Session = Depends(get_db)) -> UserOut:
    """
    Devuelve un usuario por ID. Si no existe, se lanza una excepción 404.
    """
    service = UserService(db)
    user = service.get(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return user


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def delete_user(user_id: int, db: Session = Depends(get_db)) -> Response:
    """
    Elimina un usuario por ID. Devuelve estado 204 si la operación es exitosa.
    """
    service = UserService(db)
    user = service.get(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    service.delete(user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT, content=b"")


@router.post(
    "/",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
def create_user_route(
    user: UserCreate, db: Session = Depends(get_db)
) -> UserOut:  # noqa: E501
    """
    Crea un nuevo usuario. Valida que el correo no esté registrado y delega
    la creación a UserService, el cual hashea la contraseña.
    """
    service = UserService(db)
    if service.get_by_email(user.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    new_user = service.create(user)
    return new_user
