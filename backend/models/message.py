"""
MongoDB document models for WhatsApp messages and chats.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class MessageDocument(BaseModel):
    """Canonical message shape stored in MongoDB."""

    senderName: str
    messageText: str
    timestamp: datetime
    chatId: str
    chatType: str = "individual"  # individual | group
    messageType: str = "text"
    isDeleted: bool = False

    def to_mongo(self) -> Dict[str, Any]:
        doc = self.model_dump()
        return doc

    @classmethod
    def from_legacy(cls, doc: Dict[str, Any], chat_type: str = "individual") -> "MessageDocument":
        """Normalize legacy documents that used sender/content field names."""
        sender = doc.get("senderName") or doc.get("sender", "Unknown")
        text = doc.get("messageText") or doc.get("content", "")
        ts = doc.get("timestamp")
        if isinstance(ts, str):
            try:
                ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            except ValueError:
                ts = datetime.utcnow()
        elif ts is None:
            ts = datetime.utcnow()
        return cls(
            senderName=sender,
            messageText=text,
            timestamp=ts,
            chatId=str(doc.get("chatId", "")),
            chatType=doc.get("chatType", chat_type),
            messageType=doc.get("messageType", "text"),
            isDeleted=bool(doc.get("isDeleted", False)),
        )


class ChatDocument(BaseModel):
    """Chat metadata stored alongside messages."""

    chatName: str = ""
    chatType: str = "individual"
    participants: List[str] = Field(default_factory=list)
    totalMessages: int = 0
    uploadedAt: datetime = Field(default_factory=datetime.utcnow)
    currentUser: str = "Me"

    def to_mongo(self) -> Dict[str, Any]:
        return self.model_dump()
