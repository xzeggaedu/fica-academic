import asyncio
import logging
from uuid6 import uuid7 #126
from datetime import UTC, datetime

from sqlalchemy import select

from ..app.core.config import settings
from ..app.core.db.database import AsyncSession, local_session
from ..app.core.security import get_password_hash
from ..app.models.user import User
from ..app.models.role import UserRoleEnum

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def create_first_user(session: AsyncSession) -> None:
    try:
        name = settings.ADMIN_NAME
        email = settings.ADMIN_EMAIL
        username = settings.ADMIN_USERNAME
        hashed_password = get_password_hash(settings.ADMIN_PASSWORD)

        query = select(User).filter_by(email=email)
        result = await session.execute(query)
        user = result.scalar_one_or_none()

        if user is None:
            # Create new user using the User model
            new_user = User(
                name=name,
                email=email,
                username=username,
                hashed_password=hashed_password,
                role=UserRoleEnum.ADMIN.value,  # Use the enum VALUE (not the key)
                profile_image_url="https://profileimageurl.com"
            )
            
            session.add(new_user)
            await session.commit()

            logger.info(f"Admin user {username} created successfully.")

        else:
            logger.info(f"Admin user {username} already exists.")

    except Exception as e:
        logger.error(f"Error creating admin user: {e}")


async def main():
    async with local_session() as session:
        await create_first_user(session)


if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(main())
