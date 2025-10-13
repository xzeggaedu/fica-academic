"""Script para poblar el catálogo de cursos desde CSV."""

import asyncio
import csv
import logging
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.core.db.database import local_session
from src.app.core.upload_config import get_upload_path
from src.app.models.catalog_course import CatalogCourse
from src.app.models.course_school import CourseSchool
from src.app.models.school import School

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def parse_school_codes(school_codes_str: str) -> list[str]:
    """
    Parsear el string de códigos de escuelas y retornar lista de acrónimos.
    
    Args:
        school_codes_str: String que puede ser "INFO" o "CCAA, INFO"
    
    Returns:
        Lista de acrónimos de escuelas
    """
    # Limpiar comillas y espacios
    school_codes_str = school_codes_str.strip().strip('"').strip("'")
    
    # Si está vacío, retornar lista vacía
    if not school_codes_str:
        return []
    
    # Dividir por comas y limpiar cada acrónimo
    acronyms = [code.strip().upper() for code in school_codes_str.split(',') if code.strip()]
    
    return acronyms


async def get_school_id_by_acronym(session: AsyncSession, acronym: str) -> int | None:
    """
    Obtener el ID de una escuela por su acrónimo.
    
    Args:
        session: Sesión de base de datos
        acronym: Acrónimo de la escuela
    
    Returns:
        ID de la escuela o None si no existe
    """
    result = await session.execute(
        select(School).where(School.acronym == acronym)
    )
    school = result.scalar_one_or_none()
    return school.id if school else None


async def seed_courses(session: AsyncSession) -> None:
    """
    Poblar el catálogo de cursos desde el archivo CSV.
    
    Args:
        session: Sesión de base de datos
    """
    logger.info("Starting courses seeding from courses_catalog.csv...")
    
    # Ruta al archivo CSV
    csv_path = get_upload_path("data", "courses_catalog.csv")
    
    if not csv_path.exists():
        logger.error(f"CSV file not found: {csv_path}")
        return
    
    try:
        # Pre-cargar el mapeo de acrónimos a IDs para mejor rendimiento
        result = await session.execute(select(School))
        schools = result.scalars().all()
        acronym_to_id = {school.acronym: school.id for school in schools}
        
        logger.info(f"Loaded {len(acronym_to_id)} schools: {list(acronym_to_id.keys())}")
        
        with open(csv_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            total_records = 0
            created_records = 0
            skipped_records = 0
            
            for row in reader:
                total_records += 1
                
                try:
                    # Parsear datos del CSV
                    course_code = row['CourseCode'].strip()
                    course_name = row['CourseName'].strip()
                    department_code = row['DepartmentCode'].strip()
                    school_codes_str = row['SchoolCodes'].strip()
                    
                    # Verificar si el curso ya existe
                    existing = await session.execute(
                        select(CatalogCourse).where(
                            CatalogCourse.course_code == course_code
                        )
                    )
                    
                    if existing.scalar_one_or_none():
                        logger.info(f"Course already exists, skipping: {course_code}")
                        skipped_records += 1
                        continue
                    
                    # Parsear los acrónimos de escuelas
                    school_acronyms = parse_school_codes(school_codes_str)
                    
                    # Obtener los IDs de las escuelas
                    school_ids = []
                    for acronym in school_acronyms:
                        school_id = acronym_to_id.get(acronym)
                        if school_id:
                            school_ids.append(school_id)
                        else:
                            logger.warning(f"School acronym not found: {acronym} for course {course_code}")
                    
                    # Crear el curso
                    course = CatalogCourse(
                        course_code=course_code,
                        course_name=course_name,
                        department_code=department_code,
                        is_active=True
                    )
                    
                    session.add(course)
                    await session.flush()  # Flush para obtener el ID
                    
                    # Crear las relaciones con escuelas
                    for school_id in school_ids:
                        course_school = CourseSchool(
                            course_id=course.id,
                            school_id=school_id
                        )
                        session.add(course_school)
                    
                    created_records += 1
                    
                    logger.info(
                        f"Created course: {course_code} - {course_name} "
                        f"({len(school_ids)} school(s))"
                    )
                    
                except Exception as e:
                    logger.error(f"Error processing row {total_records}: {row} - {e}")
                    continue
            
            await session.commit()
            logger.info(
                f"Courses seeding completed. "
                f"Total: {total_records}, Created: {created_records}, "
                f"Skipped: {skipped_records}"
            )
            
    except Exception as e:
        logger.error(f"Error reading CSV file: {e}")
        await session.rollback()
        raise


async def main():
    """Función principal para ejecutar el seeder."""
    logger.info("Starting courses seeder...")
    
    async with local_session() as db:
        await seed_courses(db)
    
    logger.info("Courses seeder completed successfully!")


if __name__ == "__main__":
    asyncio.run(main())

