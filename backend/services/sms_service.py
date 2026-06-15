"""
SMS delivery for OTP — Twilio when configured, otherwise log-only (dev).
"""

from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)


def send_otp_sms(phone: str, code: str) -> bool:
    """Send OTP via Twilio if credentials exist; always logs in dev."""
    message = f"Your ConvoInsight verification code is {code}. Valid for 5 minutes."

    account_sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    from_number = os.getenv("TWILIO_PHONE_NUMBER", "").strip()

    if account_sid and auth_token and from_number:
        try:
            from twilio.rest import Client

            client = Client(account_sid, auth_token)
            client.messages.create(body=message, from_=from_number, to=phone)
            logger.info("OTP SMS sent to %s", phone)
            return True
        except Exception as exc:
            logger.error("Twilio SMS failed for %s: %s", phone, exc)
            raise

    logger.warning("SMS not configured — OTP for %s: %s", phone, code)
    return False
