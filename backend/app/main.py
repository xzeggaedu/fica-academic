"""Main entry point for the FICA Academic API."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi_limiter import FastAPILimiter
from redis.asyncio import Redis
from starlette.middleware.cors import CORSMiddleware

# from app.auth.routes.auth_router import auth_router
from app.core.config_loader import settings
from app.user.routes.user_router import user_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # ---- Startup ----
    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        raise RuntimeError("REDIS_URL is not set")

    redis = Redis.from_url(redis_url, encoding="utf-8", decode_responses=True)
    await FastAPILimiter.init(redis)

    # Store redis instance in app.state for reuse
    _app.state.redis = redis

    yield  # <-- Here the application runs

    # ---- Shutdown ----
    redis: Redis | None = getattr(_app.state, "redis", None)
    if redis is not None:
        await redis.close()
    await FastAPILimiter.close()


app = FastAPI(
    title="FICA Academic API",
    description="API para la generación de estadísticos",
    version="0.1.0",
    lifespan=lifespan,  # 👈 reemplazo de on_event
)


if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            str(origin).strip("/") for origin in settings.BACKEND_CORS_ORIGINS
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# app.include_router(auth_router, prefix="/api")
app.include_router(user_router, prefix="/api", tags=["Users"])


@app.get("/health", tags=["Health Checks"])
def read_root():
    return {"health": "true"}
