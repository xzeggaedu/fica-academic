from datetime import UTC, datetime, timedelta
from enum import Enum
from typing import Any, Literal, cast

from argon2 import PasswordHasher
from argon2.low_level import Type as Argon2Type
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import SecretStr
from sqlalchemy.ext.asyncio import AsyncSession

from ..crud.crud_users import crud_users
from .config import settings
from .schemas import TokenData
from .utils.redis_blacklist import add_token_to_blacklist, is_token_blacklisted

SECRET_KEY: SecretStr = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = settings.REFRESH_TOKEN_EXPIRE_DAYS
ACCESS_TOKEN_EXPIRE_MINUTES_REMEMBER = settings.ACCESS_TOKEN_EXPIRE_MINUTES_REMEMBER
REFRESH_TOKEN_EXPIRE_DAYS_REMEMBER = settings.REFRESH_TOKEN_EXPIRE_DAYS_REMEMBER

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/login")


class TokenType(str, Enum):
    ACCESS = "access"
    REFRESH = "refresh"


# Configure Argon2id hasher
_pwd_context = PasswordHasher(
    time_cost=3,
    memory_cost=64 * 1024,  # 64 MiB
    parallelism=2,
    hash_len=32,
    salt_len=16,
    type=Argon2Type.ID,
)


async def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        _pwd_context.verify(hashed_password, plain_password)
        return True
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    return _pwd_context.hash(password)


async def authenticate_user(username_or_email: str, password: str, db: AsyncSession) -> dict[str, Any] | Literal[False]:
    if "@" in username_or_email:
        db_user = await crud_users.get(db=db, email=username_or_email, is_deleted=False)
    else:
        db_user = await crud_users.get(db=db, username=username_or_email, is_deleted=False)

    if not db_user:
        return False

    db_user = cast(dict[str, Any], db_user)
    if not await verify_password(password, db_user["hashed_password"]):
        return False

    return db_user


async def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(UTC).replace(tzinfo=None) + expires_delta
    else:
        expire = datetime.now(UTC).replace(tzinfo=None) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "token_type": TokenType.ACCESS})
    encoded_jwt: str = jwt.encode(to_encode, SECRET_KEY.get_secret_value(), algorithm=ALGORITHM)
    return encoded_jwt


async def create_refresh_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(UTC).replace(tzinfo=None) + expires_delta
    else:
        expire = datetime.now(UTC).replace(tzinfo=None) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "token_type": TokenType.REFRESH})
    encoded_jwt: str = jwt.encode(to_encode, SECRET_KEY.get_secret_value(), algorithm=ALGORITHM)
    return encoded_jwt


