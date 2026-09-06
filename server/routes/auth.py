import logging
from time import perf_counter

from clerk_backend_api import Clerk
from clerk_backend_api.security.types import AuthenticateRequestOptions
from fastapi import HTTPException, Request, status

from utils.utils import settings


logger = logging.getLogger(__name__)


async def get_current_user_id(
    request: Request,
) -> str:
    started_at = perf_counter()
    authorization = request.headers.get("Authorization")
    session_cookie = request.cookies.get("__session")
    if not authorization and not session_cookie:
        logger.info(
            "auth.missing_credentials duration_ms=%.2f",
            (perf_counter() - started_at) * 1000,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )

    if not settings.has_clerk_verification_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Clerk authentication is not configured",
        )

    jwt_key = settings.normalized_clerk_jwt_key
    secret_key = None if jwt_key else settings.clerk_secret_key
    clerk = Clerk(bearer_auth=secret_key)
    request_state = clerk.authenticate_request(
        request,
        AuthenticateRequestOptions(
            secret_key=secret_key,
            jwt_key=jwt_key,
            authorized_parties=settings.clerk_authorized_party_list,
            accepts_token=["session_token"],
        ),
    )

    if not request_state.is_signed_in or not request_state.payload:
        logger.info(
            "auth.rejected duration_ms=%.2f reason=%s",
            (perf_counter() - started_at) * 1000,
            request_state.reason,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )

    user_id = request_state.payload.get("sub")
    if not user_id:
        logger.info(
            "auth.missing_subject duration_ms=%.2f",
            (perf_counter() - started_at) * 1000,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )

    logger.info(
        "auth.accepted duration_ms=%.2f user_id=%s",
        (perf_counter() - started_at) * 1000,
        user_id,
    )
    return user_id
