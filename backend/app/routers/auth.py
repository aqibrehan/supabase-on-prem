import logging

from fastapi import APIRouter, HTTPException, status

from app.schemas.auth import TokenResponse, UserLogin, UserRegister
from app.services.auth import create_access_token, hash_password, verify_password

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])

# In-memory store for demo. In production, use a users table in PostgreSQL.
_users_db: dict[str, str] = {}


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister):
    if data.email in _users_db:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    _users_db[data.email] = hash_password(data.password)
    token = create_access_token(subject=data.email)
    logger.info("User registered: %s", data.email)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    hashed = _users_db.get(data.email)
    if not hashed or not verify_password(data.password, hashed):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_access_token(subject=data.email)
    logger.info("User logged in: %s", data.email)
    return TokenResponse(access_token=token)
