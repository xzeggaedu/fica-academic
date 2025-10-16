"""Script para importar profesores desde CSV."""

import asyncio
import csv
import logging
from pathlib import Path

from sqlalchemy import select

from ..app.core.db.database import AsyncSession, local_session
from ..app.models.catalog_professor import CatalogProfessor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def normalize_boolean(value: str) -> bool:
    """Normalizar valores booleanos del CSV."""
    if not value or value.strip() == "":
        return False
    return value.strip() in ("1", "true", "True", "TRUE", "yes", "Yes", "YES")


def normalize_integer(value: str) -> int:
    """Normalizar valores enteros del CSV."""
    if not value or value.strip() == "":
        return 0
    try:
        return int(value.strip())
    except ValueError:
        return 0


def normalize_string(value: str) -> str | None:
    """Normalizar strings del CSV."""
    if not value or value.strip() == "" or value.strip() == '""':
        return None
    return value.strip()


def normalize_accents(text: str) -> str:
    """Normalizar caracteres con acentos a sus equivalentes ASCII."""
    import unicodedata

    # Normalizar a NFD (descomponer caracteres acentuados)
    nfd = unicodedata.normalize("NFD", text)
    # Filtrar solo caracteres ASCII (eliminar acentos)
    return "".join(char for char in nfd if unicodedata.category(char) != "Mn")


def generate_professor_id(name: str, index: int) -> str:
    """Generar un código único para el profesor."""
    # Normalizar el nombre (eliminar acentos)
    normalized_name = normalize_accents(name)

    # Tomar las iniciales del nombre
    parts = normalized_name.split()
    if len(parts) >= 2:
        # Primera letra del nombre + Primera letra del apellido + índice
        code = f"{parts[0][0]}{parts[-1][0]}{index:03d}"
    else:
        code = f"P{index:03d}"
    return code.upper()


async def seed_professors(session: AsyncSession) -> None:
    """Importar profesores desde el archivo CSV."""
    try:
        # Ruta al archivo CSV
        csv_path = Path(__file__).parent.parent / "uploads" / "data" / "faculty_catalog.csv"

        if not csv_path.exists():
            logger.error(f"CSV file not found: {csv_path}")
            return

        logger.info(f"Reading professors from: {csv_path}")

        # Contar cuántos profesores ya existen
        count_query = select(CatalogProfessor)
        result = await session.execute(count_query)
        existing_professors = result.scalars().all()

        if len(existing_professors) > 0:
            logger.info(f"Found {len(existing_professors)} existing professors. Skipping import.")
            return

        # Leer el CSV
        professors_added = 0
        professors_skipped = 0

        with open(csv_path, encoding="utf-8") as csvfile:
            reader = csv.DictReader(csvfile)

            for index, row in enumerate(reader, start=1):
                professor_name = normalize_string(row.get("professor_name", ""))

                if not professor_name:
                    logger.warning(f"Skipping row {index}: No professor name")
                    professors_skipped += 1
                    continue

                # Generar código único
                professor_id = normalize_string(row.get("id", "")) or generate_professor_id(professor_name, index)

                # Verificar si ya existe un profesor con este nombre
                query = select(CatalogProfessor).filter_by(professor_name=professor_name)
                result = await session.execute(query)
                existing = result.scalar_one_or_none()

                if existing:
                    logger.debug(f"Professor '{professor_name}' already exists. Skipping.")
                    professors_skipped += 1
                    continue

                # Crear el profesor
                professor = CatalogProfessor(
                    professor_id=professor_id,
                    professor_name=professor_name,
                    institutional_email=normalize_string(row.get("institutional_email")),
                    personal_email=normalize_string(row.get("personal_email")),
                    phone_number=normalize_string(row.get("phone_number")),
                    professor_category=normalize_string(row.get("professor_category")),
                    academic_title=normalize_string(row.get("academic_title")),
                    doctorates=normalize_integer(row.get("doctorates", "0")),
                    masters=normalize_integer(row.get("masters", "0")),
                    is_bilingual=normalize_boolean(row.get("is_bilingual", "0")),
                    is_paid=normalize_boolean(row.get("is_paid", "0")),
                    is_active=normalize_boolean(row.get("is_active", "1")),
                )

                session.add(professor)
                professors_added += 1

                if professors_added % 20 == 0:
                    logger.info(f"Processed {professors_added} professors...")

        # Commit todos los cambios
        await session.commit()

        logger.info("✅ Professors seeding completed!")
        logger.info(f"   - Added: {professors_added}")
        logger.info(f"   - Skipped: {professors_skipped}")
        logger.info(f"   - Total: {professors_added + professors_skipped}")

    except Exception as e:
        logger.error(f"Error seeding professors: {e}")
        await session.rollback()
        raise


async def main():
    """Main function to run the seeder."""
    async with local_session() as session:
        await seed_professors(session)


if __name__ == "__main__":
    asyncio.run(main())
