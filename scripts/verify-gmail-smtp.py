#!/usr/bin/env python3
"""Verify Gmail SMTP settings in .env before starting the backend."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

from backend.services.email_service import get_email_status, verify_smtp_connection


def main() -> None:
    status = get_email_status()
    print("Email status:", status)
    if not status["configured"]:
        print(
            "\nSMTP is not configured. Edit .env:\n"
            "  SMTP_USER=your_sender@gmail.com\n"
            "  SMTP_PASSWORD=your_google_app_password\n"
            "  SMTP_FROM=your_sender@gmail.com\n"
            "\nCreate an App Password: https://myaccount.google.com/apppasswords"
        )
        raise SystemExit(1)

    ok, err = verify_smtp_connection()
    if ok:
        print(f"\n✓ Gmail SMTP OK — codes will be sent from {status['from_email']}")
        print("  (Any user email can sign up; codes go to THEIR inbox.)")
        return

    print(f"\n✗ Gmail SMTP failed: {err}")
    raise SystemExit(1)


if __name__ == "__main__":
    main()
