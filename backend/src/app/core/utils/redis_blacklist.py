"""Utilidad para gestionar token blacklist usando Redis.

Este módulo proporciona funciones para agregar y verificar tokens en la blacklist usando Redis como almacenamiento
temporal con TTL automático.
"""

from ..utils.cache import client as redis_client


async def add_token_to_blacklist(token: str, expires_in_seconds: int) -> None:
    """Agregar un token a la blacklist en Redis con TTL.

    Args:
    ----
        token: El token JWT a agregar a la blacklist
        expires_in_seconds: Tiempo en segundos hasta que expire el token

    Note:
    ----
        Redis eliminará automáticamente el token cuando expire el TTL.
        Si Redis no está disponible, la operación se omite silenciosamente.
    """
    # Verificación directa sin esperas ni timeouts
    if redis_client is None:
        # Redis no está disponible, omitir silenciosamente
        return

    # Usar el token como clave con prefijo para organización
    key = f"blacklist:token:{token}"

    # Guardar con TTL (Time To Live)
    # El valor "1" es solo un marcador, lo importante es la existencia de la clave
    try:
        await redis_client.setex(key, expires_in_seconds, "1")
    except Exception:
        # Si falla la escritura, omitir silenciosamente
        # Los tokens expirarán naturalmente por su TTL
        pass


async def is_token_blacklisted(token: str) -> bool:
    """Verificar si un token está en la blacklist.

    Args:
    ----
        token: El token JWT a verificar

    Returns:
    -------
        True si el token está en la blacklist, False en caso contrario.
        Si Redis no está disponible, retorna False (no blacklisted).
    """
    # Verificación directa sin esperas ni timeouts
    if redis_client is None:
        # Redis no está disponible, asumir que el token no está blacklisted
        return False

    key = f"blacklist:token:{token}"

    try:
        return await redis_client.exists(key) > 0
    except Exception:
        # Si falla la lectura, asumir que el token no está blacklisted
        return False


async def remove_token_from_blacklist(token: str) -> None:
    """Remover un token de la blacklist manualmente (uso poco común).

    Args:
    ----
        token: El token JWT a remover de la blacklist

    Note:
    ----
        Normalmente no es necesario llamar esta función ya que Redis
        elimina automáticamente las claves cuando expira el TTL.
    """
    # Verificación directa sin esperas ni timeouts
    if redis_client is None:
        # Redis no está disponible, omitir silenciosamente
        return

    key = f"blacklist:token:{token}"

    try:
        await redis_client.delete(key)
    except Exception:
        # Si falla la eliminación, omitir silenciosamente
        pass
