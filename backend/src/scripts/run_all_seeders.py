#!/usr/bin/env python3
"""Script completo para ejecutar todos los seeders paso a paso."""

import asyncio
import logging

from src.app.core.db.database import local_session
from src.scripts.seed_academic_levels import seed_academic_levels
from src.scripts.seed_hourly_rates import seed_hourly_rates
from src.scripts.test_seeders import test_academic_levels, test_hourly_rates

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def run_seeders():
    """Ejecutar todos los seeders paso a paso."""
    logger.info("Starting complete seeding process...")

    try:
        # Paso 1: Seed academic levels
        logger.info("Step 1: Seeding academic levels...")
        async with local_session() as session:
            await seed_academic_levels(session)
        logger.info("Academic levels seeded successfully!")

        # Paso 2: Verificar academic levels
        logger.info("Step 2: Verifying academic levels...")
        academic_levels_ok = await test_academic_levels()
        if not academic_levels_ok:
            raise Exception("Academic levels verification failed!")

        # Paso 3: Seed hourly rates
        logger.info("Step 3: Seeding hourly rates...")
        async with local_session() as session:
            await seed_hourly_rates(session)
        logger.info("Hourly rates seeded successfully!")

        # Paso 4: Verificar hourly rates
        logger.info("Step 4: Verifying hourly rates...")
        hourly_rates_ok = await test_hourly_rates()
        if not hourly_rates_ok:
            raise Exception("Hourly rates verification failed!")

        logger.info("All seeders completed successfully!")

    except Exception as e:
        logger.error(f"Seeding failed: {e}")
        raise


async def main():
    """Función principal."""
    await run_seeders()


if __name__ == "__main__":
    asyncio.run(main())
