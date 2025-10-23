"""Seeder para crear automáticamente el Holiday del año 2025 con sus annual holidays."""

import asyncio
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.core.db.database import local_session
from src.app.crud.crud_holiday import create_holiday
from src.app.models.holiday import Holiday
from src.app.schemas.holiday import HolidayCreate

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def seed_holidays(session: AsyncSession) -> None:
    """Crea automáticamente el Holiday para 2025 y genera sus annual holidays.

    Este seeder:
    1. Verifica si ya existe un Holiday para 2025
    2. Si no existe, lo crea
    3. Automáticamente genera:
       - AnnualHolidays desde FixedHolidayRules (11 asuetos)
       - AnnualHolidays de Semana Santa calculados por fórmula (8 días)

    Args:
        session: Sesión de base de datos
    """
    logger.info("Starting holidays seeding for 2025...")

    try:
        # Verificar si ya existe el Holiday para 2025
        existing = await session.execute(select(Holiday).where(Holiday.year == 2025))

        if existing.scalar_one_or_none():
            logger.info("Holiday for year 2025 already exists, skipping creation")
            return

        # Crear Holiday para 2025 (esto auto-genera los annual holidays)
        holiday_data = HolidayCreate(year=2025, description="Asuetos Oficiales 2025")

        logger.info("Creating Holiday for 2025...")
        new_holiday = await create_holiday(session=session, holiday_data=holiday_data)

        logger.info("✅ Holiday created successfully for year 2025")
        logger.info(f"   - Holiday ID: {new_holiday.id}")
        logger.info(f"   - Annual Holidays generated: {len(new_holiday.annual_holidays)}")

        # Mostrar resumen de annual holidays generados
        if new_holiday.annual_holidays:
            logger.info("Annual holidays breakdown:")

            # Contar por tipo
            nacional_count = sum(1 for ah in new_holiday.annual_holidays if ah.type == "Asueto Nacional")
            personalizado_count = sum(1 for ah in new_holiday.annual_holidays if ah.type == "Personalizado")

            logger.info(f"   - Asueto Nacional: {nacional_count}")
            logger.info(f"   - Personalizado (Semana Santa): {personalizado_count}")

            # Mostrar fechas de Semana Santa
            semana_santa = [ah for ah in new_holiday.annual_holidays if ah.name == "Semana Santa"]
            if semana_santa:
                logger.info("   - Semana Santa dates:")
                for ah in sorted(semana_santa, key=lambda x: x.date):
                    logger.info(f"     • {ah.date}")

    except Exception as e:
        logger.error(f"Error creating holiday for 2025: {e}")
        await session.rollback()
        raise


async def main():
    """Función principal para ejecutar el seeder."""
    logger.info("Starting holidays seeder...")

    async with local_session() as session:
        await seed_holidays(session)

    logger.info("Holidays seeder completed!")


if __name__ == "__main__":
    asyncio.run(main())
