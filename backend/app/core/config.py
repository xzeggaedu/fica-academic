"""Global environment configuration for FICA Academic API."""

import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Global configuration class for the API."""

    PROJECT_NAME: str = "FICA Academic API"
    PROJECT_VERSION: str = "0.1.0"
    DATABASE_URL: str = os.getenv("DATABASE_URL")


settings = Settings()
