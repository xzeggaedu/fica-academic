import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    PROJECT_NAME: str = "FICA Academic API"
    PROJECT_VERSION: str = "0.1.0"
    DATABASE_URL: str = os.getenv("DATABASE_URL")


settings = Settings()
