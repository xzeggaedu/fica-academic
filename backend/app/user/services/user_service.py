# app/user/services/user_service.py
from __future__ import annotations

from typing import List, Optional

from sqlalchemy.orm import Session

from app.auth.utils.auth_utils import hash_password
from app.user.models.user import User, UserRoleEnum
from app.user.schemas.user import UserCreate


class UserService:
    """Servicio para operaciones CRUD de usuarios."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, user_id: int) -> Optional[User]:
        return self.db.query(User).filter(User.id == user_id).first()

    def get_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email).first()

    def list(self) -> List[User]:
        return self.db.query(User).all()

    def create(self, obj_in: UserCreate) -> User:
        """Crea un nuevo usuario. Hashea la contraseña con Argon2id."""
        # Determinar rol: si no se especifica,
        # usar valor por defecto del modelo
        role = obj_in.role or UserRoleEnum.DIRECTOR
        db_user = User(
            email=str(obj_in.email),
            role=role,
            hashed_password=hash_password(obj_in.password),
        )
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        return db_user

    def delete(self, user_id: int) -> None:
        user = self.get(user_id)
        if user:
            self.db.delete(user)
            self.db.commit()
