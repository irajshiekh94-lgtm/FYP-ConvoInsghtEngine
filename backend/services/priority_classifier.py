"""
Priority classification — maps cluster intent to urgent / moderate / low buckets.
Displays original message text, not cluster summaries.
"""

from typing import Dict, List, Tuple

from backend.schemas.analysis import PrioritiesOut, PriorityItem

# Intent → default priority bucket (time cues below can raise this)
_INTENT_BUCKET = {
    "complaint": "urgent",   # problems / dissatisfaction need attention
    "request": "moderate",   # someone wants something done → moderate by default
    "question": "moderate",  # needs an answer
    "information": "low",     # FYI / status updates
    "greeting": "low",
    "other": "low",
}

_BUCKET_RANK = {"low": 0, "moderate": 1, "urgent": 2}
_RANK_BUCKET = {0: "low", 1: "moderate", 2: "urgent"}

# Time-sensitive cues. Anything happening NOW/TODAY is the most urgent; things
# scheduled for TOMORROW are moderate; later days carry no extra urgency.
_TODAY_KEYWORDS = (
    "today",
    "tonight",
    "right now",
    "now",
    "asap",
    "immediately",
    "urgent",
    "emergency",
    "critical",
    "deadline",
)
_TOMORROW_KEYWORDS = (
    "tomorrow",
    "tmrw",
    "next morning",
)


def _bump_bucket(bucket: str) -> str:
    return _RANK_BUCKET[min(_BUCKET_RANK[bucket] + 1, 2)]


def _at_least(bucket: str, floor: str) -> str:
    return _RANK_BUCKET[max(_BUCKET_RANK[bucket], _BUCKET_RANK[floor])]


def _cluster_bucket(intent: str, original_text: str) -> str:
    bucket = _INTENT_BUCKET.get(intent, "low")
    lower = original_text.lower()

    # Today / now / asap → urgent. Tomorrow → at least moderate.
    if any(kw in lower for kw in _TODAY_KEYWORDS):
        bucket = "urgent"
    elif any(kw in lower for kw in _TOMORROW_KEYWORDS):
        bucket = _at_least(bucket, "moderate")

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
