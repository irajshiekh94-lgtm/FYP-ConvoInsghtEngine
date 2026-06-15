"""
Business logic for 24-hour executive chat summarization.
"""

import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Tuple

from backend.models.message import MessageDocument
from backend.schemas.summary import (
    LlamaTestResponse,
    StoreMessageItem,
    StoreMessagesResponse,
    SummarizeMessageItem,
    SummarizeRequest,
    SummarizeResponse,
    SummaryInsights,
)
from backend.services.llama_service import LlamaServiceError, llama_service
from backend.services.message_repository import MessageRepositoryError, message_repository
from backend.services.timestamp_utils import parse_message_timestamp

logger = logging.getLogger(__name__)


class SummaryController:
    def __init__(self) -> None:
        self.llama = llama_service
        self.repo = message_repository

    def test_llama(self) -> LlamaTestResponse:
        result = self.llama.test_connection()
        return LlamaTestResponse(**result)

    def store_messages(self, items: List[StoreMessageItem]) -> StoreMessagesResponse:
        if not self.repo.available:
            return StoreMessagesResponse(
                success=False,
                error="MongoDB is not available",
            )
        docs: List[MessageDocument] = []
        for item in items:
            try:
                ts = parse_message_timestamp(item.timestamp)
            except ValueError:
                ts = datetime.utcnow()
            docs.append(
                MessageDocument(
                    senderName=item.senderName,
                    messageText=item.messageText,
                    timestamp=ts,
                    chatId=item.chatId,
                    chatType=item.chatType,
                )
            )
        try:
            count = self.repo.save_messages(docs)
            return StoreMessagesResponse(success=True, inserted=count)
        except MessageRepositoryError as exc:
            logger.error("store_messages failed: %s", exc)
            return StoreMessagesResponse(success=False, error=str(exc))

    @staticmethod
    def _messages_from_client(
        items: List[SummarizeMessageItem], max_messages: int
    ) -> List[Dict[str, Any]]:
        docs: List[Tuple[datetime, Dict[str, Any]]] = []
        for item in items:
            text = (item.messageText or "").strip()
            if not text:
                continue
            try:
                ts = parse_message_timestamp(item.timestamp)
            except ValueError:
                ts = datetime.utcnow()
            docs.append(
                (
                    ts,
                    {
                        "senderName": item.senderName or "Unknown",
                        "messageText": text,
                        "timestamp": ts,
                    },
                )
            )
        docs.sort(key=lambda pair: pair[0])
        tail = docs[-max_messages:]
        return [msg for _, msg in tail]

    def _resolve_messages(
        self, body: SummarizeRequest
    ) -> Tuple[List[Dict[str, Any]], str]:
        max_messages = body.maxMessages or int(os.getenv("SUMMARY_MAX_MESSAGES", "150"))
        max_messages = max(1, min(max_messages, 500))

        if self.repo.available:
            try:
                messages, period = self.repo.get_messages_for_summary(
                    body.chatId.strip(), max_messages=max_messages
                )
                usable = [
                    m
                    for m in messages
                    if (m.get("messageText") or m.get("content") or "").strip()
                ]
                if usable:
                    return usable, period
            except MessageRepositoryError as exc:
                logger.error("Failed to load messages for %s: %s", body.chatId, exc)
                if not body.messages:
                    raise

        if body.messages:
            messages = self._messages_from_client(body.messages, max_messages)
            if messages:
                return messages, "client"

        return [], "none"

    def summarize(self, body: SummarizeRequest) -> SummarizeResponse:
        chat_id = body.chatId.strip()
        if not chat_id:
            return SummarizeResponse(success=False, error="chatId is required")

        if not self.repo.available and not body.messages:
            return SummarizeResponse(
                success=False,
                error="No messages available. Re-analyze the chat or pass messages in the request.",
            )

        try:
            messages, period = self._resolve_messages(body)
        except MessageRepositoryError as exc:
            return SummarizeResponse(success=False, error=str(exc))

        if not messages:
            return SummarizeResponse(
                success=False,
                error="No messages available to summarize for this chat.",
                messageCount=0,
            )

        chat_type = body.chatType or (
            self.repo.get_chat_type(chat_id) if self.repo.available else "individual"
        )

        try:
            result: Dict[str, Any] = self.llama.summarize_messages(
                messages, chat_type=chat_type, period=period
            )
        except LlamaServiceError as exc:
            logger.error("Llama summarization error for %s: %s", chat_id, exc)
            return SummarizeResponse(success=False, error=str(exc))

        insights = SummaryInsights(
            keyDecisions=result.get("keyDecisions", []),
            assignedTasks=result.get("assignedTasks", []),
            pendingActions=result.get("pendingActions", []),
            blockers=result.get("blockers", []),
            peopleMentioned=result.get("peopleMentioned", []),
            sentiment=result.get("sentiment", "Neutral"),
        )

        if self.repo.available:
            self.repo.save_summary_result(
                chat_id=chat_id,
                summary=result["summary"],
                insights=insights.model_dump(),
                message_count=len(messages),
            )

        return SummarizeResponse(
            success=True,
            summary=result["summary"],
            insights=insights,
            messageCount=len(messages),
            period=period,  # type: ignore[arg-type]
        )


summary_controller = SummaryController()
