"""Seeder para poblar ciclos académicos desde el archivo CSV."""

import asyncio
import csv
import logging
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.core.db.database import local_session
from src.app.core.upload_config import get_upload_path
from src.app.models.term import Term

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def seed_terms(session: AsyncSession) -> None:
    """Pobla la tabla de ciclos académicos desde el archivo CSV.

    Args:
        session: Sesión de base de datos
    """
    logger.info("Starting terms seeding from terms_data.csv...")

    # Ruta al archivo CSV usando configuración centralizada
    csv_path = get_upload_path("data", "terms_data.csv")

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
                # Skip empty rows
                if not row or not any(row.values()):
                    continue

                total_records += 1

                try:
                    from sqlalchemy import and_

                    # Parsear datos del CSV
                    term_num = int(row["term"].strip())
                    year = int(row["year"].strip())
                    description = row["description"].strip() if row.get("description", "").strip() else None
                    start_date_str = row["start_date"].strip()
                    end_date_str = row["end_date"].strip()

                    logger.info(f"Processing term: {term_num}/{year} - {description}")

                    # Parse dates
                    start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
                    end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()

                    # Verificar si ya existe el término para este año
                    existing = await session.execute(select(Term).where(and_(Term.term == term_num, Term.year == year)))

                    if existing.scalar_one_or_none():
                        logger.info(f"Term already exists: Ciclo {term_num}/{year}")
                        skipped_records += 1
                        continue

                    # Crear nuevo ciclo académico
                    new_term = Term(
                        id=None,
                        term=term_num,
                        year=year,
                        description=description,
                        start_date=start_date,
                        end_date=end_date,
                        created_at=datetime.utcnow(),
                    )

                    session.add(new_term)
                    created_records += 1

                    logger.info(f"Created term: Ciclo {term_num}/{year} ({start_date} → {end_date})")

                except Exception as e:
                    logger.error(f"Error processing row {total_records}: {row} - {e}")
                    continue

        await session.commit()
        logger.info(
            f"Terms seeding completed. Total: {total_records}, Created: {created_records}, Skipped: {skipped_records}"
        )

        # Mostrar resumen de ciclos creados
        if created_records > 0:
            logger.info("Created academic terms:")
            result = await session.execute(select(Term).order_by(Term.year.desc(), Term.term))
            terms = result.scalars().all()
            for term in terms:
                logger.info(f"  Ciclo {term.term}/{term.year}: {term.start_date} → {term.end_date}")
                if term.description:
                    logger.info(f"    Description: {term.description}")

    except Exception as e:
        logger.error(f"Error reading CSV file: {e}")
        await session.rollback()
        raise


async def main():
    """Función principal para ejecutar el seeder."""
    logger.info("Starting terms seeder...")

    async with local_session() as session:
        await seed_terms(session)

    logger.info("Terms seeder completed!")


if __name__ == "__main__":
    asyncio.run(main())
