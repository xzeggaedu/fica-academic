"""Seeder para poblar reglas de asuetos fijos desde el archivo CSV."""

import asyncio
import csv
import logging
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.core.db.database import local_session
from src.app.core.upload_config import get_upload_path
from src.app.models.fixed_holiday_rule import FixedHolidayRule

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def seed_fixed_holiday_rules(session: AsyncSession) -> None:
    """Pobla la tabla de reglas de asuetos fijos desde el archivo CSV.

    Args:
        session: Sesión de base de datos
    """
    logger.info("Starting fixed holiday rules seeding from fixed_holiday_data.csv...")

    # Ruta al archivo CSV usando configuración centralizada
    csv_path = get_upload_path("data", "fixed_holiday_data.csv")

    if not csv_path.exists():
        logger.error(f"CSV file not found: {csv_path}")
        return

    try:
        with open(csv_path, encoding="utf-8-sig") as file:
            reader = csv.DictReader(file)

            total_records = 0
            created_records = 0
            skipped_records = 0

            for row in reader:
                total_records += 1

                try:
                    # Parsear datos del CSV
                    name = row["name"].strip()
                    month = int(row["month"].strip())
                    day = int(row["day"].strip())

                    # Verificar si ya existe una regla para este mes/día
                    existing = await session.execute(
                        select(FixedHolidayRule).where(FixedHolidayRule.month == month, FixedHolidayRule.day == day)
                    )

                    if existing.scalar_one_or_none():
                        logger.info(f"Fixed holiday rule already exists: {name} ({month}/{day})")
                        skipped_records += 1
                        continue

                    # Crear nueva regla de asueto fijo
                    fixed_rule = FixedHolidayRule(
                        id=None,
                        name=name,
                        month=month,
                        day=day,
                        created_at=datetime.utcnow(),
                    )

                    session.add(fixed_rule)
                    created_records += 1

                    logger.info(f"Created fixed holiday rule: {name} ({month}/{day})")

                except Exception as e:
                    logger.error(f"Error processing row {total_records}: {row} - {e}")
                    continue

        await session.commit()
        logger.info(
            f"Fixed holiday rules seeding completed. "
            f"Total: {total_records}, Created: {created_records}, Skipped: {skipped_records}"
        )

        # Mostrar resumen de reglas creadas
        if created_records > 0:
            logger.info("Created fixed holiday rules:")
            result = await session.execute(
                select(FixedHolidayRule).order_by(FixedHolidayRule.month, FixedHolidayRule.day)
            )
            rules = result.scalars().all()
            for rule in rules:
                logger.info(f"  {rule.name} ({rule.month}/{rule.day})")

    except Exception as e:
        logger.error(f"Error reading CSV file: {e}")
        await session.rollback()
        raise


async def main():
    """Función principal para ejecutar el seeder."""
    logger.info("Starting fixed holiday rules seeder...")

    async with local_session() as session:
        await seed_fixed_holiday_rules(session)

    logger.info("Fixed holiday rules seeder completed!")


if __name__ == "__main__":
    asyncio.run(main())
