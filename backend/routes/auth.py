"""
Email OTP authentication — separate login vs signup flows.
"""

from __future__ import annotations

import logging
import os
import re
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from backend.services.email_service import (
    get_email_status,
    send_otp_email,
    smtp_is_configured,
    verify_smtp_connection,
)
from backend.services.otp_store import otp_store
from backend.services.user_store import user_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Auth"])

_EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")
AuthPurpose = Literal["login", "signup"]


class SendOtpRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=120)
    purpose: AuthPurpose = "login"

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        email = v.strip().lower()
        if not _EMAIL_RE.match(email):
            raise ValueError("Enter a valid email address")
        return email


class VerifyOtpRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=120)
    otp: str = Field(..., min_length=4, max_length=8)
    purpose: AuthPurpose = "login"
    displayName: str = Field(default="ConvoInsight User", max_length=80)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        email = v.strip().lower()
        if not _EMAIL_RE.match(email):
            raise ValueError("Enter a valid email address")
        return email


class UserResponse(BaseModel):
    id: str
    email: str
    displayName: str
    createdAt: str
    lastLoginAt: str


class AuthSuccessResponse(BaseModel):
    success: bool = True
    user: UserResponse


class SendOtpResponse(BaseModel):
    success: bool = True
    message: str
    devOtp: Optional[str] = None


def _is_debug() -> bool:
    return os.getenv("DEBUG", "false").lower() in ("1", "true", "yes")


def _http_error(status: int, code: str, detail: str) -> HTTPException:
    return HTTPException(
        status_code=status,
        detail={"error": code, "detail": detail, "status_code": status},
    )


def _issue_and_send_otp(email: str) -> tuple[bool, Optional[str]]:
    code = otp_store.issue(email)
    email_sent = send_otp_email(email, code)
    dev_otp = code if _is_debug() and not email_sent else None
    return email_sent, dev_otp


@router.on_event("startup")
async def _log_auth_services() -> None:
    email_status = get_email_status()
    if email_status["configured"]:
        ok, err = verify_smtp_connection()
        if ok:
            logger.info(
                "✓ Gmail SMTP ready — OTP emails will be sent from %s",
                email_status["from_email"],
            )
        else:
            logger.error("✗ Gmail SMTP misconfigured: %s", err)
    else:
        logger.warning(
            "⚠ Gmail SMTP not configured — set SMTP_USER + SMTP_PASSWORD in .env. "
            "OTP codes will only appear in dev mode when DEBUG=True."
        )

    if user_store.is_persistent:
        logger.info("✓ User accounts persisted in MongoDB")
    else:
        logger.warning("⚠ User accounts in memory only — MongoDB unavailable")


@router.post("/send-otp", response_model=SendOtpResponse)
async def send_otp(body: SendOtpRequest):
    email = body.email
    purpose = body.purpose

    if purpose == "login":
        if not user_store.exists(email):
            raise _http_error(
                404,
                "account_not_found",
                "Your account does not exist. Please sign up.",
            )
    elif purpose == "signup":
        if user_store.exists(email):
            raise _http_error(
                409,
                "account_exists",
                "An account with this email already exists. Please log in.",
            )

    email_sent, dev_otp = _issue_and_send_otp(email)

    if not email_sent and not _is_debug():
        if smtp_is_configured():
            _, smtp_err = verify_smtp_connection()
            detail = (
                "Could not send verification email. "
                "Open .env and set SMTP_USER to your Gmail and SMTP_PASSWORD to a "
                "Google App Password (not your normal password). "
                "Create one at https://myaccount.google.com/apppasswords"
            )
            if smtp_err:
                detail = f"{detail} Server says: {smtp_err}"
            raise _http_error(503, "email_send_failed", detail)
        raise _http_error(
            503,
            "email_not_configured",
            "Email service is not configured on the server.",
        )

    return SendOtpResponse(
        success=True,
        message=(
            "Verification code sent to your email."
            if email_sent
            else "Verification code generated (dev mode — check server logs or alert)."
        ),
        devOtp=dev_otp,
    )


@router.post("/verify-otp", response_model=AuthSuccessResponse)
async def verify_otp(body: VerifyOtpRequest):
    email = body.email
    otp = body.otp.strip()
    purpose = body.purpose

    if not otp_store.verify(email, otp):
        raise _http_error(
            401,
            "invalid_otp",
            "Invalid or expired verification code",
        )

    if purpose == "login":
        user = user_store.touch_login(email)
        if not user:
            raise _http_error(
                404,
                "account_not_found",
                "Your account does not exist. Please sign up.",
            )
    else:
        if user_store.exists(email):
            raise _http_error(
                409,
                "account_exists",
                "An account with this email already exists. Please log in.",
            )
        user = user_store.upsert(
            email, body.displayName.strip() or "ConvoInsight User"
        )

    logger.info("User verified via email OTP (%s): %s", purpose, email)
    return AuthSuccessResponse(user=UserResponse(**user))


class EmailAuthRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=120)
    displayName: str = Field(default="ConvoInsight User", max_length=80)


@router.post("/register", response_model=AuthSuccessResponse)
async def register_user(body: EmailAuthRequest):
    email = body.email.strip().lower()
    if not _EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Invalid email")
    if user_store.exists(email):
        raise _http_error(
            409,
            "account_exists",
            "An account with this email already exists. Please log in.",
        )
    user = user_store.upsert(email, body.displayName.strip() or "ConvoInsight User")
    return AuthSuccessResponse(user=UserResponse(**user))


@router.post("/login", response_model=AuthSuccessResponse)
async def login_user(body: EmailAuthRequest):
    email = body.email.strip().lower()
    if not _EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Invalid email")
    user = user_store.touch_login(email)
    if not user:
        raise _http_error(
            404,
            "account_not_found",
            "Your account does not exist. Please sign up.",
        )
    return AuthSuccessResponse(user=UserResponse(**user))
