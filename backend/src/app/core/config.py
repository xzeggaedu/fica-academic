import os
from enum import Enum

from pydantic import EmailStr, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

# ----------------------------------------------------------------------
# Definición de Entornos
# ----------------------------------------------------------------------


class EnvironmentOption(str, Enum):
    """Opciones de entorno para la aplicación."""

    LOCAL = "local"
    STAGING = "staging"
    PRODUCTION = "production"


# ----------------------------------------------------------------------
# Configuración Global de Pydantic
# ----------------------------------------------------------------------


class GlobalSettings(BaseSettings):
    """Configuración base que define cómo pydantic-settings debe buscar variables.

    Prioridad: 1. Entorno (Azure/Sistema) 2. Archivo .env (solo si ENVIRONMENT es 'local') 3. Valores por Defecto
    """

    ENVIRONMENT: EnvironmentOption = EnvironmentOption.LOCAL

    # Usamos os.getenv para obtener el valor de ENVIRONMENT antes de la inicialización de Pydantic.
    _current_env = os.getenv("ENVIRONMENT", EnvironmentOption.LOCAL.value)

    model_config = SettingsConfigDict(
        # Carga el .env SÓLO si el entorno es 'local', tal como lo has configurado en tu .env.
        env_file=".env" if _current_env == EnvironmentOption.LOCAL.value else None,
        env_file_encoding="utf-8",
        case_sensitive=True,
        env_prefix="",
        extra="ignore",  # Ignorar variables extra que no estén definidas
    )


class EnvironmentSettings(GlobalSettings):
    """Configuración específica para el entorno de ejecución.

    Hereda de GlobalSettings para cargar desde el entorno o .env.
    """

    # Pydantic automáticamente mapeará la variable de entorno 'ENVIRONMENT'
    # a este campo y la validará contra los valores del Enum.
    ENVIRONMENT: EnvironmentOption = EnvironmentOption.LOCAL


# ----------------------------------------------------------------------
# Clases de Configuración Específicas
# ----------------------------------------------------------------------


class AppSettings(GlobalSettings):
    # Variables: APP_NAME, APP_DESCRIPTION, APP_VERSION
    APP_NAME: str = "FastAPI app"
    APP_DESCRIPTION: str | None = None
    APP_VERSION: str | None = None
    LICENSE_NAME: str | None = None
    CONTACT_NAME: str | None = None
    CONTACT_EMAIL: EmailStr | None = None


class CryptSettings(GlobalSettings):
    # Variables: SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS
    SECRET_KEY: SecretStr = SecretStr("test-secret-key-for-ci")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ACCESS_TOKEN_EXPIRE_MINUTES_REMEMBER: int = 1440
    REFRESH_TOKEN_EXPIRE_DAYS_REMEMBER: int = 30


class DatabaseSettings(GlobalSettings):
    pass


class SQLiteSettings(DatabaseSettings):
    SQLITE_URI: str = "./sql_app.db"
    SQLITE_SYNC_PREFIX: str = "sqlite:///"
    SQLITE_ASYNC_PREFIX: str = "sqlite+aiosqlite:///"


class MySQLSettings(DatabaseSettings):
    MYSQL_USER: str = "username"
    MYSQL_PASSWORD: SecretStr = SecretStr("password")
    MYSQL_SERVER: str = "localhost"
    MYSQL_PORT: int = 5432
    MYSQL_DB: str = "dbname"
    MYSQL_SYNC_PREFIX: str = "mysql://"
    MYSQL_ASYNC_PREFIX: str = "mysql+aiomysql://"
    MYSQL_URL: str | None = None

    @property
    def MYSQL_URI(self) -> str:
        return (
            f"{self.MYSQL_USER}:{self.MYSQL_PASSWORD.get_secret_value()}"
            f"@{self.MYSQL_SERVER}:{self.MYSQL_PORT}/{self.MYSQL_DB}"
        )


