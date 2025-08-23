# To-Do List: Migraciones y Autenticación

## Preparación del Proyecto

- [ ] **Estructura base del repo** (FastAPI + SQLAlchemy async + Alembic + Redis client + pytest).
- [ ] **Variables de entorno y secrets** (`DATABASE_URL`, `JWT_SECRET`, `JWT_ALG`, `ACCESS_TTL`, `REFRESH_TTL`, `REDIS_URL`).
- [ ] **Docker Compose (dev/test)**: servicios de `api`, `postgres`, `redis`; perfiles y `Makefile` con comandos básicos (run, test, migrate).

## Datos y Migraciones

- [ ] **Modelo de usuarios** (tabla `users`: id, email único, hash_argon2id, is_active, created_at).
- [ ] **Modelo de roles** y **tabla puente user_roles** (roles: admin, director, decano, vicerrector).
- [ ] **Tabla de refresh tokens** (id, user_id, **refresh_hash**, exp, created_at, revoked_at/null).
- [ ] **Script Alembic inicial** (crear las tablas anteriores).
- [ ] **Pipeline de migraciones**: comando único `alembic upgrade head` ejecutado al iniciar el contenedor.

## Seguridad Básica

- [ ] **Hash de contraseñas con Argon2id** (passlib configurado).
- [ ] **Generación/verificación de JWT** (access y refresh) con `python-jose`.
- [ ] **Rate limiting** en `/auth/login` y `/auth/register` (fastapi-limiter + Redis).
- [ ] **CORS y headers** mínimos (orígenes permitidos, `X-RateLimit-*`).

## Endpoints de Autenticación

- [ ] **POST `/auth/register`**: crear usuario (hash Argon2id), asignar rol base.
- [ ] **POST `/auth/login`**: validar credenciales, emitir **access** (5–15 min) y **guardar refresh hasheado** (7–30 días).
- [ ] **POST `/auth/refresh`**: validar refresh (comparar hash), emitir nuevo access.
- [ ] **POST `/auth/logout`**: marcar refresh como **revocado** (revoked_at) y opcionalmente setear `logout_timestamp` en Redis para invalidar access previos por usuario.

## Autorización (RBAC)

- [ ] **Dependencias/reutilizables**: `get_current_user` (solo access token válido).
- [ ] **Decorator/Dependency por rol**: `require_role("decano")`, etc.
- [ ] **Ruta protegida de ejemplo** por rol para validar el flujo.

## Auditoría y Trazabilidad

- [ ] **Tabla `auth_audit`** (user_id, evento: login/refresh/logout/fallo, ip, ua, timestamp).
- [ ] **Hooks simples**: registrar evento en cada endpoint de auth.

## Testing

- [ ] **Unit tests**: hashing, creación de JWT, expiración, parse de claims.
- [ ] **Tests de integración** (con `TestClient` + DB/Redis efímeros): register/login/refresh/logout, revocación, rate limit, acceso por rol.
- [ ] **Datos semilla** (roles y un admin) para pruebas locales.

## CI Mínima

- [ ] **Pipeline**: lint + tests + build imagen + `alembic upgrade head` contra DB temporal.
- [ ] **Reporte** de tests y cobertura básica.

## Endgame (Hardening Liviano)

- [ ] **Rotación de claves** (soporte para `kid` opcional; documentar proceso).
- [ ] **Política de contraseñas** (longitud mínima y verificación).
- [ ] **Backups DB** (nota operativa simple) y **monitoreo de Redis** básico.
- [ ] **Documentación breve** (README con variables, make targets, diagramita de flujo auth).
