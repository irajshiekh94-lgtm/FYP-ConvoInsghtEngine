"""
MongoDB repository for WhatsApp messages and chat metadata.
"""

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from backend.models.message import ChatDocument, MessageDocument
from config.mongodb import mongodb
from pymongo.errors import PyMongoError

logger = logging.getLogger(__name__)


class MessageRepositoryError(Exception):
    pass


class MessageRepository:
    MESSAGES_COLLECTION = "messages"
    CHATS_COLLECTION = "chats"
    SUMMARIES_COLLECTION = "summaries"

    def __init__(self) -> None:
        self._db = None
        self._available = False
        try:
            self._db = mongodb.get_db()
            self._available = self._db is not None
            if self._available:
                self._ensure_indexes()
        except Exception as exc:
            logger.warning("MessageRepository: MongoDB unavailable — %s", exc)
            self._available = False

    @property
    def available(self) -> bool:
        return self._available and self._db is not None

    def _ensure_indexes(self) -> None:
        try:
            self._db[self.MESSAGES_COLLECTION].create_index(
                [("chatId", 1), ("timestamp", 1)]
            )
            self._db[self.CHATS_COLLECTION].create_index(
                [("chatId", 1)], unique=True, sparse=True
            )
        except Exception as exc:
            logger.debug("Index creation skipped: %s", exc)

    def save_chat(self, chat_id: str, chat: ChatDocument) -> str:
        if not self.available:
            raise MessageRepositoryError("MongoDB is not available")
        doc = chat.to_mongo()
        doc["chatId"] = chat_id
        try:
            self._db[self.CHATS_COLLECTION].update_one(
                {"chatId": chat_id},
                {"$set": doc},
                upsert=True,
            )
            return chat_id
        except PyMongoError as exc:
            logger.error("Failed to save chat %s: %s", chat_id, exc)
            raise MessageRepositoryError(str(exc)) from exc

    def save_messages(self, messages: List[MessageDocument]) -> int:
        if not self.available:
            raise MessageRepositoryError("MongoDB is not available")
        if not messages:
            return 0
        docs = [m.to_mongo() for m in messages]
        try:
            result = self._db[self.MESSAGES_COLLECTION].insert_many(docs)
            return len(result.inserted_ids)
        except PyMongoError as exc:
            logger.error("Failed to insert messages: %s", exc)
            raise MessageRepositoryError(str(exc)) from exc

    def get_chat_type(self, chat_id: str) -> str:
        if not self.available:
            return "individual"
        chat = self._db[self.CHATS_COLLECTION].find_one({"chatId": chat_id})
        if not chat:
            chat = self._db[self.CHATS_COLLECTION].find_one({"_id": chat_id})
        if chat:
            return chat.get("chatType", "individual")
        return "individual"

    @staticmethod
    def _parse_timestamp(value: Any) -> Optional[datetime]:
        if value is None:
            return None
        if isinstance(value, datetime):
            return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        if isinstance(value, str):
            try:
                parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
                return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
            except ValueError:
                return None
        return None

    def _serialize_cursor(
        self, cursor, chat_type: str
    ) -> List[Dict[str, Any]]:
        messages: List[Dict[str, Any]] = []
        for doc in cursor:
            doc.pop("_id", None)
            normalized = MessageDocument.from_legacy(doc, chat_type=chat_type)
            messages.append(normalized.model_dump())
        return messages

    def get_messages_last_24h(self, chat_id: str) -> List[Dict[str, Any]]:
        """Fetch messages from the last 24 hours (wall clock), sorted chronologically."""
        if not self.available:
            raise MessageRepositoryError("MongoDB is not available")

        since = datetime.now(timezone.utc) - timedelta(hours=24)
        chat_type = self.get_chat_type(chat_id)

        try:
            cursor = self._db[self.MESSAGES_COLLECTION].find(
                {"chatId": chat_id, "timestamp": {"$gte": since}},
            ).sort("timestamp", 1)
            messages = self._serialize_cursor(cursor, chat_type)

            if not messages:
                since_naive = datetime.utcnow() - timedelta(hours=24)
                cursor = self._db[self.MESSAGES_COLLECTION].find(
                    {"chatId": chat_id, "timestamp": {"$gte": since_naive}},
                ).sort("timestamp", 1)
                messages = self._serialize_cursor(cursor, chat_type)

            return messages
        except PyMongoError as exc:
            logger.error("Failed to fetch messages for chat %s: %s", chat_id, exc)
            raise MessageRepositoryError(str(exc)) from exc

    def get_messages_recent(
        self, chat_id: str, limit: int = 150
    ) -> List[Dict[str, Any]]:
        """Fetch the most recent messages for a chat, sorted chronologically."""
        if not self.available:
            raise MessageRepositoryError("MongoDB is not available")

        chat_type = self.get_chat_type(chat_id)
        limit = max(1, min(limit, 500))

        try:
            cursor = (
                self._db[self.MESSAGES_COLLECTION]
                .find({"chatId": chat_id})
                .sort("timestamp", -1)
                .limit(limit)
            )
            messages = self._serialize_cursor(cursor, chat_type)
            messages.reverse()
            return messages
        except PyMongoError as exc:
            logger.error("Failed to fetch recent messages for %s: %s", chat_id, exc)
            raise MessageRepositoryError(str(exc)) from exc

    def get_messages_relative_24h(
        self, chat_id: str, scan_limit: int = 500
    ) -> List[Dict[str, Any]]:
        """
        Last 24 hours of conversation time — anchored to the newest message in the chat.
        Useful for WhatsApp exports where message dates are in the past.
        """
        recent = self.get_messages_recent(chat_id, limit=scan_limit)
        if not recent:
            return []

        parsed = [
            (msg, self._parse_timestamp(msg.get("timestamp")))
            for msg in recent
        ]
        valid = [(msg, ts) for msg, ts in parsed if ts is not None]
        if not valid:
            return recent

        latest = max(ts for _, ts in valid)
        since = latest - timedelta(hours=24)
        return [msg for msg, ts in valid if ts >= since]

    def get_messages_for_summary(
        self, chat_id: str, max_messages: Optional[int] = None
    ) -> Tuple[List[Dict[str, Any]], str]:
        """
        Resolve messages for executive summarization.

        Priority:
          1. Last 24h (real time)
          2. Last 24h of conversation (relative to newest stored message)
          3. Most recent N messages
        """
        if not self.available:
            raise MessageRepositoryError("MongoDB is not available")

        limit = max_messages or int(os.getenv("SUMMARY_MAX_MESSAGES", "150"))
        limit = max(1, min(limit, 500))

        messages = self.get_messages_last_24h(chat_id)
        if messages:
            return messages, "24h"

        messages = self.get_messages_relative_24h(chat_id)
        if messages:
            logger.info(
                "Chat %s: no wall-clock 24h messages; using conversation tail (%d)",
                chat_id,
                len(messages),
            )
            return messages, "conversation_tail"

        messages = self.get_messages_recent(chat_id, limit=limit)
        if messages:
            logger.info(
                "Chat %s: using %d most recent messages for summary",
                chat_id,
                len(messages),
            )
            return messages, "recent"

        return [], "none"

    def save_summary_result(
        self,
        chat_id: str,
        summary: str,
        insights: Dict[str, Any],
        message_count: int,
    ) -> None:
        if not self.available:
            return
        try:
            self._db[self.SUMMARIES_COLLECTION].insert_one(
                {
                    "chatId": chat_id,
                    "summary": summary,
                    "insights": insights,
                    "messageCount": message_count,
                    "period": "24h",
                    "generatedAt": datetime.utcnow(),
                }
            )
        except PyMongoError as exc:
            logger.warning("Could not persist summary for chat %s: %s", chat_id, exc)

    def persist_pipeline_result(
        self,
        chat_id: str,
        chat_name: str,
        chat_type: str,
        participants: List[str],
        current_user: str,
        pipeline_messages: List[Dict[str, Any]],
    ) -> int:
        """Save chat metadata and messages after pipeline processing."""
        if not self.available:
            return 0
        chat = ChatDocument(
            chatName=chat_name,
            chatType=chat_type,
            participants=participants,
            totalMessages=len(pipeline_messages),
            currentUser=current_user,
        )
        self.save_chat(chat_id, chat)
        docs = self.messages_from_pipeline(chat_id, chat_type, pipeline_messages)
        return self.save_messages(docs)

    @staticmethod
    def messages_from_pipeline(
        chat_id: str,
        chat_type: str,
        pipeline_messages: List[Dict[str, Any]],
    ) -> List[MessageDocument]:
        """Convert pipeline MessageOut dicts into MessageDocument instances."""
        docs: List[MessageDocument] = []
        for msg in pipeline_messages:
            ts = msg.get("timestamp")
            if isinstance(ts, str):
                try:
                    ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                except ValueError:
                    ts = datetime.utcnow()
            elif ts is None:
                ts = datetime.utcnow()
            content = (msg.get("content") or msg.get("messageText") or "").strip()
            if not content:
                continue
            docs.append(
                MessageDocument(
                    senderName=msg.get("sender") or msg.get("senderName", "Unknown"),
                    messageText=content,
                    timestamp=ts,
                    chatId=chat_id,
                    chatType=chat_type,
                    messageType=msg.get("messageType", "text"),
                )
            )
        return docs


message_repository = MessageRepository()