async def create_access_token_with_rbac(user_data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Create an access token with RBAC claims.

    Parameters
    ----------
    user_data : dict[str, Any]
        User data dictionary containing user information
    expires_delta : timedelta | None
        Token expiration time

    Returns
    -------
    str
        Encoded JWT token with RBAC claims
    """
    to_encode = {
        "sub": user_data["username"],  # Subject (username)
        "user_uuid": str(user_data["uuid"]),  # User UUID
        "email": user_data["email"],  # User email
        "name": user_data["name"],  # User full name
        "role": user_data["role"],  # User role for RBAC
        "is_deleted": user_data.get(
            "deleted", user_data.get("is_deleted", False)
        ),  # Account status (compatibilidad con ambos nombres)
    }

    if expires_delta:
        expire = datetime.now(UTC).replace(tzinfo=None) + expires_delta
    else:
        expire = datetime.now(UTC).replace(tzinfo=None) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "token_type": TokenType.ACCESS})
    encoded_jwt: str = jwt.encode(to_encode, SECRET_KEY.get_secret_value(), algorithm=ALGORITHM)
    return encoded_jwt


async def create_refresh_token_with_rbac(user_data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Create a refresh token with minimal RBAC claims.

    Parameters
    ----------
    user_data : dict[str, Any]
        User data dictionary containing user information
    expires_delta : timedelta | None
        Token expiration time

    Returns
    -------
    str
        Encoded JWT refresh token with minimal RBAC claims
    """
    to_encode = {
        "sub": user_data["username"],  # Subject (username)
        "user_uuid": str(user_data["uuid"]),  # User UUID
        "role": user_data["role"],  # User role for RBAC
    }

    if expires_delta:
        expire = datetime.now(UTC).replace(tzinfo=None) + expires_delta
    else:
        expire = datetime.now(UTC).replace(tzinfo=None) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode.update({"exp": expire, "token_type": TokenType.REFRESH})
    encoded_jwt: str = jwt.encode(to_encode, SECRET_KEY.get_secret_value(), algorithm=ALGORITHM)
    return encoded_jwt


async def verify_token_with_rbac(token: str, expected_token_type: TokenType, db: AsyncSession) -> dict[str, Any] | None:
    """Verify a JWT token and return RBAC claims if valid.

    Parameters
    ----------
    token: str
        The JWT token to be verified.
    expected_token_type: TokenType
        The expected type of token (access or refresh)
    db: AsyncSession
        Database session for performing database operations.

    Returns
    -------
    dict[str, Any] | None
        Dictionary containing RBAC claims if the token is valid, None otherwise.
    """
    # Verificar blacklist en Redis en lugar de PostgreSQL
    blacklisted = await is_token_blacklisted(token)
    if blacklisted:
        return None

    try:
        payload = jwt.decode(token, SECRET_KEY.get_secret_value(), algorithms=[ALGORITHM])
        username_or_email: str | None = payload.get("sub")
        token_type: str | None = payload.get("token_type")

        if username_or_email is None or token_type != expected_token_type:
            return None

        # Extract RBAC claims
        rbac_claims = {
            "username_or_email": username_or_email,
            "user_uuid": payload.get("user_uuid"),
            "email": payload.get("email"),
            "name": payload.get("name"),
            "role": payload.get("role"),
            "is_deleted": payload.get("is_deleted"),
        }

        return rbac_claims

    except JWTError:
        return None


async def verify_token(token: str, expected_token_type: TokenType, db: AsyncSession) -> TokenData | None:
    """Verify a JWT token and return TokenData if valid.

    Parameters
    ----------
    token: str
        The JWT token to be verified.
    expected_token_type: TokenType
        The expected type of token (access or refresh)
    db: AsyncSession
        Database session for performing database operations.

    Returns
    -------
    TokenData | None
        TokenData instance if the token is valid, None otherwise.
    """
    # Verificar blacklist en Redis en lugar de PostgreSQL
    blacklisted = await is_token_blacklisted(token)
    if blacklisted:
        return None

    try:
        payload = jwt.decode(token, SECRET_KEY.get_secret_value(), algorithms=[ALGORITHM])
        username_or_email: str | None = payload.get("sub")
        token_type: str | None = payload.get("token_type")

        if username_or_email is None or token_type != expected_token_type:
            return None

        return TokenData(username_or_email=username_or_email)

    except JWTError:
        return None


async def blacklist_tokens(access_token: str, refresh_token: str, db: AsyncSession) -> None:
    """Blacklist both access and refresh tokens using Redis.

    Parameters
    ----------
    access_token: str
        The access token to blacklist
    refresh_token: str
        The refresh token to blacklist
    db: AsyncSession
        Database session for performing database operations (no longer usado, mantenido para compatibilidad).
    """
    for token in [access_token, refresh_token]:
        payload = jwt.decode(token, SECRET_KEY.get_secret_value(), algorithms=[ALGORITHM])
        exp_timestamp = payload.get("exp")
        if exp_timestamp is not None:
            # Calcular tiempo restante hasta expiración
            expires_at = datetime.fromtimestamp(exp_timestamp)
            now = datetime.now(UTC).replace(tzinfo=None)
            seconds_until_expiry = int((expires_at - now).total_seconds())

            # Solo agregar a blacklist si el token aún no ha expirado
            if seconds_until_expiry > 0:
                await add_token_to_blacklist(token, seconds_until_expiry)


async def blacklist_token(token: str, db: AsyncSession) -> None:
    """Blacklist a single token using Redis.

    Parameters
    ----------
    token: str
        The token to blacklist
    db: AsyncSession
        Database session for performing database operations (no longer usado, mantenido para compatibilidad).
    """
    payload = jwt.decode(token, SECRET_KEY.get_secret_value(), algorithms=[ALGORITHM])
    exp_timestamp = payload.get("exp")
    if exp_timestamp is not None:
        # Calcular tiempo restante hasta expiración
        expires_at = datetime.fromtimestamp(exp_timestamp)
        now = datetime.now(UTC).replace(tzinfo=None)
        seconds_until_expiry = int((expires_at - now).total_seconds())

        # Solo agregar a blacklist si el token aún no ha expirado
        if seconds_until_expiry > 0:
            await add_token_to_blacklist(token, seconds_until_expiry)
