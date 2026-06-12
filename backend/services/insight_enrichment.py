"""
Deterministic enrichment for processed chat output.

These helpers avoid external AI dependencies so every upload returns visible
entities, topics, sentiment, analytics, and metadata.
"""

from __future__ import annotations

import re
from collections import Counter
from datetime import datetime
from typing import Dict, Iterable, List

from backend.schemas.analysis import (
    ActionItem,
    AnalyticsOut,
    EntityOut,
    MetadataOut,
    PrioritiesOut,
    SentimentOut,
    TopicOut,
)

_EMAIL_RE = re.compile(r"\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b")
_PHONE_RE = re.compile(r"(?:\+?\d[\d\s-]{7,}\d)")
_MONEY_RE = re.compile(r"\b(?:rs|pkr|\$)\s?\d[\d,]*(?:\.\d+)?\b", re.I)
_DATE_RE = re.compile(
    r"\b(?:today|tomorrow|friday|monday|tuesday|wednesday|thursday|saturday|"
    r"sunday|\d{1,2}/\d{1,2}/\d{2,4})\b",
    re.I,
)
_NAME_RE = re.compile(r"\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?\b")
_WORD_RE = re.compile(r"\b[a-zA-Z][a-zA-Z]{3,}\b")

_STOPWORDS = {
    "about",
    "also",
    "chat",
    "from",
    "have",
    "message",
    "need",
    "please",
    "send",
    "that",
    "this",
    "today",
    "tomorrow",
    "with",
    "will",
}

_POSITIVE = {
    "approved",
    "confirmed",
    "done",
    "good",
    "great",
    "ok",
    "ready",
    "thanks",
    "yes",
}

_NEGATIVE = {
    "angry",
    "blocked",
    "complaint",
    "delay",
    "failed",
    "issue",
    "late",
    "problem",
    "urgent",
}


def _count_entities(messages: List[dict]) -> Dict[tuple, int]:
    counts: Counter[tuple] = Counter()
    senders = {m.get("sender", "") for m in messages}

    for msg in messages:
        text = msg.get("content", "") or ""
        for value in _EMAIL_RE.findall(text):
            counts[(value, "email")] += 1
        for value in _PHONE_RE.findall(text):
            counts[(value.strip(), "phone")] += 1
        for value in _MONEY_RE.findall(text):
            counts[(value.strip(), "money")] += 1
        for value in _DATE_RE.findall(text):
            counts[(value.strip(), "date")] += 1
        for value in _NAME_RE.findall(text):
            if value not in senders:
                counts[(value.strip(), "person")] += 1

    return dict(counts)


def extract_entities(messages: List[dict], participants: Iterable[str]) -> List[EntityOut]:
    counts = _count_entities(messages)
    for participant in participants:
        if participant:
            counts[(participant, "participant")] = max(
                counts.get((participant, "participant"), 0),
                1,
            )

    return [
        EntityOut(text=text, type=entity_type, count=count)
        for (text, entity_type), count in sorted(
            counts.items(), key=lambda item: (-item[1], item[0][1], item[0][0].lower())
        )
    ]


def _keywords(text: str, limit: int = 5) -> List[str]:
    words = [
        word.lower()
        for word in _WORD_RE.findall(text)
        if word.lower() not in _STOPWORDS
    ]
    return [word for word, _ in Counter(words).most_common(limit)]


def extract_topics(shaped_clusters: List[dict]) -> List[TopicOut]:
    topics: List[TopicOut] = []
    for cluster in shaped_clusters:
        text = cluster.get("combined_text", "")
        keywords = _keywords(text)
        title = ", ".join(keywords[:3]) if keywords else "General discussion"
        topics.append(
            TopicOut(
                id=int(cluster.get("cluster_id", len(topics))),
                title=title.title(),
                senders=cluster.get("senders", []),
                message_count=int(cluster.get("message_count", 0)),
                keywords=keywords,
            )
        )
    return topics


def analyze_sentiment(messages: List[dict]) -> SentimentOut:
    positive = 0
    negative = 0
    neutral = 0

    for msg in messages:
        words = {word.lower() for word in _WORD_RE.findall(msg.get("content", ""))}
        pos_hits = len(words.intersection(_POSITIVE))
        neg_hits = len(words.intersection(_NEGATIVE))
        if pos_hits > neg_hits:
            positive += 1
        elif neg_hits > pos_hits:
            negative += 1
        else:
            neutral += 1

    total = max(positive + negative + neutral, 1)
    score = round((positive - negative) / total, 3)
    if score >= 0.2:
        label = "positive"
    elif score <= -0.2:
        label = "negative"
    else:
        label = "neutral"

    return SentimentOut(
        label=label,
        score=score,
        positive_count=positive,
        negative_count=negative,
        neutral_count=neutral,
    )


def build_analytics(
    messages: List[dict],
    participants: List[str],
    priorities: PrioritiesOut,
    actions: List[ActionItem],
    topics: List[TopicOut],
    entities: List[EntityOut],
) -> AnalyticsOut:
    by_sender = Counter(m.get("sender", "Unknown") for m in messages)
    return AnalyticsOut(
        total_messages=len(messages),
        total_participants=len(participants),
        messages_by_sender=dict(by_sender),
        action_count=len(actions),
        urgent_count=len(priorities.urgent),
        topic_count=len(topics),
        entity_count=len(entities),
    )


def build_metadata(
    chat_name: str,
    chat_type: str,
    participants: List[str],
    current_user: str,
) -> MetadataOut:
    return MetadataOut(
        chat_name=chat_name,
        chat_type=chat_type,
        participants=participants,
        current_user=current_user,
        processed_at=datetime.utcnow().isoformat(),
    )
