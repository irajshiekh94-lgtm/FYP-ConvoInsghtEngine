"""
Simple phone-based auth (no OTP) — optional backend user record.
"""

import logging
import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.services.user_store import user_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Auth"])


class PhoneAuthRequest(BaseModel):
    phone: str = Field(..., min_length=8, max_length=20)
    displayName: str = Field(default="ConvoInsight User", max_length=80)


class UserResponse(BaseModel):
    id: str
    phone: str
    displayName: str
    createdAt: str
    lastLoginAt: str


class AuthSuccessResponse(BaseModel):
    success: bool = True
    user: UserResponse


def _normalize_phone(phone: str) -> str:
    cleaned = re.sub(r"[^\d+]", "", phone.strip())
    if len(cleaned) < 10:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "validation_error",
                "detail": "Phone number must have at least 10 digits",
                "status_code": 400,
            },
        )
    if not cleaned.startswith("+"):
        cleaned = f"+{cleaned}"
    return cleaned


@router.post("/register", response_model=AuthSuccessResponse)
async def register_user(body: PhoneAuthRequest):
    """Create or update a user record (idempotent by phone)."""
    phone = _normalize_phone(body.phone)
    user = user_store.upsert(phone, body.displayName.strip() or "ConvoInsight User")
    logger.info("User registered: %s", phone)
    return AuthSuccessResponse(user=UserResponse(**user))


@router.post("/login", response_model=AuthSuccessResponse)
async def login_user(body: PhoneAuthRequest):
    """Login — creates user if first time (phone-only, no OTP)."""
    phone = _normalize_phone(body.phone)
    user = user_store.upsert(phone, body.displayName.strip() or "ConvoInsight User")
    logger.info("User login: %s", phone)
    return AuthSuccessResponse(user=UserResponse(**user))
