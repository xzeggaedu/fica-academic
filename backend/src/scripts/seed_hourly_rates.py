"""Seeder para poblar tarifas horarias desde el archivo CSV."""

import asyncio
import csv
import logging
from datetime import datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.core.db.database import local_session
from src.app.core.upload_config import get_upload_path
from src.app.models.academic_level import AcademicLevel
from src.app.models.hourly_rate_history import HourlyRateHistory

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def seed_hourly_rates(session: AsyncSession) -> None:
    """Pobla la tabla de tarifas horarias desde el archivo CSV.

    Args:
        session: Sesión de base de datos
    """
    logger.info("Starting hourly rates seeding from hourly_rate_history_data.csv...")

    # Ruta al archivo CSV usando configuración centralizada
    csv_path = get_upload_path("data", "hourly_rate_history_data.csv")

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
                    # Verificar que la fila tenga las claves esperadas
                    if not row or None in row:
                        logger.warning(f"Skipping invalid row {total_records}: {row}")
                        continue

                    # Parsear datos del CSV
                    level_code = row["level_id"].strip()  # Ahora es un código, no un ID
                    rate_per_hour = float(row["rate_per_hour"].strip())
                    start_date_str = row["start_date"].strip()
                    end_date_str = row["end_date"].strip()

                    # Buscar el academic level por código
                    academic_level_result = await session.execute(
                        select(AcademicLevel).where(AcademicLevel.code == level_code)
                    )
                    academic_level = academic_level_result.scalar_one_or_none()

                    if not academic_level:
                        logger.warning(
                            f"Academic level with code '{level_code}' not found, skipping row {total_records}"
                        )
                        skipped_records += 1
                        continue

                    level_id = academic_level.id
                    logger.info(
                        f"Parsed data: level_code={level_code}, level_id={level_id}, rate_per_hour={rate_per_hour}"
                    )

                    # Parsear fechas como datetime UTC (naive, sin timezone info)
                    start_date_parsed = datetime.fromisoformat(start_date_str + "T00:00:00")

                    # end_date puede ser NULL
                    end_date_parsed = None
                    if end_date_str and end_date_str.upper() != "NULL":
                        end_date_parsed = datetime.fromisoformat(end_date_str + "T23:59:59")

                    # Verificar si ya existe una tarifa activa para este nivel
                    existing = await session.execute(
                        select(HourlyRateHistory).where(
                            HourlyRateHistory.level_id == level_id, HourlyRateHistory.start_date == start_date_parsed
                        )
                    )

                    if existing.scalar_one_or_none():
                        logger.info(
                            f"Hourly rate already exists for level {level_code} "
                            f"starting {start_date_parsed}, skipping"
                        )
                        skipped_records += 1
                        continue

                    # Crear nueva tarifa horaria
                    hourly_rate = HourlyRateHistory(
                        id=None,  # Dejar que la base de datos genere el ID
                        level_id=level_id,
                        rate_per_hour=Decimal(str(rate_per_hour)),
                        start_date=start_date_parsed,
                        end_date=end_date_parsed,
                        created_by_id=None,
                        created_at=datetime.utcnow(),
                    )

                    session.add(hourly_rate)
                    created_records += 1

                    status = "VIGENTE" if end_date_parsed is None else f"hasta {end_date_parsed}"
                    logger.info(
                        f"Created hourly rate: Level {level_id} - ${rate_per_hour}/hr "
                        f"desde {start_date_parsed} ({status})"
                    )

                except Exception as e:
                    logger.error(f"Error processing row {total_records}: {row} - {e}")
                    continue

        await session.commit()
        logger.info(
            f"Hourly rates seeding completed. "
            f"Total: {total_records}, Created: {created_records}, Skipped: {skipped_records}"
        )

        # Mostrar resumen de tarifas creadas
        if created_records > 0:
            logger.info("Created hourly rates summary:")
            result = await session.execute(
                select(HourlyRateHistory).order_by(HourlyRateHistory.level_id, HourlyRateHistory.start_date.desc())
            )
            rates = result.scalars().all()
            for rate in rates:
                status = "VIGENTE" if rate.end_date is None else f"hasta {rate.end_date}"
                logger.info(f"  Level {rate.level_id}: ${rate.rate_per_hour}/hr " f"desde {rate.start_date} ({status})")

    except Exception as e:
        logger.error(f"Error reading CSV file: {e}")
        await session.rollback()
        raise


async def main():
    """Función principal para ejecutar el seeder."""
    logger.info("Starting hourly rates seeder...")

    async with local_session() as session:
        await seed_hourly_rates(session)

    logger.info("Hourly rates seeder completed!")


if __name__ == "__main__":
    asyncio.run(main())
