"""
Pipeline unit tests — no Gemini required.
"""

import pytest

from backend.services.priority_classifier import classify_priorities
from backend.services.action_extractor import extract_actions
from backend.services.pipeline import run_analysis_pipeline
from backend.services.whatsapp_parser import parse_chat_from_text

SAMPLE_CHAT = """13/05/2026, 4:22 pm - Alice: We need the report by Friday urgently
13/05/2026, 4:23 pm - Bob: Can you send the invoice today?
13/05/2026, 4:25 pm - Alice: Yes I will follow up tomorrow
13/05/2026, 4:30 pm - Me: Sounds good thanks
"""


def test_parse_chat_from_text():
    result = parse_chat_from_text(SAMPLE_CHAT, "Test Chat")
    assert result["totalMessages"] >= 3
    assert "Alice" in result["participants"]
    assert result["chatName"] == "Test Chat"


def test_pipeline_structure_without_gemini(monkeypatch):
    """Pipeline returns canonical JSON shape; summarizer uses fallback if no API key."""

    def fake_summarize(self, shaped_clusters, current_user):
        out = {}
        for c in shaped_clusters:
            sender = c["senders"][0]
            if sender == current_user:
                continue
            if sender not in out:
                out[sender] = {"clusters": [], "total_messages": 0}
            out[sender]["clusters"].append(
                {
                    "cluster_id": c["cluster_id"],
                    "summary": f"{sender} discussed work deadlines.",
                    "message_count": c["message_count"],
                }
            )
            out[sender]["total_messages"] += c["message_count"]
        return out

    monkeypatch.setattr(
        "backend.services.pipeline._summarize_clusters",
        lambda shaped, user: fake_summarize(None, shaped, user),
    )
    def fake_classify_all(sender_summaries):
        for sender, data in sender_summaries.items():
            for cluster in data.get("clusters", []):
                t = cluster.get("summary", "").lower()
                cluster["intent"] = "request" if "invoice" in t else "question"
        return sender_summaries

    monkeypatch.setattr(
        "backend.services.pipeline.classify_all",
        fake_classify_all,
    )

    result, meta = run_analysis_pipeline(
        SAMPLE_CHAT,
        chat_name="Test",
        current_user="Me",
    )

    assert hasattr(result, "messages")
    assert isinstance(result.summary, str)
    assert hasattr(result.conversation_summary, "themes")
    assert isinstance(result.conversation_summary.themes, list)
    assert hasattr(result.priorities, "urgent")
    assert hasattr(result.priorities, "moderate")
    assert hasattr(result.priorities, "low")
    assert isinstance(result.actions, list)
    assert meta["messageCount"] >= 3


def test_priority_buckets():
    summaries = {
        "Alice": {
            "clusters": [
                {"summary": "Urgent deadline", "intent": "complaint", "cluster_id": 0, "message_count": 2}
            ],
            "total_messages": 2,
        },
        "Bob": {
            "clusters": [
                {"summary": "Hello there", "intent": "greeting", "cluster_id": 1, "message_count": 1}
            ],
            "total_messages": 1,
        },
    }
    p = classify_priorities(summaries)
    assert len(p.urgent) >= 1
    assert len(p.low) >= 1
    actions = extract_actions(summaries, p)
    assert isinstance(actions, list)
