from contextlib import asynccontextmanager

from arq import create_pool
from fastapi import FastAPI
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from routes.ai_route import router as ai_router
from routes.projects import router as projects_router
from utils.redis import redis_settings 
from utils.user_address import get_user_address
from utils.utils import settings
from fastapi.middleware.cors import CORSMiddleware


limiter = Limiter(
    key_func=get_user_address,
    default_limits=["5/3minutes"],
)

#redis connection pool
@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis = await create_pool(redis_settings)
    try:
        yield
    finally:
        await app.state.redis.aclose()


app = FastAPI(lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

origins_allowed=[
    "http://localhost:5173",
    "https://archpilot.com"
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins_allowed,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization" , "content-type"],
)


#routes
app.include_router(projects_router)
app.include_router(ai_router)

#health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}
