"""
Email delivery for OTP — Gmail SMTP when configured, log-only fallback in dev.
"""

from __future__ import annotations

import logging
import os
import smtplib
from email.mime.text import MIMEText
from typing import Optional

logger = logging.getLogger(__name__)

_PLACEHOLDER_VALUES = frozenset(
    {
        "",
        "...",
        "your_email",
        "your_password",
        "changeme",
        "xxx",
        "your_email@gmail.com",
        "your_app_password",
        "your_sender@gmail.com",
    }
)

_PLACEHOLDER_PASSWORD_PREFIXES = ("xxxx", "your_", "changeme", "xxx")


def _clean(value: str) -> str:
    return value.strip()


def _is_placeholder(value: str) -> bool:
    cleaned = _clean(value)
    if not cleaned:
        return True
    lowered = cleaned.lower()
    if lowered in _PLACEHOLDER_VALUES:
        return True
    if "..." in cleaned:
        return True
    if lowered.startswith(_PLACEHOLDER_PASSWORD_PREFIXES):
        return True
    # Google app passwords are 16 chars; reject obvious template patterns
    if cleaned.replace(" ", "").lower() == "xxxxxxxxxxxxxxxx":
        return True
    return False


GMAIL_SMTP_HOST = "smtp.gmail.com"
GMAIL_SMTP_PORT = 587


def smtp_settings() -> dict[str, str]:
    """Resolved SMTP settings (Gmail defaults when host is unset)."""
    host = _clean(os.getenv("SMTP_HOST", GMAIL_SMTP_HOST))
    port = _clean(os.getenv("SMTP_PORT", str(GMAIL_SMTP_PORT)))
    user = _clean(os.getenv("SMTP_USER", ""))
    password = _clean(os.getenv("SMTP_PASSWORD", "")).replace(" ", "")
    from_email = _clean(os.getenv("SMTP_FROM", user))
    return {
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "from_email": from_email,
    }


def smtp_is_configured() -> bool:
    settings = smtp_settings()
    if _is_placeholder(settings["user"]) or _is_placeholder(settings["password"]):
        return False
    if not settings["from_email"]:
        return False
    return True


def get_email_status() -> dict[str, object]:
    settings = smtp_settings()
    configured = smtp_is_configured()
    return {
        "configured": configured,
        "provider": "gmail" if settings["host"] == GMAIL_SMTP_HOST else settings["host"],
        "from_email": settings["from_email"] if configured else None,
    }


def verify_smtp_connection() -> tuple[bool, Optional[str]]:
    """
    Test SMTP login without sending mail.
    Returns (ok, error_message).
    """
    if not smtp_is_configured():
        return False, "SMTP is not configured — set SMTP_USER and SMTP_PASSWORD in .env"

    settings = smtp_settings()
    try:
        with smtplib.SMTP(settings["host"], int(settings["port"]), timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings["user"], settings["password"])
        return True, None
    except smtplib.SMTPAuthenticationError:
        return False, (
            "Gmail rejected the login. Use a Google App Password "
            "(not your normal Gmail password) with 2-Step Verification enabled."
        )
    except Exception as exc:
        return False, str(exc)


def send_otp_email(to_email: str, code: str) -> bool:
    subject = "Your ConvoInsight verification code"
    body = (
        f"Your ConvoInsight verification code is {code}.\n\n"
        "It expires in 5 minutes. If you didn't request this, ignore this email."
    )

    if not smtp_is_configured():
        logger.warning(
            "Email not configured — OTP for %s: %s (set SMTP_USER + SMTP_PASSWORD in .env)",
            to_email,
            code,
        )
        return False

    settings = smtp_settings()

    try:
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = settings["from_email"]
        msg["To"] = to_email

        with smtplib.SMTP(settings["host"], int(settings["port"]), timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings["user"], settings["password"])
            server.sendmail(settings["from_email"], [to_email], msg.as_string())

        logger.info("OTP email sent to %s", to_email)
        return True
    except smtplib.SMTPAuthenticationError as exc:
        logger.error(
            "Gmail SMTP auth failed — use an App Password: %s",
            exc,
        )
        return False
    except Exception as exc:
        logger.error("SMTP failed for %s: %s", to_email, exc)
        return False
