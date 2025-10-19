#!/usr/bin/env python3
"""Database initialization script.

This script runs migrations and creates the first superuser.
"""
import asyncio
import logging
import subprocess
import sys

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def run_migrations():
    """Run Alembic migrations."""
    logger.info("Running database migrations...")
    try:
        # Change to src directory and run migrations
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            cwd="/code/src",
            capture_output=True,
            text=True,
            check=True,
        )
        logger.info("Migrations completed successfully")
        logger.debug(f"Migration output: {result.stdout}")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Migration failed: {e}")
        logger.error(f"Error output: {e.stderr}")
        return False


async def create_superuser():
    """Create the first superuser."""
    logger.info("Creating first superuser...")
    try:
        # Import and run the superuser creation
        from src.app.core.db.database import local_session
        from src.scripts.create_first_superuser import create_first_user

        async with local_session() as session:
            await create_first_user(session)

        logger.info("Superuser creation completed")
        return True
    except Exception as e:
        logger.error(f"Superuser creation failed: {e}")
        return False


async def seed_faculties_schools():
    """Seed initial faculties and schools."""
    logger.info("Seeding faculties and schools...")
    try:
        # Import and run the seeding
        from src.app.core.db.database import local_session
        from src.scripts.seed_faculties_schools import create_faculty_and_schools

        async with local_session() as session:
            await create_faculty_and_schools(session)

        logger.info("Faculties and schools seeding completed")
        return True
    except Exception as e:
        logger.error(f"Faculties and schools seeding failed: {e}")
        return False


async def seed_schedule_times():
    """Seed initial schedule times."""
    logger.info("Seeding schedule times...")
    try:
        # Import and run the seeding
        from src.app.core.db.database import local_session
        from src.scripts.seed_schedule_times import seed_schedule_times

        async with local_session() as session:
            await seed_schedule_times(session)

        logger.info("Schedule times seeding completed")
        return True
    except Exception as e:
        logger.error(f"Schedule times seeding failed: {e}")
        return False


async def seed_subjects():
    """Seed subjects catalog."""
    logger.info("Seeding subjects catalog...")
    try:
        # Import and run the seeding
        from src.app.core.db.database import local_session
        from src.scripts.seed_subjects import seed_subjects

        async with local_session() as session:
            await seed_subjects(session)

        logger.info("Subjects seeding completed")
        return True
    except Exception as e:
        logger.error(f"Subjects seeding failed: {e}")
        return False


async def seed_professors():
    """Seed professors catalog."""
    logger.info("Seeding professors catalog...")
    try:
        # Import and run the seeding
        from src.app.core.db.database import local_session
        from src.scripts.seed_professors import seed_professors

        async with local_session() as session:
            await seed_professors(session)

        logger.info("Professors seeding completed")
        return True
    except Exception as e:
        logger.error(f"Professors seeding failed: {e}")
        return False


async def wait_for_db(max_retries=60, delay=2):
    """Wait for database to be ready."""
    logger.info("Waiting for database to be ready...")

    for attempt in range(max_retries):
        try:
            # Try to connect to database
            from sqlalchemy import text

            from src.app.core.db.database import async_engine

            async with async_engine.connect() as conn:
                await conn.execute(text("SELECT 1"))

            logger.info("Database is ready!")
            return True

        except Exception as e:
            logger.info(f"Database not ready yet (attempt {attempt + 1}/{max_retries}): {e}")
            await asyncio.sleep(delay)

    logger.error("Database did not become ready in time")
    return False


async def main():
    """Main initialization function."""
    logger.info("Starting database initialization...")

    # Wait for database
    if not await wait_for_db():
        logger.error("Failed to connect to database")
        sys.exit(1)

    # Run migrations
    if not await run_migrations():
        logger.error("Failed to run migrations")
        sys.exit(1)

    # Create superuser
    if not await create_superuser():
        logger.error("Failed to create superuser")
        sys.exit(1)

    # Seed faculties and schools
    if not await seed_faculties_schools():
        logger.error("Failed to seed faculties and schools")
        sys.exit(1)

    # Seed schedule times
    if not await seed_schedule_times():
        logger.error("Failed to seed schedule times")
        sys.exit(1)

    # Seed subjects
    if not await seed_subjects():
        logger.error("Failed to seed subjects")
        sys.exit(1)

    # Seed professors
    if not await seed_professors():
        logger.error("Failed to seed professors")
        sys.exit(1)

    logger.info("Database initialization completed successfully!")


if __name__ == "__main__":
    asyncio.run(main())
