"""
Actionable item extraction from classified summaries.
"""

import uuid
from typing import List

from backend.schemas.analysis import ActionItem, PrioritiesOut

_ACTION_INTENTS = {"question", "request", "complaint"}

_MEETING_PATTERN = ("meet", "meeting", "call", "schedule", "zoom", "calendar")
_ORDER_PATTERN = ("order", "purchase", "invoice", "delivery", "payment", "units")


def _intent_to_type(intent: str) -> str:
    if intent == "request":
        return "follow-up"
    if intent == "question":
        return "task"
    if intent == "complaint":
        return "reminder"
    return "task"


def _intent_to_urgency(intent: str) -> str:
    if intent in ("complaint", "request"):
        return "high"
    if intent == "question":
        return "medium"
    return "low"


def _make_action(sender: str, summary: str, intent: str) -> ActionItem:
    return ActionItem(
        id=str(uuid.uuid4())[:8],
        type=_intent_to_type(intent),
        description=summary,
        sender=sender,
        urgency=_intent_to_urgency(intent),
        source_summary=summary,
    )


def extract_actions(sender_summaries: dict, priorities: PrioritiesOut) -> List[ActionItem]:
    """
    Pull actionable items from intents and high-priority summaries.
    """
    seen: set = set()
    actions: List[ActionItem] = []

    for sender, data in sender_summaries.items():
        for cluster in data.get("clusters", []):
            summary = (cluster.get("summary") or "").strip()
            intent = (cluster.get("intent") or "other").lower()

            if not summary:
                continue

            key = (sender, summary[:80])
            if key in seen:
                continue

            lower = summary.lower()
            is_actionable = intent in _ACTION_INTENTS
            is_meeting = any(w in lower for w in _MEETING_PATTERN)
            is_order = any(w in lower for w in _ORDER_PATTERN)

            if not (is_actionable or is_meeting or is_order):
                continue

            seen.add(key)
            action = _make_action(sender, summary, intent)

            if is_meeting and action.type == "task":
                action.type = "follow-up"
            if is_order:
                action.type = "follow-up"
                action.urgency = "high"

            actions.append(action)

    # Also surface urgent priority items that weren't captured
    for item in priorities.urgent:
        key = (item.sender, item.text[:80])
        if key in seen:
            continue
        seen.add(key)
        actions.append(_make_action(item.sender, item.text, item.intent))

    return actions
