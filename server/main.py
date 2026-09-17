from contextlib import asynccontextmanager

from arq import create_pool
from fastapi import FastAPI

from routes.ai_route import router as ai_router
from routes.projects import router as projects_router
from utils.redis import redis_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis = await create_pool(redis_settings)
    try:
        yield
    finally:
        await app.state.redis.aclose()


app = FastAPI(lifespan=lifespan)
app.include_router(projects_router)
app.include_router(ai_router)


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
