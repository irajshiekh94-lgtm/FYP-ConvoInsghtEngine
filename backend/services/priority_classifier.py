"""
Priority classification — maps cluster intent to urgent / moderate / low buckets.
Displays original message text, not cluster summaries.
"""

from typing import Dict, List, Tuple

from backend.schemas.analysis import PrioritiesOut, PriorityItem

# Intent → default priority bucket
_INTENT_BUCKET = {
    "complaint": "urgent",
    "request": "urgent",
    "question": "moderate",
    "information": "low",
    "greeting": "low",
    "other": "low",
}

# Keywords that bump priority up one level (checked on original text)
_URGENT_KEYWORDS = (
    "urgent",
    "asap",
    "immediately",
    "deadline",
    "emergency",
    "critical",
    "today",
)


def _bump_bucket(bucket: str) -> str:
    if bucket == "low":
        return "moderate"
    if bucket == "moderate":
        return "urgent"
    return "urgent"


def _cluster_bucket(intent: str, original_text: str) -> str:
    bucket = _INTENT_BUCKET.get(intent, "low")
    lower = original_text.lower()
    if any(kw in lower for kw in _URGENT_KEYWORDS):
        bucket = _bump_bucket(bucket)
    return bucket


def _original_messages(cluster: dict, fallback_sender: str) -> List[Tuple[str, str]]:
    """Return (sender, content) pairs from cluster — never summarized text."""
    messages = cluster.get("messages") or []
    out: List[Tuple[str, str]] = []
    for msg in messages:
        content = (msg.get("content") or "").strip()
        if not content:
            continue
        sender = (msg.get("sender") or fallback_sender).strip() or fallback_sender
        out.append((sender, content))

    if out:
        return out

    original = (cluster.get("original_text") or "").strip()
    if original:
        return [(fallback_sender, original)]

    return []


def classify_priorities(sender_summaries: dict) -> PrioritiesOut:
    """
    Classify original messages into priority buckets using cluster intent.
    Summary text is used only for skipping empty clusters, not shown in output.
    """
    urgent: List[PriorityItem] = []
    moderate: List[PriorityItem] = []
    low: List[PriorityItem] = []

    for sender, data in sender_summaries.items():
        for cluster in data.get("clusters", []):
            summary = cluster.get("summary", "").strip()
            if not summary or summary == "No content to summarise.":
                continue

            intent = (cluster.get("intent") or "other").lower()
            originals = _original_messages(cluster, sender)
            if not originals:
                continue

            for msg_sender, content in originals:
                # Per-message keyword bump
                msg_bucket = _cluster_bucket(intent, content)

                item = PriorityItem(
                    sender=msg_sender,
                    text=content,
                    intent=intent,
                    cluster_id=cluster.get("cluster_id"),
                    message_count=1,
                )

                if msg_bucket == "urgent":
                    urgent.append(item)
                elif msg_bucket == "moderate":
                    moderate.append(item)
                else:
                    low.append(item)

    return PrioritiesOut(urgent=urgent, moderate=moderate, low=low)
