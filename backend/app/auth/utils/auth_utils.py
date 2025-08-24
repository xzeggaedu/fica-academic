# app/auth/utils/auth_utils.py
from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta
from typing import Optional

from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config_loader import settings
from app.user.models.user import RefreshToken, User

# -------------------------------------------------------------------
# Password hashing utilities
# OWASP recomienda funciones de hash adaptativas y saladas como Argon2
# (incluyendo Argon2id) para almacenar contraseñas de forma
# segura:contentReference[oaicite:4]{index=4}.
# -------------------------------------------------------------------
_pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(password: str) -> str:
    """Devuelve un hash Argon2id de la contraseña en texto plano."""
    return _pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica que la contraseña en texto plano coincide con el hash."""
    return _pwd_context.verify(plain_password, hashed_password)


# -------------------------------------------------------------------
# JWT utilities
# Los access tokens deben ser de corta duración (5–15 minutos) y los
# refresh tokens de duración más larga (hasta ~7 días):
# :contentReference[oaicite:5]{index=5}.
# -------------------------------------------------------------------
JWT_SECRET_KEY = settings.JWT_SECRET_KEY
JWT_ALGORITHM = "HS256"  # se podría parametrizar en config

ACCESS_TOKEN_EXPIRE_MINUTES: int = 15  # configurable
REFRESH_TOKEN_EXPIRE_DAYS: int = 7  # configurable


def create_access_token(
    subject: str, expires_delta: Optional[timedelta] = None
) -> str:  # noqa: E501
    """
    Genera un access token JWT para el usuario identificado por `subject`.
    """
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode = {"sub": subject, "exp": expire}
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict[str, str]:
    """
    Decodifica un access token. Lanza JWTError si no es válido o expirado.
    Retorna el payload como un diccionario.
    """
    return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])


# -------------------------------------------------------------------
# Refresh token utilities
# Para minimizar la superficie de ataque, nunca se guarda el token de
# refresco en texto claro; se almacena un hash con pepper secreto.
# -------------------------------------------------------------------
def generate_refresh_token() -> str:
    """Genera un token de refresco aleatorio."""
    # 32 bytes generados de forma segura (256 bits) y codificados en Base64URL
    return secrets.token_urlsafe(64)


def _get_refresh_pepper() -> bytes:
    """
    Devuelve un valor secreto (pepper) para mezclar con el token
    antes de calcular el hash. Se reutiliza la clave JWT como pepper
    o se podría definir otro valor en el .env.
    """
    return JWT_SECRET_KEY.encode()


def hash_refresh_token(raw_token: str) -> str:
    """
    Calcula un SHA256 del token de refresco concatenado con un pepper.
    Se usa HMAC.compare_digest para evitar ataques de timing durante la
    comparación.
    """
    peppered = raw_token.encode() + _get_refresh_pepper()
    digest = hashlib.sha256(peppered).hexdigest()
    return digest


def verify_refresh_token(token: str, stored_hash: str) -> bool:
    """
    Comprueba que el hash del token coincide con el hash almacenado.
    Utiliza comparación constante para mitigar ataques de timing.
    """
    candidate_hash = hash_refresh_token(token)
    return hmac.compare_digest(
        candidate_hash,
        stored_hash,
    )


def persist_refresh_token(
    db: Session, user: User, raw_token: str
) -> RefreshToken:  # noqa: E501
    """
    Guarda un nuevo refresh token en la base de datos:
    - Calcula el hash del token.
    - Define la expiración en epoch (segundos).
    """
    hashed = hash_refresh_token(raw_token)
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    epoch = int(expires_at.timestamp())
    db_obj = RefreshToken(
        user_id=user.id,
        refresh_hash=hashed,
        exp_epoch=epoch,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj
