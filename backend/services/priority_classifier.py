"""
Priority classification — maps cluster summaries + intents to urgent / moderate / low.
"""

from typing import Dict, List

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

# Keywords that bump priority up one level
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


def classify_priorities(sender_summaries: dict) -> PrioritiesOut:
    """
    Build priority buckets from per-sender summarized clusters (with intent set).
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
            bucket = _INTENT_BUCKET.get(intent, "low")

            lower = summary.lower()
            if any(kw in lower for kw in _URGENT_KEYWORDS):
                bucket = _bump_bucket(bucket)

            item = PriorityItem(
                sender=sender,
                text=summary,
                intent=intent,
                cluster_id=cluster.get("cluster_id"),
                message_count=cluster.get("message_count", 0),
            )

            if bucket == "urgent":
                urgent.append(item)
            elif bucket == "moderate":
                moderate.append(item)
            else:
                low.append(item)

    return PrioritiesOut(urgent=urgent, moderate=moderate, low=low)
