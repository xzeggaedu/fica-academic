"""Seeder para poblar niveles académicos desde el archivo CSV."""

import asyncio
import csv
import logging
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.core.db.database import local_session
from src.app.core.upload_config import get_upload_path
from src.app.models.academic_level import AcademicLevel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def seed_academic_levels(session: AsyncSession) -> None:
    """Pobla la tabla de niveles académicos desde el archivo CSV.

    Args:
        session: Sesión de base de datos
    """
    logger.info("Starting academic levels seeding from academic_levels_data.csv...")

    # Ruta al archivo CSV usando configuración centralizada
    csv_path = get_upload_path("data", "academic_levels_data.csv")

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
                    level_id = int(row["id"].strip())
                    code = row["code"].strip().upper()
                    name = row["name"].strip()
                    priority = int(row["priority"].strip())

                    # Verificar si ya existe por código
                    existing = await session.execute(select(AcademicLevel).where(AcademicLevel.code == code))

                    if existing.scalar_one_or_none():
                        logger.info(f"Academic level already exists: {code} - {name}")
                        skipped_records += 1
                        continue

                    # Crear nuevo nivel académico
                    academic_level = AcademicLevel(
                        id=level_id,
                        code=code,
                        name=name,
                        priority=priority,
                        is_active=True,
                        created_at=datetime.now(),
                    )

                    session.add(academic_level)
                    created_records += 1

                    logger.info(f"Created academic level: {code} - {name} (Priority: {priority})")

                except Exception as e:
                    logger.error(f"Error processing row {total_records}: {row} - {e}")
                    continue

        await session.commit()
        logger.info(
            f"Academic levels seeding completed. "
            f"Total: {total_records}, Created: {created_records}, Skipped: {skipped_records}"
        )

        # Mostrar resumen de niveles académicos creados
        if created_records > 0:
            logger.info("Created academic levels:")
            result = await session.execute(select(AcademicLevel).order_by(AcademicLevel.priority.desc()))
            levels = result.scalars().all()
            for level in levels:
                logger.info(f"  {level.code} - {level.name} (Priority: {level.priority})")

    except Exception as e:
        logger.error(f"Error reading CSV file: {e}")
        await session.rollback()
        raise


async def main():
    """Función principal para ejecutar el seeder."""
    logger.info("Starting academic levels seeder...")

    async with local_session() as session:
        await seed_academic_levels(session)

    logger.info("Academic levels seeder completed!")


if __name__ == "__main__":
    asyncio.run(main())
