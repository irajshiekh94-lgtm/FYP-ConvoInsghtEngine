"""
Parse message timestamps from ISO strings, WhatsApp export formats, and datetimes.
"""

from datetime import datetime
from typing import Any, Optional

from backend.services.whatsapp_parser import parse_timestamp as parse_whatsapp_timestamp


def parse_message_timestamp(value: Any) -> datetime:
    """Best-effort parse for message timestamps used in summarization."""
    if value is None:
        return datetime.utcnow()

    if isinstance(value, datetime):
        return value

    if not isinstance(value, str):
        return datetime.utcnow()

    raw = value.strip()
    if not raw:
        return datetime.utcnow()

    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        pass

    for fmt in (
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%d/%m/%Y %I:%M %p",
        "%d/%m/%Y %I:%M:%S %p",
        "%m/%d/%Y %I:%M %p",
        "%m/%d/%Y %I:%M:%S %p",
    ):
        try:
            return datetime.strptime(raw, fmt)
        except ValueError:
            continue

    # WhatsApp export: "13/05/2026, 4:25 pm"
    if "," in raw:
        date_part, time_part = raw.split(",", 1)
        parsed = parse_whatsapp_timestamp(date_part.strip(), time_part.strip())
        if parsed is not None:
            return parsed

    return datetime.utcnow()
