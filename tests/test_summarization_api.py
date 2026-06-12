"""
Tests for 24-hour executive summarization service (no live Llama required).
"""

from datetime import datetime, timedelta
from unittest.mock import MagicMock

import pytest

from backend.controllers.summary_controller import SummaryController
from backend.schemas.summary import SummarizeRequest, StoreMessageItem
from backend.services.llama_service import LlamaService


def test_llama_test_ollama_default(monkeypatch):
    monkeypatch.setenv("LLAMA_PROVIDER", "ollama")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    service = LlamaService()
    assert service.provider == "ollama"


def test_llama_summarize_empty_messages():
    service = LlamaService()
    service.available = True
    result = service.summarize_messages([])
    assert "No messages" in result["summary"]
    assert result["sentiment"] == "Neutral"


def test_llama_extract_partial_summary():
    service = LlamaService()
    raw = '{"summary": "Team aligned on the launch plan and next steps", "keyDecisions": ['
    extracted = service._extract_summary_from_raw(raw)
    assert extracted is not None
    assert "launch plan" in extracted


def test_llama_clean_summary_text():
    service = LlamaService()
    assert service._clean_summary_text("Hello world...") == "Hello world."
    assert service._clean_summary_text("Done deal…") == "Done deal."


def test_llama_parse_json_response():
    service = LlamaService()
    raw = """```json
{"summary": "Test summary.", "keyDecisions": ["A"], "assignedTasks": [],
 "pendingActions": [], "blockers": [], "peopleMentioned": ["Bob"], "sentiment": "Neutral"}
```"""
    parsed = service._parse_json_response(raw)
    assert parsed["summary"] == "Test summary."
    assert parsed["peopleMentioned"] == ["Bob"]


def test_summary_controller_store_and_summarize():
    controller = SummaryController()
    controller.repo = MagicMock()
    controller.repo.available = True
    controller.repo.save_messages.return_value = 2

    items = [
        StoreMessageItem(
            senderName="Alice",
            messageText="Please review the design",
            timestamp=datetime.utcnow().isoformat(),
            chatId="chat-1",
            chatType="group",
        ),
        StoreMessageItem(
            senderName="Bob",
            messageText="Will do by Friday",
            timestamp=datetime.utcnow().isoformat(),
            chatId="chat-1",
            chatType="group",
        ),
    ]
    resp = controller.store_messages(items)
    assert resp.success is True
    assert resp.inserted == 2

    controller.repo.get_messages_for_summary.return_value = (
        [
            {
                "senderName": "Alice",
                "messageText": "Please review the design",
                "timestamp": datetime.utcnow() - timedelta(hours=2),
            }
        ],
        "24h",
    )
    controller.repo.get_chat_type.return_value = "group"
    controller.llama = MagicMock()
    controller.llama.summarize_messages.return_value = {
        "summary": "During the last 24 hours, design review was requested.",
        "keyDecisions": [],
        "assignedTasks": ["Review design by Friday"],
        "pendingActions": ["Design review"],
        "blockers": ["Awaiting design approval"],
        "peopleMentioned": ["Alice", "Bob"],
        "sentiment": "Neutral",
    }

    result = controller.summarize(SummarizeRequest(chatId="chat-1"))
    assert result.success is True
    assert "design review" in result.summary.lower()
    assert result.insights is not None
    assert result.insights.assignedTasks
    assert result.messageCount == 1


def test_summary_falls_back_to_client_messages():
    controller = SummaryController()
    controller.repo = MagicMock()
    controller.repo.available = True
    controller.repo.get_messages_for_summary.return_value = ([], "none")
    controller.llama = MagicMock()
    controller.llama.summarize_messages.return_value = {
        "summary": "Team discussed the launch timeline.",
        "keyDecisions": [],
        "assignedTasks": [],
        "pendingActions": [],
        "blockers": [],
        "peopleMentioned": [],
        "sentiment": "Neutral",
    }

    from backend.schemas.summary import SummarizeMessageItem

    old_ts = (datetime.utcnow() - timedelta(days=30)).isoformat()
    result = controller.summarize(
        SummarizeRequest(
            chatId="chat-old",
            messages=[
                SummarizeMessageItem(
                    senderName="Alice",
                    messageText="Launch is next week",
                    timestamp=old_ts,
                )
            ],
        )
    )
    assert result.success is True
    assert result.period == "client"
    assert result.messageCount == 1
    controller.llama.summarize_messages.assert_called_once()
    assert controller.llama.summarize_messages.call_args.kwargs["period"] == "client"


def test_message_document_from_legacy():
    from backend.models.message import MessageDocument

    doc = MessageDocument.from_legacy(
        {
            "sender": "Alice",
            "content": "Hello",
            "timestamp": "2026-05-13T16:22:00",
            "chatId": "abc",
        },
        chat_type="individual",
    )
    assert doc.senderName == "Alice"
    assert doc.messageText == "Hello"
    assert doc.chatType == "individual"
