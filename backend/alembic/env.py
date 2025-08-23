# pylint: disable=no-member
from __future__ import annotations

import os
from logging.config import fileConfig

from sqlalchemy import create_engine, pool

from alembic import context
from app.db.models import Base

# -----------------------------------------------------------------------------
# Alembic Config
# -----------------------------------------------------------------------------
config = context.config

# If you use a .ini logging section, this sets up Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# -----------------------------------------------------------------------------
# Target metadata for 'autogenerate'
# -----------------------------------------------------------------------------
# Set this to your metadata once you have models, e.g.:
# from app.db.models import Base

target_metadata = Base.metadata

# -----------------------------------------------------------------------------
# Database URL
# -----------------------------------------------------------------------------
# Read DATABASE_URL from environment (e.g., .env loaded by your app).
# Example format: postgresql://user:password@db:5432/database
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set.")

# Inject the URL into Alembic's config so 'alembic' CLI can see it.
config.set_main_option("sqlalchemy.url", DATABASE_URL)


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.
    This configures the context with just a URL, no Engine or DBAPI
    connection. Suitable for CI or environments where creating a real
    connection is undesired.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,  # Render values inline in SQL output.
        compare_type=True,  # Detect column type changes.
        compare_server_default=True,  # Detect server default changes.
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode.
    This creates an Engine and associates a connection with the context.
    """
    connectable = create_engine(
        DATABASE_URL,
        poolclass=pool.NullPool,
        future=True,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


# Alembic entry point
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
