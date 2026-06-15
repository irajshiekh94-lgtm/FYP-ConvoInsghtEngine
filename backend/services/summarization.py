"""
Abstractive Summarization Service - ConvoInsight
Uses Meta Llama (Ollama / Groq / Together) to summarise clustered WhatsApp messages.
"""

import os
import logging
from typing import Optional

from backend.services.voice_content import strip_voice_tags_from_summary

logger = logging.getLogger(__name__)

_local_pipeline = None

try:
    from transformers import pipeline
    HF_AVAILABLE = True
except Exception:
    pipeline = None  # type: ignore
    HF_AVAILABLE = False

try:
    from backend.services.llama_service import LlamaServiceError, llama_service
    LLAMA_AVAILABLE = True
except Exception:
    llama_service = None  # type: ignore
    LLAMA_AVAILABLE = False


def _rule_based_summary(cluster_data: dict) -> str:
    combined = cluster_data.get("combined_text", "").strip()
    senders = cluster_data.get("senders", [])
    who = ", ".join(senders) if senders else "Someone"
    if len(combined) < 20:
        return f"{who} sent a brief message."
    snippet = combined[:200]
    suffix = "…" if len(combined) > 200 else ""
    return f"{who} discussed: {snippet}{suffix}"


class SummarizationService:

    def __init__(self):
        self.local_model_name = os.getenv("LOCAL_SUMMARIZER_MODEL", "sshleifer/distilbart-cnn-12-6")
        self.local_pipeline: Optional[object] = None
        self.llama_available = LLAMA_AVAILABLE and llama_service is not None and llama_service.available

        prefer_local_env = os.getenv("PREFER_LOCAL_SUMMARIZER")
        if prefer_local_env is None:
            self.prefer_local = not self.llama_available
        else:
            self.prefer_local = prefer_local_env.lower() not in ("0", "false", "no")

        if self.prefer_local and not HF_AVAILABLE:
            logger.warning(
                "PREFER_LOCAL_SUMMARIZER requested but transformers not available; "
                "falling back to Llama if configured"
            )

    def summarize_cluster(self, cluster_data: dict) -> str:
        return strip_voice_tags_from_summary(self._summarize_cluster(cluster_data)).strip() or (
            "No content to summarise."
        )

    def _summarize_cluster(self, cluster_data: dict) -> str:
        if not cluster_data.get("combined_text", "").strip():
            return "No content to summarise."

        topic_text = strip_voice_tags_from_summary(cluster_data["combined_text"][:2000])
        dialogue = topic_text
        if not dialogue.strip() and cluster_data.get("messages"):
            from backend.services.cluster_bridge import format_cluster_dialogue

            dialogue = format_cluster_dialogue(cluster_data["messages"])[:2000]

        senders = cluster_data.get("senders") or []
        sender_list = ", ".join(senders) if senders else "Unknown"
        multi_speaker = len(senders) > 1

        prompt = f"""You summarize ONE topic thread from a WhatsApp chat (already grouped by topic).

Participants in this thread: {sender_list}
Messages in thread: {cluster_data['message_count']}
{"Multiple speakers — preserve who said what." if multi_speaker else "Single speaker — note anyone they mention by name."}

Conversation (chronological, speaker-labelled):
---
{dialogue}
---

Rules:
- Summarize the thread in 2-3 sentences using your own words.
- ALWAYS attribute actions, requests, and decisions to the correct speaker by name.
- Format assignments clearly when present (e.g. "Alice asked Bob to send the invoice by Friday").
- If one speaker quotes or refers to another person, keep both names in the summary.
- Do NOT invent names, dates, or facts not in the dialogue.
- Do NOT copy long verbatim quotes from the messages.

Summary:"""

        use_local = self.prefer_local and HF_AVAILABLE
        if use_local:
            try:
                if self.local_pipeline is None:
                    logger.info("Initializing local summarizer model: %s", self.local_model_name)
                    self.local_pipeline = pipeline("summarization", model=self.local_model_name)
                out = self.local_pipeline(topic_text, max_length=120, min_length=8)
                if out and isinstance(out, list) and "summary_text" in out[0]:
                    return out[0]["summary_text"].strip()
                if out and isinstance(out, list) and "generated_text" in out[0]:
                    return out[0]["generated_text"].strip()
            except Exception as e:
                logger.error("Local summarizer failed: %s", e)

        if self.llama_available and llama_service is not None:
            try:
                return llama_service.generate(prompt, max_tokens=120, temperature=0.3).strip()
            except LlamaServiceError as e:
                logger.error("[SummarizationService] Llama error: %s", e)

        return _rule_based_summary(cluster_data)

    def summarize_by_sender(
        self, clusters: list, current_user: str, *, include_current_user: bool = False
    ) -> dict:
        sender_summaries: dict = {}

        for cluster in clusters:
            if not cluster.get("senders"):
                continue

            sender = cluster["senders"][0]
            if sender == current_user and not include_current_user:
                continue

            if sender not in sender_summaries:
                sender_summaries[sender] = {"clusters": [], "total_messages": 0}

            summary = self.summarize_cluster(cluster)
            sender_summaries[sender]["clusters"].append({
                "cluster_id": cluster["cluster_id"],
                "summary": summary,
                "message_count": cluster["message_count"],
                "messages": cluster.get("messages", []),
                "original_text": cluster.get("combined_text", ""),
            })
            sender_summaries[sender]["total_messages"] += cluster["message_count"]

        return sender_summaries

    @staticmethod
    def summarize_by_sender_rule_based(
        clusters: list, current_user: str, *, include_current_user: bool = False
    ) -> dict:
        sender_summaries: dict = {}
        for cluster in clusters:
            if not cluster.get("senders"):
                continue
            sender = cluster["senders"][0]
            if sender == current_user and not include_current_user:
                continue
            if sender not in sender_summaries:
                sender_summaries[sender] = {"clusters": [], "total_messages": 0}
            summary = _rule_based_summary(cluster)
            sender_summaries[sender]["clusters"].append(
                {
                    "cluster_id": cluster["cluster_id"],
                    "summary": summary,
                    "message_count": cluster["message_count"],
                    "messages": cluster.get("messages", []),
                    "original_text": cluster.get("combined_text", ""),
                }
            )
            sender_summaries[sender]["total_messages"] += cluster["message_count"]
        return sender_summaries
