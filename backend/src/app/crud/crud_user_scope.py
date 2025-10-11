"""Operaciones CRUD para el modelo UserScope."""

from fastcrud import FastCRUD
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.user_scope import UserScope

# Crear instancia CRUD para UserScope
crud_user_scope = FastCRUD(UserScope)


async def delete_user_scopes(db: AsyncSession, user_id: int) -> None:
    """Eliminar todas las asignaciones de alcance de un usuario.

    Esto se llama antes de asignar nuevos alcances para asegurar un estado limpio.

    Args:
    ----
        db: Sesión de base de datos
        user_id: ID del usuario cuyas asignaciones se eliminarán
    """
    stmt = delete(UserScope).where(UserScope.fk_user == user_id)
    await db.execute(stmt)
    await db.commit()


async def create_faculty_scope(db: AsyncSession, user_id: int, faculty_id: int) -> UserScope:
    """Crear una asignación de alcance de facultad para el rol DECANO.

    Args:
    ----
        db: Sesión de base de datos
        user_id: ID del usuario
        faculty_id: ID de la facultad a asignar

    Returns:
    -------
        Instancia UserScope creada
    """
    user_scope = UserScope(fk_user=user_id, fk_faculty=faculty_id, fk_school=None)
    db.add(user_scope)
    await db.commit()
    await db.refresh(user_scope)
    return user_scope


async def create_school_scope(db: AsyncSession, user_id: int, school_id: int) -> UserScope:
    """Crear una asignación de alcance de escuela para el rol DIRECTOR.

    Args:
    ----
        db: Sesión de base de datos
        user_id: ID del usuario
        school_id: ID de la escuela a asignar

    Returns:
    -------
        Instancia UserScope creada
    """
    user_scope = UserScope(fk_user=user_id, fk_school=school_id, fk_faculty=None)
    db.add(user_scope)
    await db.commit()
    await db.refresh(user_scope)
    return user_scope


async def get_user_scopes(db: AsyncSession, user_id: int) -> list[UserScope]:
    """Obtener todas las asignaciones de alcance de un usuario.

    Args:
    ----
        db: Sesión de base de datos
        user_id: ID del usuario

    Returns:
    -------
        Lista de instancias UserScope
    """
    stmt = select(UserScope).where(UserScope.fk_user == user_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_user_faculty_scope(db: AsyncSession, user_id: int) -> int | None:
    """Obtener el UUID de la facultad asignada a un usuario (para rol DECANO).

    Args:
    ----
        db: Sesión de base de datos
        user_id: ID del usuario

    Returns:
    -------
        ID de la facultad si está asignada, None en caso contrario
    """
    stmt = select(UserScope.fk_faculty).where(UserScope.fk_user == user_id, UserScope.fk_faculty.isnot(None))
    result = await db.execute(stmt)
    faculty_id = result.scalar_one_or_none()
    return faculty_id


async def get_user_school_scopes(db: AsyncSession, user_id: int) -> list[int]:
    """Obtener todos los UUIDs de escuelas asignadas a un usuario (para rol DIRECTOR).

    Args:
    ----
        db: Sesión de base de datos
        user_id: ID del usuario

    Returns:
    -------
        Lista de IDs de escuelas
    """
    stmt = select(UserScope.fk_school).where(UserScope.fk_user == user_id, UserScope.fk_school.isnot(None))
    result = await db.execute(stmt)
    school_ids = result.scalars().all()
    return list(school_ids)
