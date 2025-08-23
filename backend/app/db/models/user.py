# app/db/models/user.py
from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


# ---------------------------------------------------------------------------
# RBAC: static roles
# If later you prefer a roles table, this Enum can be replaced by a FK.
# ---------------------------------------------------------------------------
class UserRoleEnum(str, enum.Enum):
    ADMIN = "admin"
    DIRECTOR = "director"
    DECANO = "decano"
    VICERRECTOR = "vicerrector"


class User(Base):
    """User model with single role."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
    )
    # Store Argon2id hash here (never the plaintext password).
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    role: Mapped[UserRoleEnum] = mapped_column(
        Enum(UserRoleEnum, name="user_role_enum"),
        nullable=False,
        default=UserRoleEnum.DIRECTOR,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        onupdate=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )

    # Relationships
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    audits: Mapped[list["AuthAudit"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    __table_args__ = (
        # Example: prevent invalid emails length; syntactic
        # email validation is done at API layer.
        CheckConstraint("length(email) >= 3", name="ck_users_email_len"),
        Index("ix_users_email", "email"),
    )


class RefreshToken(Base):
    """Refresh tokens persisted as hashes to never store raw token.
    Each row represents one session/device.
    """

    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Store a hash of the refresh token (e.g., SHA256(token + pepper)).
    refresh_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    # Expiration timestamp in epoch seconds or ISO;
    # choose what fits your issuer logic.
    # Using integer epoch keeps it simple for comparisons.
    exp_epoch: Mapped[int] = mapped_column(Integer, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )
    revoked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    user: Mapped["User"] = relationship(back_populates="refresh_tokens")

    __table_args__ = (
        # Avoid duplicate records for the same user/session hash
        UniqueConstraint("user_id", "refresh_hash", name="uq_user_refhash"),
        Index("ix_refresh_user", "user_id"),
    )


class AuthEventEnum(str, enum.Enum):
    LOGIN = "login"
    REFRESH = "refresh"
    LOGOUT = "logout"
    FAIL = "fail"


class AuthAudit(Base):
    """Minimal audit trail for authentication-related events."""

    __tablename__ = "auth_audit"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    event: Mapped[AuthEventEnum] = mapped_column(
        Enum(AuthEventEnum, name="auth_event_enum"), nullable=False
    )
    ip: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )

    user: Mapped[Optional["User"]] = relationship(back_populates="audits")

    __table_args__ = (
        Index("ix_auth_audit_user", "user_id"),
        Index("ix_auth_audit_event", "event"),
    )
