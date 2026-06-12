"""
ConvoInsight analysis pipeline (strict order):

  1. Parse WhatsApp export
  2. Clean messages
  3. Structure (MessageOut)
  4. Cluster topics
  5. Summarize clusters (normalized topic text only — never raw export)
  6. Classify intent
  7. Priority classification
  8. Extract actions
  9. Return standard JSON
"""

import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from backend.schemas.analysis import (
    ActionItem,
    AnalysisResult,
    MessageOut,
    PrioritiesOut,
)
from backend.services.action_extractor import extract_actions
from backend.services.cluster_bridge import shape_clusters
from backend.services.clustering import ClusteringService
from backend.services.intentpipeline import classify_all
from backend.services.insight_enrichment import (
    analyze_sentiment,
    build_analytics,
    build_metadata,
    extract_entities,
    extract_topics,
)
from backend.services.message_cleaner import clean_messages
from backend.services.priority_classifier import classify_priorities
from backend.services.structured_summary import build_structured_summary
from backend.services.summarization import SummarizationService
from backend.services.whatsapp_parser import parse_chat_from_text

logger = logging.getLogger(__name__)

_clustering = ClusteringService()
_summarization: Optional[SummarizationService] = None


def _get_summarization() -> SummarizationService:
    global _summarization
    if _summarization is None:
        _summarization = SummarizationService()
    return _summarization


def _summarize_clusters(shaped_clusters: list, current_user: str) -> dict:
    max_ml_clusters = int(os.getenv("MAX_ML_SUMMARIZE_CLUSTERS", "20"))
    if len(shaped_clusters) > max_ml_clusters:
        logger.info(
            "Skipping slow ML summarization for %d clusters (cap %d); using fast rule-based summaries",
            len(shaped_clusters),
            max_ml_clusters,
        )
        return SummarizationService.summarize_by_sender_rule_based(
            shaped_clusters, current_user
        )
    try:
        return _get_summarization().summarize_by_sender(shaped_clusters, current_user)
    except EnvironmentError as exc:
        logger.warning("Summarization unavailable (%s); using rule-based fallback", exc)
        return SummarizationService.summarize_by_sender_rule_based(
            shaped_clusters, current_user
        )


def _messages_to_schema(cleaned: List[dict]) -> List[MessageOut]:
    out: List[MessageOut] = []
    for msg in cleaned:
        ts = msg.get("timestamp")
        if isinstance(ts, datetime):
            ts = ts.isoformat()
        out.append(
            MessageOut(
                sender=msg.get("sender", "Unknown"),
                content=msg.get("content", ""),
                timestamp=ts,
                messageType=msg.get("messageType", "text"),
                rawTimestamp=msg.get("rawTimestamp"),
            )
        )
    return out


def run_analysis_pipeline(
    raw_text: str,
    chat_name: str = "Uploaded Chat",
    current_user: str = "Me",
) -> Tuple[AnalysisResult, Dict[str, Any]]:
    if not raw_text.strip():
        raise ValueError("rawText is empty")

    # 1. Parse
    parsed = parse_chat_from_text(raw_text, chat_name)
    raw_messages = parsed["messages"]
    logger.info("Step 1 parse: %d messages", len(raw_messages))

    if not raw_messages:
        raise ValueError(
            "No messages parsed. Check WhatsApp export format (DD/MM/YYYY, time - Sender: message)."
        )

    # 2. Clean
    cleaned = clean_messages(raw_messages)
    logger.info("Step 2 clean: %d messages", len(cleaned))

    if not cleaned:
        raise ValueError("No usable text messages after cleaning.")

    # 3. Structure
    structured_messages = _messages_to_schema(cleaned)
    logger.info("Step 3 structure: %d messages", len(structured_messages))

    # 4. Cluster
    raw_clusters = _clustering.aggregate_messages(cleaned, current_user)
    shaped = shape_clusters(raw_clusters)
    logger.info("Step 4 cluster: %d clusters", len(shaped))

    # 5. Summarize (cluster topic text only)
    sender_summaries = _summarize_clusters(shaped, current_user)
    logger.info("Step 5 summarize: %d senders", len(sender_summaries))

    # 6. Intent
    sender_summaries = classify_all(sender_summaries)
    logger.info("Step 6 intent classified")

    # 7. Priorities
    priorities = classify_priorities(sender_summaries)
    logger.info(
        "Step 7 priorities: urgent=%d moderate=%d low=%d",
        len(priorities.urgent),
        len(priorities.moderate),
        len(priorities.low),
    )

    # 8. Actions
    actions = extract_actions(sender_summaries, priorities)
    logger.info("Step 8 actions: %d", len(actions))

    # 9. Enrichments
    entities = extract_entities(cleaned, parsed.get("participants", []))
    topics = extract_topics(shaped)
    sentiment = analyze_sentiment(cleaned)
    analytics = build_analytics(
        cleaned,
        parsed.get("participants", []),
        priorities,
        actions,
        topics,
        entities,
    )
    metadata = build_metadata(
        parsed.get("chatName", chat_name),
        parsed.get("chatType", "individual"),
        parsed.get("participants", []),
        current_user,
    )
    logger.info(
        "Step 9 enrich: entities=%d topics=%d sentiment=%s",
        len(entities),
        len(topics),
        sentiment.label,
    )

    # Structured summary (from cluster summaries + priorities)
    conversation_summary = build_structured_summary(
        sender_summaries, priorities.urgent
    )

    result = AnalysisResult(
        messages=structured_messages,
        summary=conversation_summary.overview,
        conversation_summary=conversation_summary,
        priorities=priorities,
        actions=actions,
        entities=entities,
        topics=topics,
        sentiment=sentiment,
        analytics=analytics,
        metadata=metadata,
    )

    meta = {
        "chatName": parsed.get("chatName", chat_name),
        "chatType": parsed.get("chatType", "individual"),
        "participants": parsed.get("participants", []),
        "messageCount": len(structured_messages),
        "sender_summaries": sender_summaries,
    }

    return result, meta


def flatten_summaries_for_legacy(sender_summaries: dict) -> List[dict]:
    items = []
    for sender, data in sender_summaries.items():
        for cluster in data.get("clusters", []):
            items.append(
                {
                    "sender": sender,
                    "summary": cluster.get("summary", ""),
                    "intent": cluster.get("intent", "other"),
                    "cluster_id": cluster.get("cluster_id"),
                    "message_count": cluster.get("message_count", 0),
                }
            )
    return items
