# app/auth/services/auth_service.py
from __future__ import annotations

from datetime import datetime
from typing import Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.auth.utils.auth_utils import (
    create_access_token,
    generate_refresh_token,
    persist_refresh_token,
    verify_password,
    verify_refresh_token,
)
from app.user.models.user import AuthAudit, AuthEventEnum, RefreshToken, User
from app.user.schemas.user import UserCreate
from app.user.services.user_service import UserService


class AuthService:
    """Servicio de autenticación basado en JWT y refresh tokens."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def register_user(
        self,
        schema: UserCreate,
        ip: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Tuple[str, str]:
        """
        Registra un nuevo usuario. Se valida que el correo no esté en uso,
        se crea el usuario a través de UserService (hasheando la contraseña),
        se emiten tokens y se registra la auditoría correspondiente.
        """
        user_svc = UserService(self.db)
        if user_svc.get_by_email(schema.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        # Crear usuario. Si schema.role es None,
        # UserService asigna el rol por defecto.
        new_user = user_svc.create(schema)

        # Emitir tokens
        access_token = create_access_token(str(new_user.id))
        raw_refresh = generate_refresh_token()
        persist_refresh_token(self.db, new_user, raw_refresh)

        # Registrar auditoría
        self._log_event(new_user.id, AuthEventEnum.LOGIN, ip, user_agent)
        return access_token, raw_refresh

    def authenticate(
        self,
        email: str,
        password: str,
        ip: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Tuple[str, str]:
        """
        Autentica a un usuario por sus credenciales. Si el correo y la
        contraseña son correctos, emite nuevos tokens y registra el inicio
        de sesión. En caso contrario, registra un intento fallido.
        """
        user_svc = UserService(self.db)
        user = user_svc.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            # Evento de autenticación fallido
            self._log_event(
                user.id if user else None, AuthEventEnum.FAIL, ip, user_agent
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
            )
        # Credenciales válidas: emitir tokens
        access_token = create_access_token(str(user.id))
        raw_refresh = generate_refresh_token()
        persist_refresh_token(self.db, user, raw_refresh)

        self._log_event(user.id, AuthEventEnum.LOGIN, ip, user_agent)
        return access_token, raw_refresh

    def refresh(
        self,
        user: User,
        refresh_token: str,
        ip: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Tuple[str, str]:
        """
        Intercambia un refresh token válido por un nuevo par de tokens.
        Se verifica que el token no esté revocado ni expirado y que su hash
        coincida con el almacenado. Luego se revoca el token usado y se
        registra el evento de refresh.
        """
        now_epoch = int(datetime.utcnow().timestamp())
        valid_rt: Optional[RefreshToken] = None
        # Buscar un token de refresco válido asociado al usuario
        for rt in user.refresh_tokens:
            if rt.revoked_at or rt.exp_epoch < now_epoch:
                continue
            if verify_refresh_token(refresh_token, rt.refresh_hash):
                valid_rt = rt
                break
        if not valid_rt:
            self._log_event(user.id, AuthEventEnum.FAIL, ip, user_agent)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )
        # Revocar el token actual
        valid_rt.revoked_at = datetime.utcnow()
        self.db.add(valid_rt)
        self.db.commit()

        # Emitir nuevos tokens
        access_token = create_access_token(str(user.id))
        new_refresh = generate_refresh_token()
        persist_refresh_token(self.db, user, new_refresh)

        self._log_event(user.id, AuthEventEnum.REFRESH, ip, user_agent)
        return access_token, new_refresh

    def logout(
        self,
        user: User,
        refresh_token: str,
        ip: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> None:
        """
        Revoca explícitamente un refresh token,
        registrando un evento de logout.
        """
        now_epoch = int(datetime.utcnow().timestamp())
        target_rt: Optional[RefreshToken] = None
        for rt in user.refresh_tokens:
            if rt.revoked_at or rt.exp_epoch < now_epoch:
                continue
            if verify_refresh_token(refresh_token, rt.refresh_hash):
                target_rt = rt
                break
        if not target_rt:
            self._log_event(user.id, AuthEventEnum.FAIL, ip, user_agent)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )
        # Revocar token y registrar logout
        target_rt.revoked_at = datetime.utcnow()
        self.db.add(target_rt)
        self.db.commit()
        self._log_event(user.id, AuthEventEnum.LOGOUT, ip, user_agent)

    # -----------------------------------------------------------------
    # Método auxiliar privado para registrar eventos de auditoría
    # -----------------------------------------------------------------
    def _log_event(
        self,
        user_id: Optional[int],
        event: AuthEventEnum,
        ip: Optional[str],
        user_agent: Optional[str],
    ) -> None:
        audit = AuthAudit(
            user_id=user_id,
            event=event,
            ip=ip,
            user_agent=user_agent,
        )
        self.db.add(audit)
        self.db.commit()
