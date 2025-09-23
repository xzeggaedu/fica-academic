from sqlalchemy.orm import Session
from uuid6 import uuid7  # 126

from src.app import models
from src.app.core.security import get_password_hash
from src.app.models.role import UserRoleEnum
from tests.conftest import fake


def create_user(db: Session, is_super_user: bool = False) -> models.User:
    role = UserRoleEnum.ADMIN if is_super_user else UserRoleEnum.UNAUTHORIZED
    _user = models.User(
        name=fake.name(),
        username=fake.user_name(),
        email=fake.email(),
        hashed_password=get_password_hash(fake.password()),
        profile_image_url=fake.image_url(),
        uuid=uuid7,
        role=role,
    )

    db.add(_user)
    db.commit()
    db.refresh(_user)

    return _user
