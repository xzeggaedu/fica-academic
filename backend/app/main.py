"""Main entry point for the FICA Academic API."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi_limiter import FastAPILimiter
from redis.asyncio import Redis

from app.api.routes import router as api_router


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


@app.get("/")
def root():
    """Welcome root endpoint."""
    return {"message": "Bienvenido a la FICA Academic API V1.0 🚀"}


@app.get("/healthz")
def healthz():
    """Lightweight liveness probe (does not touch external deps)."""
    return {"status": "ok"}


# Register routes
app.include_router(api_router)
