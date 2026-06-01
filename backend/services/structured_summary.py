"""
Build structured conversation summary from cluster-level summaries (not raw chat).
"""

import re
from typing import List

from backend.schemas.analysis import ConversationSummaryOut

_SKIP = {
    "no content to summarise.",
    "error generating summary.",
}

_DECISION_PATTERN = re.compile(
    r"\b(decided|agreed|confirmed|approved|deadline|will deliver|scheduled|plan to|"
    r"commit|finalize|signed off|go ahead)\b",
    re.I,
)


def _usable_cluster_summaries(sender_summaries: dict) -> List[tuple]:
    """(sender, summary_text) pairs from clustered topics only."""
    items: List[tuple] = []
    for sender, data in sender_summaries.items():
        for cluster in data.get("clusters", []):
            text = (cluster.get("summary") or "").strip()
            if not text or text.lower() in _SKIP:
                continue
            items.append((sender, text))
    return items


def build_structured_summary(
    sender_summaries: dict,
    priorities_urgent: List,
) -> ConversationSummaryOut:
    """
    Themes = one per cluster topic summary (abstractive, not raw quotes).
    Key decisions = cluster lines that mention decisions/agreements.
    Important messages = urgent priority items + high-signal cluster lines.
    """
    clusters = _usable_cluster_summaries(sender_summaries)

    themes: List[str] = []
    seen_themes = set()
    for sender, text in clusters:
        line = f"{sender}: {text}" if sender not in text else text
        key = line[:100].lower()
        if key not in seen_themes:
            seen_themes.add(key)
            themes.append(line[:280])

    key_decisions: List[str] = []
    for sender, text in clusters:
        if _DECISION_PATTERN.search(text):
            key_decisions.append(f"{sender}: {text[:220]}")

    important_messages: List[str] = []
    for item in priorities_urgent:
        line = f"{item.sender}: {item.text}"
        if line not in important_messages:
            important_messages.append(line[:280])

    if len(important_messages) < 3:
        for sender, text in clusters[:5]:
            lower = text.lower()
            if any(
                w in lower
                for w in ("urgent", "asap", "important", "must", "critical", "deadline")
            ):
                candidate = f"{sender}: {text[:220]}"
                if candidate not in important_messages:
                    important_messages.append(candidate)

    if themes:
        overview = "Main themes: " + "; ".join(t[:80] for t in themes[:4])
        if len(overview) > 400:
            overview = overview[:397] + "…"
    else:
        overview = "No significant conversation themes detected."

    return ConversationSummaryOut(
        themes=themes[:12],
        key_decisions=key_decisions[:8],
        important_messages=important_messages[:8],
        overview=overview,
    )
