"""Script para poblar el catálogo de coordinaciones desde CSV."""

import asyncio
import csv
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.core.db.database import local_session
from src.app.core.upload_config import get_upload_path
from src.app.models.catalog_coordination import CatalogCoordination
from src.app.models.catalog_professor import CatalogProfessor
from src.app.models.faculty import Faculty
from src.app.models.school import School

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def seed_coordinations(session: AsyncSession) -> None:
    """Poblar el catálogo de coordinaciones desde el archivo CSV.

    Args:
        session: Sesión de base de datos
    """
    logger.info("Starting coordinations seeding from coordinations_catalog.csv...")

    # Ruta al archivo CSV
    csv_path = get_upload_path("data", "coordinations_catalog.csv")

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
                # Saltar líneas vacías
                if not row.get("code") or not row["code"].strip():
                    continue

                total_records += 1

                try:
                    # Parsear datos del CSV
                    code = row["code"].strip().upper()
                    name = row["name"].strip()
                    description = row["description"].strip() if row.get("description") else None
                    faculty_acronym = row["faculty"].strip() if row.get("faculty") else None
                    school_acronym = row["school"].strip() if row.get("school") else None
                    coordinator_name = row["coordinador"].strip() if row.get("coordinador") else None

                    # Verificar si la coordinación ya existe
                    existing = await session.execute(
                        select(CatalogCoordination).where(CatalogCoordination.code == code)
                    )

                    if existing.scalar_one_or_none():
                        logger.info(f"Coordination already exists, skipping: {code}")
                        skipped_records += 1
                        continue

                    # Buscar facultad por acrónimo
                    faculty_id = None
                    if faculty_acronym:
                        result = await session.execute(
                            select(Faculty).where(Faculty.acronym.ilike(f"%{faculty_acronym}%"))
                        )
                        faculty = result.scalar_one_or_none()
                        if faculty:
                            faculty_id = faculty.id
                            logger.info(
                                f"Found faculty: {faculty.name} (ID: {faculty.id}) for acronym: {faculty_acronym}"
                            )
                        else:
                            logger.error(f"Faculty not found for acronym: {faculty_acronym}")
                            continue  # Skip this row if faculty not found

                    # Buscar escuela por acrónimo
                    school_id = None
                    if school_acronym:
                        result = await session.execute(
                            select(School).where(School.acronym.ilike(f"%{school_acronym}%"))
                        )
                        school = result.scalar_one_or_none()
                        if school:
                            school_id = school.id
                            logger.info(f"Found school: {school.name} (ID: {school.id}) for acronym: {school_acronym}")
                        else:
                            logger.error(f"School not found for acronym: {school_acronym}")
                            continue  # Skip this row if school not found

                    # Buscar profesor coordinador por nombre
                    coordinator_id = None
                    if coordinator_name:
                        result = await session.execute(
                            select(CatalogProfessor).where(
                                CatalogProfessor.professor_name.ilike(f"%{coordinator_name}%")
                            )
                        )
                        coordinator = result.scalar_one_or_none()
                        if coordinator:
                            coordinator_id = coordinator.id
                            logger.info(f"Found coordinator: {coordinator.professor_name} (ID: {coordinator.id})")
                        else:
                            logger.warning(
                                f"Coordinator not found for name: {coordinator_name} - will create without coordinator"
                            )

                    # Validar que tenemos los datos mínimos requeridos
                    if not faculty_id:
                        logger.error(f"Cannot create coordination {code} - Faculty ID is required")
                        continue

                    if not school_id:
                        logger.error(f"Cannot create coordination {code} - School ID is required")
                        continue

                    # Crear la coordinación con los IDs encontrados
                    coordination = CatalogCoordination(
                        code=code,
                        name=name,
                        description=description,
                        faculty_id=faculty_id,
                        school_id=school_id,
                        coordinator_professor_id=coordinator_id,
                        is_active=True,
                    )

                    session.add(coordination)
                    created_records += 1

                    logger.info(
                        f"Created coordination: {code} - {name} "
                        f"(Faculty: {faculty_id}, School: {school_id}, Coordinator: {coordinator_id})"
                    )

                except Exception as e:
                    logger.error(f"Error processing row {total_records}: {row} - {e}")
                    continue

            await session.commit()
            logger.info(
                f"Coordinations seeding completed. "
                f"Total: {total_records}, Created: {created_records}, "
                f"Skipped: {skipped_records}"
            )

            # Mostrar resumen de coordinaciones creadas
            if created_records > 0:
                logger.info("Created coordinations:")
                result = await session.execute(select(CatalogCoordination).order_by(CatalogCoordination.code))
                coordinations = result.scalars().all()
                for coord in coordinations:
                    logger.info(
                        f"  {coord.code} - {coord.name} "
                        f"(Faculty: {coord.faculty_id}, School: {coord.school_id}, "
                        f"Coordinator: {coord.coordinator_professor_id})"
                    )

    except Exception as e:
        logger.error(f"Error reading CSV file: {e}")
        await session.rollback()
        raise


async def main():
    """Función principal para ejecutar el seeder."""
    logger.info("Starting coordinations seeder...")

    async with local_session() as db:
        await seed_coordinations(db)

    logger.info("Coordinations seeder completed successfully!")


if __name__ == "__main__":
    asyncio.run(main())
