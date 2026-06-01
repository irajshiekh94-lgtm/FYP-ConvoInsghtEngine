"""
In-memory user registry (optional persistence for auth).
"""

import threading
import uuid
from datetime import datetime
from typing import Any, Dict, Optional


class UserStore:
    def __init__(self) -> None:
        self._users: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()

    def upsert(self, phone: str, display_name: str) -> Dict[str, Any]:
        with self._lock:
            existing = self._users.get(phone)
            if existing:
                existing["displayName"] = display_name
                existing["lastLoginAt"] = datetime.utcnow().isoformat()
                return dict(existing)
            user = {
                "id": str(uuid.uuid4()),
                "phone": phone,
                "displayName": display_name,
                "createdAt": datetime.utcnow().isoformat(),
                "lastLoginAt": datetime.utcnow().isoformat(),
            }
            self._users[phone] = user
            return dict(user)

    def get(self, phone: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            user = self._users.get(phone)
            return dict(user) if user else None


user_store = UserStore()
