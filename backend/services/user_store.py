"""
User registry — persisted in MongoDB when available, in-memory fallback otherwise.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from pymongo.errors import PyMongoError

logger = logging.getLogger(__name__)


class UserStore:
    def __init__(self) -> None:
        self._collection = None
        self._in_memory: Dict[str, Dict[str, Any]] = {}
        self._using_mongo = False
        try:
            self._connect_to_mongo()
        except Exception as exc:
            logger.warning(
                "MongoDB unavailable for users — using in-memory UserStore fallback: %s",
                exc,
            )

    def _connect_to_mongo(self) -> None:
        from config.mongodb import mongodb

        db = mongodb.get_db()
        if db is None:
            raise RuntimeError("MongoDB returned no database")
        self._collection = db["users"]
        self._collection.create_index("email", unique=True)
        self._using_mongo = True
        logger.info("✓ UserStore connected to MongoDB (users collection)")

    @property
    def is_persistent(self) -> bool:
        return self._using_mongo

    def _normalize_email(self, email: str) -> str:
        return email.lower().strip()

    def _now_iso(self) -> str:
        return datetime.utcnow().isoformat()

    def upsert(self, email: str, display_name: str) -> Dict[str, Any]:
        key = self._normalize_email(email)
        now = self._now_iso()

        if self._collection is not None:
            try:
                existing = self._collection.find_one({"email": key}, {"_id": 0})
                if existing:
                    self._collection.update_one(
                        {"email": key},
                        {
                            "$set": {
                                "displayName": display_name,
                                "lastLoginAt": now,
                            }
                        },
                    )
                    existing["displayName"] = display_name
                    existing["lastLoginAt"] = now
                    return dict(existing)

                user = {
                    "id": str(uuid.uuid4()),
                    "email": key,
                    "displayName": display_name,
                    "createdAt": now,
                    "lastLoginAt": now,
                }
                self._collection.insert_one(dict(user))
                return user
            except PyMongoError as exc:
                logger.error("MongoDB user upsert failed: %s", exc)
                raise

        existing = self._in_memory.get(key)
        if existing:
            existing["displayName"] = display_name
            existing["lastLoginAt"] = now
            return dict(existing)

        user = {
            "id": str(uuid.uuid4()),
            "email": key,
            "displayName": display_name,
            "createdAt": now,
            "lastLoginAt": now,
        }
        self._in_memory[key] = user
        return dict(user)

    def get(self, email: str) -> Optional[Dict[str, Any]]:
        key = self._normalize_email(email)

        if self._collection is not None:
            try:
                user = self._collection.find_one({"email": key}, {"_id": 0})
                return dict(user) if user else None
            except PyMongoError as exc:
                logger.error("MongoDB user get failed: %s", exc)
                raise

        user = self._in_memory.get(key)
        return dict(user) if user else None

    def exists(self, email: str) -> bool:
        return self.get(email) is not None

    def touch_login(self, email: str) -> Optional[Dict[str, Any]]:
        key = self._normalize_email(email)
        now = self._now_iso()

        if self._collection is not None:
            try:
                user = self._collection.find_one({"email": key}, {"_id": 0})
                if not user:
                    return None
                self._collection.update_one(
                    {"email": key},
                    {"$set": {"lastLoginAt": now}},
                )
                user["lastLoginAt"] = now
                return dict(user)
            except PyMongoError as exc:
                logger.error("MongoDB touch_login failed: %s", exc)
                raise

        user = self._in_memory.get(key)
        if not user:
            return None
        user["lastLoginAt"] = now
        return dict(user)


user_store = UserStore()
