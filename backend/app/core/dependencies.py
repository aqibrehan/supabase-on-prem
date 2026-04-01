import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.services.auth import decode_access_token
from app.services.product import ProductService

logger = logging.getLogger(__name__)
settings = get_settings()

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """Validate JWT token and return the user payload."""
    token = credentials.credentials

    if settings.AUTH_MODE == "supabase":
        return await _verify_supabase_token(token)

    try:
        payload = decode_access_token(token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


async def _verify_supabase_token(token: str) -> dict:
    """Verify a Supabase JWT using the project's JWT secret."""
    try:
        payload = decode_access_token(token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Supabase token error: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


def get_product_service(
    session: AsyncSession = Depends(get_db),
) -> ProductService:
    return ProductService(session)
