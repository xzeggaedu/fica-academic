import uuid as uuid_pkg
from datetime import UTC, datetime

from sqlalchemy import DateTime, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from uuid6 import uuid7

from ..core.db.database import Base
from .role import UserRoleEnum


class User(Base):
    """Modelo de Usuario para la base de datos.

    Representa un usuario del sistema con toda la información necesaria para autenticación, autorización y gestión de
    perfiles.
    """

    __tablename__ = "user"

    # =============================================================================
    # Campos de Identificación
    # =============================================================================

    uuid: Mapped[uuid_pkg.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default_factory=uuid7, init=False)

    # =============================================================================
    # Información Personal
    # =============================================================================

    name: Mapped[str] = mapped_column(String(30))

    username: Mapped[str] = mapped_column(String(20), unique=True, index=True)

    email: Mapped[str] = mapped_column(String(50), unique=True, index=True)

    hashed_password: Mapped[str] = mapped_column(String)

    # =============================================================================
    # Información de Perfil
    # =============================================================================

    profile_image_url: Mapped[str] = mapped_column(String, default="https://profileimageurl.com")

    # =============================================================================
    # Campos de Auditoría
    # =============================================================================

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=lambda: datetime.now(UTC))

    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)

    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)

    is_deleted: Mapped[bool] = mapped_column(default=False, index=True)

    # =============================================================================
    # Autorización
    # =============================================================================

    role: Mapped["UserRoleEnum"] = mapped_column(
        SAEnum(
            UserRoleEnum,
            name="user_role_enum",
            values_callable=lambda obj: [e.value for e in obj],
        ),
        nullable=False,
        default=UserRoleEnum.UNAUTHORIZED,
    )