class PostgresSettings(DatabaseSettings):
    # Variables: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_SERVER, POSTGRES_PORT, POSTGRES_DB
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: SecretStr = SecretStr("postgres")
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "postgres"
    POSTGRES_SYNC_PREFIX: str = "postgresql://"
    POSTGRES_ASYNC_PREFIX: str = "postgresql+asyncpg://"
    POSTGRES_URL: str | None = None

    @property
    def POSTGRES_URI(self) -> str:
        return (
            f"{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD.get_secret_value()}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )


class FirstUserSettings(GlobalSettings):
    # Variables: ADMIN_NAME, ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD
    ADMIN_NAME: str = "admin"
    ADMIN_EMAIL: EmailStr = "admin@admin.com"
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: SecretStr = SecretStr("!Ch4ng3Th1sP4ssW0rd!")
    ADMIN_ROLE: str = "admin"


class TestSettings(GlobalSettings):
    pass


class RedisCacheSettings(GlobalSettings):
    # Variables: REDIS_CACHE_HOST, REDIS_CACHE_PORT
    REDIS_CACHE_HOST: str = "localhost"
    REDIS_CACHE_PORT: int = 6379

    @property
    def REDIS_CACHE_URL(self) -> str:
        return f"redis://{self.REDIS_CACHE_HOST}:{self.REDIS_CACHE_PORT}"


class ClientSideCacheSettings(GlobalSettings):
    # Variables: CLIENT_CACHE_MAX_AGE
    CLIENT_CACHE_MAX_AGE: int = 60


class RedisQueueSettings(GlobalSettings):
    # Variables: REDIS_QUEUE_HOST, REDIS_QUEUE_PORT
    REDIS_QUEUE_HOST: str = "localhost"
    REDIS_QUEUE_PORT: int = 6379


class PGAdminSettings(GlobalSettings):
    # Variables: PGADMIN_DEFAULT_EMAIL, PGADMIN_DEFAULT_PASSWORD, PGADMIN_LISTEN_PORT
    PGADMIN_DEFAULT_EMAIL: EmailStr = "admin@admin.com"
    PGADMIN_DEFAULT_PASSWORD: SecretStr = SecretStr("admin")
    PGADMIN_LISTEN_PORT: int = 80


class AbstractSettings(GlobalSettings):
    # Variables: ABSTRACT_EMAIL, ABSTRACT_PASSWORD, ABSTRACT_API_KEY
    ABSTRACT_EMAIL: EmailStr = "abstract@example.com"
    ABSTRACT_PASSWORD: SecretStr = SecretStr("password")
    ABSTRACT_API_KEY: str = "api-key"


class DemoUsersSettings(GlobalSettings):
    """Variables opcionales para demo de usuarios adicionales.

    Si no están presentes, se ignorarán. Esto evita errores de validación cuando el entorno define variables extra no
    usadas por la app principal.
    """

    DEMO_PASSWORD: SecretStr | None = None
    VICERRECTOR_USER: str | None = None
    DECANO_USER: str | None = None
    DIRECTOR_USER: str | None = None
    # Permitir varios DIRECTOR_USER_n opcionales sin romper la validación
    DIRECTOR_USER_1: str | None = None
    DIRECTOR_USER_2: str | None = None
    DIRECTOR_USER_3: str | None = None
    DIRECTOR_USER_4: str | None = None
    DIRECTOR_USER_5: str | None = None
    DIRECTOR_USER_6: str | None = None
    DIRECTOR_USER_7: str | None = None
    DIRECTOR_USER_8: str | None = None
    DIRECTOR_USER_9: str | None = None
    DIRECTOR_USER_10: str | None = None
    DIRECTOR_USER_11: str | None = None
    DIRECTOR_USER_12: str | None = None
    DIRECTOR_USER_13: str | None = None
    DIRECTOR_USER_14: str | None = None
    DIRECTOR_USER_15: str | None = None
    DIRECTOR_USER_16: str | None = None
    DIRECTOR_USER_17: str | None = None
    DIRECTOR_USER_18: str | None = None
    DIRECTOR_USER_19: str | None = None
    DIRECTOR_USER_20: str | None = None


# ----------------------------------------------------------------------
# Clase de Configuración Final
# ----------------------------------------------------------------------


class Settings(
    AppSettings,
    SQLiteSettings,
    PostgresSettings,
    CryptSettings,
    FirstUserSettings,
    TestSettings,
    RedisCacheSettings,
    ClientSideCacheSettings,
    RedisQueueSettings,
    PGAdminSettings,
    AbstractSettings,
    DemoUsersSettings,
    GlobalSettings,
):
    """Clase que consolida todas las configuraciones."""

    pass


settings = Settings()
