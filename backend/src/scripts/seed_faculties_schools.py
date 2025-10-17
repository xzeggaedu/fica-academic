import asyncio
import logging

from sqlalchemy import select

from ..app.core.db.database import AsyncSession, local_session
from ..app.models.faculty import Faculty
from ..app.models.school import School

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def create_faculty_and_schools(session: AsyncSession) -> None:
    """Create FICA faculty and its associated schools."""
    try:
        # Check if FICA faculty already exists
        query = select(Faculty).filter_by(acronym="FICA")
        result = await session.execute(query)
        fica_faculty = result.scalar_one_or_none()

        if fica_faculty is None:
            # Create FICA Faculty
            fica_faculty = Faculty(name="Facultad de Informática y Ciencias Aplicadas", acronym="FICA", is_active=True)
            session.add(fica_faculty)
            await session.flush()  # Get the ID without committing

            logger.info("FICA Faculty created successfully.")
        else:
            logger.info("FICA Faculty already exists.")

        # Now create the schools for FICA faculty
        # School 1: Escuela de Informática (INFO)
        info_query = select(School).filter_by(acronym="INFO")
        info_result = await session.execute(info_query)
        info_school = info_result.scalar_one_or_none()

        if info_school is None:
            info_school = School(
                name="Escuela de Informática", acronym="INFO", fk_faculty=fica_faculty.id, is_active=True
            )
            session.add(info_school)
            logger.info("INFO School created successfully.")
        else:
            logger.info("INFO School already exists.")

        # School 2: Escuela de Ciencias Aplicadas (CCAA)
        ccaa_query = select(School).filter_by(acronym="CCAA")
        ccaa_result = await session.execute(ccaa_query)
        ccaa_school = ccaa_result.scalar_one_or_none()

        if ccaa_school is None:
            ccaa_school = School(
                name="Escuela de Ciencias Aplicadas", acronym="CCAA", fk_faculty=fica_faculty.id, is_active=True
            )
            session.add(ccaa_school)
            logger.info("CCAA School created successfully.")
        else:
            logger.info("CCAA School already exists.")

        # Commit all changes
        await session.commit()
        logger.info("Faculty and schools seeding completed successfully!")

    except Exception as e:
        logger.error(f"Error creating faculty and schools: {e}")
        await session.rollback()
        raise


async def main():
    """Main seeding function."""
    logger.info("Starting faculty and schools seeding...")
    async with local_session() as session:
        await create_faculty_and_schools(session)
    logger.info("Seeding completed!")


if __name__ == "__main__":
    asyncio.run(main())
