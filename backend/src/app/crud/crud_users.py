from datetime import UTC, datetime
from uuid import UUID

from fastcrud import FastCRUD

from ..models.user import User
from ..schemas.user import UserCreateInternal, UserDelete, UserRead, UserUpdate, UserUpdateAdmin, UserUpdateInternal

CRUDUser = FastCRUD[User, UserCreateInternal, UserUpdate, UserUpdateInternal, UserDelete, UserRead]
crud_users = CRUDUser(User)


# Soft Delete operations
async def soft_delete_user(db, user_uuid: UUID) -> bool:
    """Marcar un usuario como eliminado (soft delete)."""
    update_data = UserUpdateAdmin(deleted=True, deleted_at=datetime.now(UTC))

    await crud_users.update(db=db, object=update_data, uuid=user_uuid)
    await db.commit()
    return True


async def restore_user(db, user_uuid: UUID) -> bool:
    """Restaurar un usuario eliminado (revertir soft delete)."""
    update_data = UserUpdateAdmin(deleted=False, deleted_at=None)

    await crud_users.update(db=db, object=update_data, uuid=user_uuid)
    await db.commit()
    return True


async def get_deleted_users(db, offset: int = 0, limit: int = 100):
    """Obtener todos los usuarios eliminados (soft deleted)."""
    return await crud_users.get_multi(db=db, offset=offset, limit=limit, deleted=True)


async def get_non_deleted_users(db, offset: int = 0, limit: int = 100, role: str | None = None):
    """Obtener todos los usuarios no eliminados (soft delete)."""
    filters = {"deleted": False}
    if role is not None:
        filters["role"] = role

    return await crud_users.get_multi(db=db, offset=offset, limit=limit, **filters)


async def hard_delete_user(db, user_uuid: UUID) -> bool:
    """Eliminar permanentemente un usuario de la base de datos."""
    from sqlalchemy import delete

    stmt = delete(User).where(User.uuid == user_uuid)
    await db.execute(stmt)
    await db.commit()
    return True
