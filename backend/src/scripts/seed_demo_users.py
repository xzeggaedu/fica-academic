"""Seeder para crear usuarios demo por rol y asignar alcances (scopes)."""

from __future__ import annotations

import logging
import os
from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.core.security import get_password_hash
from src.app.models.faculty import Faculty
from src.app.models.role import UserRoleEnum
from src.app.models.school import School
from src.app.models.user import User
from src.app.models.user_scope import UserScope

logger = logging.getLogger(__name__)


async def _get_first_faculty(session: AsyncSession) -> Faculty | None:
    result = await session.execute(select(Faculty).order_by(Faculty.id.asc()))
    return result.scalars().first()


async def _get_all_schools(session: AsyncSession) -> list[School]:
    result = await session.execute(select(School).order_by(School.id.asc()))
    return list(result.scalars().all())


async def _get_or_create_user(
    session: AsyncSession,
    *,
    name: str,
    username: str,
    email: str,
    role: UserRoleEnum,
    password_hash: str,
) -> User:
    result = await session.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user:
        return user

    user = User(
        name=name,
        username=username,
        email=email,
        hashed_password=password_hash,
        role=role.value,
        profile_image_url="https://profileimageurl.com",
    )
    session.add(user)
    await session.flush()  # obtiene uuid
    logger.info("Created user %s (%s)", username, role.value)
    return user


async def _assign_scopes(session: AsyncSession, *, user: User, faculty: Faculty | None, schools: Iterable[School]):
    # Borrar scopes previos del usuario para idempotencia simple
    await session.execute(
        select(UserScope).where(UserScope.fk_user == user.uuid)  # type: ignore[arg-type]
    )
    # Nota: no eliminamos explícitamente; agregaríamos más control si fuese necesario

    if user.role == UserRoleEnum.DECANO.value and faculty is not None:
        session.add(UserScope(id=None, fk_user=user.uuid, fk_faculty=faculty.id, fk_school=None))
        logger.info("Assigned DECANO scope: faculty_id=%s", faculty.id)
    elif user.role == UserRoleEnum.DIRECTOR.value:
        for sch in schools:
            session.add(UserScope(id=None, fk_user=user.uuid, fk_school=sch.id, fk_faculty=sch.fk_faculty))
        logger.info("Assigned DIRECTOR scopes to schools: %s", [s.id for s in schools])


async def seed_demo_users(session: AsyncSession) -> None:
    """Crea tres usuarios demo (vicerrector, decano, director) y asigna scopes.

    - Username = email local-part = nombre en minúsculas
    - Email = {username}@gmail.com
    - Password = valor de la variable de entorno DEMO_PASSWORD (requerida)
    - Scopes:
        * DECANO: primera facultad existente
        * DIRECTOR: dos primeras escuelas existentes (si hay)
        * VICERRECTOR: sin scopes (acceso global por rol)
    """
    demo_password = os.getenv("DEMO_PASSWORD")
    if not demo_password:
        logger.warning("DEMO_PASSWORD no está definido. Seeder de usuarios demo omitido.")
        return

    password_hash = get_password_hash(demo_password)

    # Referencias existentes
    faculty = await _get_first_faculty(session)
    schools = await _get_all_schools(session)

    # 1) Usuarios globales
    global_users_def = [
        ("Vicerrector", os.getenv("VICERRECTOR_USER", "vicerrector"), UserRoleEnum.VICERRECTOR),
        ("Decano", os.getenv("DECANO_USER", "decano"), UserRoleEnum.DECANO),
    ]

    created_global: list[User] = []
    for name, username, role in global_users_def:
        email = f"{username}@gmail.com"
        user = await _get_or_create_user(
            session,
            name=name,
            username=username,
            email=email,
            role=role,
            password_hash=password_hash,
        )
        created_global.append(user)

    # Scopes para decano (primera facultad si existe)
    for user in created_global:
        await _assign_scopes(session, user=user, faculty=faculty, schools=[])

    # 2) Un director por escuela
    if not schools:
        logger.warning("No hay escuelas para asignar directores; se omite creación de directores")
    else:
        # Username para el primer director puede venir en DIRECTOR_USER o DIRECTOR_USER_1
        for idx, sch in enumerate(schools, start=1):
            dir_username = (
                os.getenv("DIRECTOR_USER")
                if idx == 1 and os.getenv("DIRECTOR_USER")
                else os.getenv(f"DIRECTOR_USER_{idx}")
            ) or f"director{idx}"
            name = f"Director {idx}"
            email = f"{dir_username}@gmail.com"
            user = await _get_or_create_user(
                session,
                name=name,
                username=dir_username,
                email=email,
                role=UserRoleEnum.DIRECTOR,
                password_hash=password_hash,
            )
            # Asignar scope a esa escuela
            await _assign_scopes(session, user=user, faculty=faculty, schools=[sch])

    await session.commit()
    logger.info("✓ Usuarios demo creados y scopes asignados")
