#!/usr/bin/env python3
"""Script para limpiar las tablas antes de ejecutar los seeders."""

import asyncio
import logging

from sqlalchemy import text

from src.app.core.db.database import local_session

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def clean_tables():
    """Limpiar las tablas de hourly rates y academic levels."""
    logger.info("Cleaning tables...")

    async with local_session() as session:
        try:
            # Limpiar hourly_rate_history primero (por las foreign keys)
            await session.execute(text("DELETE FROM hourly_rate_history"))
            logger.info("Cleaned hourly_rate_history table")

            # Limpiar academic_level
            await session.execute(text("DELETE FROM academic_level"))
            logger.info("Cleaned academic_level table")

            # Resetear las secuencias de ID
            await session.execute(text("ALTER SEQUENCE hourly_rate_history_id_seq RESTART WITH 1"))
            await session.execute(text("ALTER SEQUENCE academic_level_id_seq RESTART WITH 1"))
            logger.info("Reset ID sequences")

            await session.commit()
            logger.info("Tables cleaned successfully!")

        except Exception as e:
            logger.error(f"Error cleaning tables: {e}")
            await session.rollback()
            raise


async def main():
    """Función principal."""
    logger.info("Starting table cleanup...")
    await clean_tables()
    logger.info("Cleanup completed!")


if __name__ == "__main__":
    asyncio.run(main())
