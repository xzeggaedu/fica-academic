#!/usr/bin/env python3
"""Script de prueba para verificar que los seeders funcionan correctamente."""

import asyncio
import logging

from sqlalchemy import select

from src.app.core.db.database import local_session
from src.app.models.academic_level import AcademicLevel
from src.app.models.hourly_rate_history import HourlyRateHistory

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_academic_levels():
    """Verificar que los academic levels están en la base de datos."""
    logger.info("Testing academic levels...")

    async with local_session() as session:
        result = await session.execute(select(AcademicLevel))
        levels = result.scalars().all()

        logger.info(f"Found {len(levels)} academic levels:")
        for level in levels:
            logger.info(f"  ID: {level.id}, Code: {level.code}, Name: {level.name}, Priority: {level.priority}")

        return len(levels) > 0


async def test_hourly_rates():
    """Verificar que las hourly rates están en la base de datos."""
    logger.info("Testing hourly rates...")

    async with local_session() as session:
        result = await session.execute(select(HourlyRateHistory))
        rates = result.scalars().all()

        logger.info(f"Found {len(rates)} hourly rates:")
        for rate in rates:
            logger.info(
                f"  ID: {rate.id}, Level ID: {rate.level_id}, Rate: ${rate.rate_per_hour}, Start: {rate.start_date}"
            )

        return len(rates) > 0


async def main():
    """Función principal."""
    logger.info("Starting seeder tests...")

    academic_levels_ok = await test_academic_levels()
    hourly_rates_ok = await test_hourly_rates()

    logger.info(f"Academic levels: {'OK' if academic_levels_ok else 'FAILED'}")
    logger.info(f"Hourly rates: {'OK' if hourly_rates_ok else 'FAILED'}")

    if academic_levels_ok and hourly_rates_ok:
        logger.info("All tests passed!")
    else:
        logger.error("Some tests failed!")


if __name__ == "__main__":
    asyncio.run(main())
