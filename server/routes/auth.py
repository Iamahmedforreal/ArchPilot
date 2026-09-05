from clerk_backend_api import Clerk
from clerk_backend_api.security.types import AuthenticateRequestOptions
from fastapi import HTTPException, Request, status

from utils.utils import settings


async def get_current_user_id(
    request: Request,
) -> str:
    authorization = request.headers.get("Authorization")
    session_cookie = request.cookies.get("__session")
    if not authorization and not session_cookie:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )

    if not settings.has_clerk_verification_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Clerk authentication is not configured",
        )

    clerk = Clerk(bearer_auth=settings.clerk_secret_key)
    request_state = clerk.authenticate_request(
        request,
        AuthenticateRequestOptions(
            secret_key=settings.clerk_secret_key,
            jwt_key=settings.normalized_clerk_jwt_key,
            authorized_parties=settings.clerk_authorized_party_list,
            accepts_token=["session_token"],
        ),
    )

    if not request_state.is_signed_in or not request_state.payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )

    user_id = request_state.payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )

    return user_id
