"""
In-memory OTP storage with expiry (per phone).
"""

from __future__ import annotations

import secrets
import threading
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple


class OtpStore:
    def __init__(self, ttl_seconds: int = 300) -> None:
        self._ttl = ttl_seconds
        self._codes: Dict[str, Tuple[str, datetime]] = {}
        self._lock = threading.Lock()

    def issue(self, phone: str) -> str:
        code = f"{secrets.randbelow(1_000_000):06d}"
        expires = datetime.utcnow() + timedelta(seconds=self._ttl)
        with self._lock:
            self._codes[phone] = (code, expires)
        return code

    def verify(self, phone: str, code: str) -> bool:
        with self._lock:
            entry = self._codes.get(phone)
            if not entry:
                return False
            stored, expires = entry
            if datetime.utcnow() > expires:
                del self._codes[phone]
                return False
            if stored != code.strip():
                return False
            del self._codes[phone]
            return True

    def peek(self, phone: str) -> Optional[str]:
        with self._lock:
            entry = self._codes.get(phone)
            if not entry:
                return None
            stored, expires = entry
            if datetime.utcnow() > expires:
                del self._codes[phone]
                return None
            return stored


otp_store = OtpStore()
