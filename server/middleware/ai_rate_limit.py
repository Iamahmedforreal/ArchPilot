import re

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from routes.auth import get_current_user_id
from service.rate_limit_service import (
    RateLimitStorageError,
    consume_ai_rate_limit,
)


AI_GENERATION_PATH = re.compile(r"^/api/projects/[^/]+/ai/(design|spec)$")


def is_ai_generation_request(request: Request) -> bool:
    return request.method == "POST" and AI_GENERATION_PATH.fullmatch(request.url.path) is not None


class AIRateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        if not is_ai_generation_request(request):
            return await call_next(request)

        user_id = await get_current_user_id(request)
        try:
            allowed = await consume_ai_rate_limit(request.app.state.redis, user_id)
        except RateLimitStorageError:
            return JSONResponse(
                status_code=503,
                content={"detail": "AI rate limit service is unavailable."},
            )

        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "AI request rate limit exceeded. Please try again shortly."
                },
            )

        return await call_next(request)
