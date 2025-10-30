"""Application setup and configuration module.

This module provides functions to create and configure FastAPI applications with database initialization, Redis
connections, and middleware setup.
"""

import logging
from collections.abc import AsyncGenerator, Callable
from contextlib import _AsyncGeneratorContextManager, asynccontextmanager
from typing import Any

import anyio
import fastapi
import redis.asyncio as redis
from arq import create_pool
from arq.connections import RedisSettings
from fastapi import APIRouter, Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_redoc_html, get_swagger_ui_html
from fastapi.openapi.utils import get_openapi

from ..api.dependencies import get_current_superuser
from ..middleware.client_cache_middleware import ClientCacheMiddleware
from .config import (
    AppSettings,
    ClientSideCacheSettings,
    DatabaseSettings,
    EnvironmentOption,
    EnvironmentSettings,
    RedisCacheSettings,
    RedisQueueSettings,
    settings,
)
from .db.database import Base
from .db.database import async_engine as engine
from .utils import cache, queue

logger = logging.getLogger(__name__)


# =============================================================================
# DATABASE FUNCTIONS
# =============================================================================


async def create_tables() -> None:
    """Create all database tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def check_database_population() -> bool:
    """Check if database is already populated with data."""
    try:
        from src.app.core.db.database import local_session
        from src.app.crud.crud_academic_level import count_academic_levels

        async with local_session() as session:
            count = await count_academic_levels(session, include_deleted=False)
            return count > 0
    except Exception as e:
        logger.warning(f"Could not check database population: {e}")
        return False


async def run_seeders() -> None:
    """Run database seeders to populate initial data."""
    try:
        logger.info("Starting database seeding...")

        # Import seeder functions
        from src.app.core.db.database import local_session
        from src.scripts.create_first_superuser import create_first_user
        from src.scripts.seed_academic_levels import seed_academic_levels
        from src.scripts.seed_coordinations import seed_coordinations
        from src.scripts.seed_demo_users import seed_demo_users
        from src.scripts.seed_faculties_schools import create_faculty_and_schools
        from src.scripts.seed_fixed_holiday_rules import seed_fixed_holiday_rules
        from src.scripts.seed_holidays import seed_holidays
        from src.scripts.seed_hourly_rates import seed_hourly_rates
        from src.scripts.seed_professors import seed_professors
        from src.scripts.seed_schedule_times import seed_schedule_times
        from src.scripts.seed_subjects import seed_subjects
        from src.scripts.seed_terms import seed_terms

        async with local_session() as session:
            # Execute seeders in dependency order
            # First, create the super admin user
            await create_first_user(session)
            logger.info("✓ Super admin user created")

            await seed_academic_levels(session)
            logger.info("✓ Academic levels seeded")

            await seed_hourly_rates(session)
            logger.info("✓ Hourly rates seeded")

            await create_faculty_and_schools(session)
            logger.info("✓ Faculties and schools seeded")

            await seed_professors(session)
            logger.info("✓ Professors seeded")

            await seed_coordinations(session)
            logger.info("✓ Coordinations seeded")

            await seed_subjects(session)
            logger.info("✓ Subjects seeded")

            await seed_schedule_times(session)
            logger.info("✓ Schedule times seeded")

            # Usuarios demo (requiere FACULTAD/ESCUELAS previas)
            await seed_demo_users(session)
            logger.info("✓ Demo users seeded")

            await seed_terms(session)
            logger.info("✓ Terms seeded")

            await seed_fixed_holiday_rules(session)
            logger.info("✓ Fixed holiday rules seeded")

            await seed_holidays(session)
            logger.info("✓ Holidays seeded")

        logger.info("🎉 All seeders completed successfully!")

    except Exception as e:
        logger.error(f"Error running seeders: {e}")
        raise


async def initialize_database() -> None:
    """Initialize database with tables and seeders if needed."""
    await create_tables()

    # Only run seeders if database is empty
    if not await check_database_population():
        logger.info("Database is empty, running seeders...")
        await run_seeders()
    else:
        logger.info("Database already populated, skipping seeders")


# =============================================================================
# REDIS FUNCTIONS
# =============================================================================


async def create_redis_cache_pool() -> None:
    """Create Redis cache connection pool."""
    cache.pool = redis.ConnectionPool.from_url(settings.REDIS_CACHE_URL)
    cache.client = redis.Redis.from_pool(cache.pool)  # type: ignore


async def close_redis_cache_pool() -> None:
    """Close Redis cache connection pool."""
    if cache.client is not None:
        await cache.client.aclose()  # type: ignore


async def create_redis_queue_pool() -> None:
    """Create Redis queue connection pool."""
    queue.pool = await create_pool(RedisSettings(host=settings.REDIS_QUEUE_HOST, port=settings.REDIS_QUEUE_PORT))


async def close_redis_queue_pool() -> None:
    """Close Redis queue connection pool."""
    if queue.pool is not None:
        await queue.pool.aclose()  # type: ignore


# =============================================================================
# APPLICATION LIFECYCLE
# =============================================================================


async def set_threadpool_tokens(number_of_tokens: int = 100) -> None:
    """Configure thread pool tokens for async operations."""
    limiter = anyio.to_thread.current_default_thread_limiter()
    limiter.total_tokens = number_of_tokens


def lifespan_factory(
    settings: (
        DatabaseSettings
        | RedisCacheSettings
        | AppSettings
        | ClientSideCacheSettings
        | RedisQueueSettings
        | EnvironmentSettings
    ),
    create_tables_on_start: bool = True,
) -> Callable[[FastAPI], _AsyncGeneratorContextManager[Any]]:
    """Factory to create a lifespan async context manager for a FastAPI app."""

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncGenerator:
        from asyncio import Event

        initialization_complete = Event()
        app.state.initialization_complete = initialization_complete

        try:
            # Configure thread pool
            await set_threadpool_tokens()

            # Initialize Redis connections
            if isinstance(settings, RedisCacheSettings):
                await create_redis_cache_pool()

            if isinstance(settings, RedisQueueSettings):
                await create_redis_queue_pool()

            # Initialize database
            if create_tables_on_start:
                await initialize_database()

            initialization_complete.set()
            yield

        finally:
            # Cleanup Redis connections
            if isinstance(settings, RedisCacheSettings):
                await close_redis_cache_pool()

            if isinstance(settings, RedisQueueSettings):
                await close_redis_queue_pool()

    return lifespan


# =============================================================================
# APPLICATION CREATION
# =============================================================================


def create_application(
    router: APIRouter,
    settings: (
        DatabaseSettings
        | RedisCacheSettings
        | AppSettings
        | ClientSideCacheSettings
        | RedisQueueSettings
        | EnvironmentSettings
    ),
    create_tables_on_start: bool = True,
    lifespan: Callable[[FastAPI], _AsyncGeneratorContextManager[Any]] | None = None,
    **kwargs: Any,
) -> FastAPI:
    """Create and configure a FastAPI application.

    Args:
        router: APIRouter containing the application routes
        settings: Settings object for configuration
        create_tables_on_start: Whether to create database tables on startup
        lifespan: Custom lifespan function (optional)
        **kwargs: Additional arguments for FastAPI constructor

    Returns:
        Configured FastAPI application instance
    """
    # Configure app metadata
    if isinstance(settings, AppSettings):
        kwargs.update(
            {
                "title": settings.APP_NAME,
                "description": settings.APP_DESCRIPTION,
                "contact": {"name": settings.CONTACT_NAME, "email": settings.CONTACT_EMAIL},
                "license_info": {"name": settings.LICENSE_NAME},
            }
        )

    # Configure documentation URLs based on environment
    if isinstance(settings, EnvironmentSettings):
        kwargs.update({"docs_url": None, "redoc_url": None, "openapi_url": None})

    # Use custom lifespan if provided, otherwise use default factory
    if lifespan is None:
        lifespan = lifespan_factory(settings, create_tables_on_start=create_tables_on_start)

    # Create FastAPI application
    application = FastAPI(lifespan=lifespan, **kwargs)

    # Add CORS middleware
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",  # Frontend original
            "http://localhost:3001",  # Frontend2.0 (Refine)
            "http://localhost:5173",  # Vite dev server
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include main router
    application.include_router(router)

    # Add exception handlers
    from fastapi import Request, status
    from fastapi.responses import JSONResponse
    from fastcrud.exceptions.http_exceptions import (
        DuplicateValueException,
        ForbiddenException,
        NotFoundException,
        UnauthorizedException,
    )

    @application.exception_handler(UnauthorizedException)
    async def unauthorized_exception_handler(request: Request, exc: UnauthorizedException):
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": str(exc.detail) if hasattr(exc, "detail") else str(exc)},
        )

    @application.exception_handler(ForbiddenException)
    async def forbidden_exception_handler(request: Request, exc: ForbiddenException):
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"detail": str(exc.detail) if hasattr(exc, "detail") else str(exc)},
        )

    @application.exception_handler(NotFoundException)
    async def not_found_exception_handler(request: Request, exc: NotFoundException):
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"detail": str(exc.detail) if hasattr(exc, "detail") else str(exc)},
        )

    @application.exception_handler(DuplicateValueException)
    async def duplicate_exception_handler(request: Request, exc: DuplicateValueException):
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"detail": str(exc.detail) if hasattr(exc, "detail") else str(exc)},
        )

    # Add client-side caching middleware
    if isinstance(settings, ClientSideCacheSettings):
        application.add_middleware(ClientCacheMiddleware, max_age=settings.CLIENT_CACHE_MAX_AGE)

    # Configure documentation routes for non-production environments
    if isinstance(settings, EnvironmentSettings):
        if settings.ENVIRONMENT != EnvironmentOption.PRODUCTION:
            docs_router = APIRouter()

            # Add authentication requirement for non-local environments
            if settings.ENVIRONMENT != EnvironmentOption.LOCAL:
                docs_router = APIRouter(dependencies=[Depends(get_current_superuser)])

            @docs_router.get("/docs", include_in_schema=False)
            async def get_swagger_documentation() -> fastapi.responses.HTMLResponse:
                return get_swagger_ui_html(openapi_url="/openapi.json", title="docs")

            @docs_router.get("/redoc", include_in_schema=False)
            async def get_redoc_documentation() -> fastapi.responses.HTMLResponse:
                return get_redoc_html(openapi_url="/openapi.json", title="docs")

            @docs_router.get("/openapi.json", include_in_schema=False)
            async def openapi() -> dict[str, Any]:
                return get_openapi(
                    title=application.title,
                    version=application.version,
                    routes=application.routes,
                )

            application.include_router(docs_router)

    return application
