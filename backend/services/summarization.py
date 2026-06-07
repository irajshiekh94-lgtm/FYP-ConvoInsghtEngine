"""
Abstractive Summarization Service - ConvoInsight
Uses Gemini to summarise clustered WhatsApp messages.
"""

import os
import time
import logging
from typing import Optional

logger = logging.getLogger(__name__)

_local_pipeline = None

try:
    from transformers import pipeline
    HF_AVAILABLE = True
except Exception:
    pipeline = None  # type: ignore
    HF_AVAILABLE = False

try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except ImportError:
    genai = None  # type: ignore
    GENAI_AVAILABLE = False


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
        # Choose summarizer: local HF model if requested or if GEMINI not configured.
        self.prefer_local = os.getenv("PREFER_LOCAL_SUMMARIZER", "1").lower() not in ("0", "false", "no")
        self.local_model_name = os.getenv("LOCAL_SUMMARIZER_MODEL", "sshleifer/distilbart-cnn-12-6")
        self.local_pipeline: Optional[object] = None

        api_key = os.getenv("GEMINI_API_KEY")
        self.gemini_available = GENAI_AVAILABLE and bool(api_key)

        # Configure Gemini if available
        if self.gemini_available:
            try:
                genai.configure(api_key=api_key)
                self.model = genai.GenerativeModel("models/gemini-2.5-flash")
            except Exception as e:
                logger.warning("Could not configure Gemini: %s", e)
                self.gemini_available = False

        # If we prefer local and HF is available, keep pipeline lazy-loaded
        if self.prefer_local and not HF_AVAILABLE:
            logger.warning("PREFER_LOCAL_SUMMARIZER requested but transformers not available; falling back to Gemini if configured")

    def summarize_cluster(self, cluster_data: dict) -> str:
        """
        Generate an abstractive summary for one cluster.

        cluster_data must contain:
            - senders       : list[str]
            - message_count : int
            - combined_text : str
        """
        # Safety guard — nothing to summarise
        if not cluster_data.get("combined_text", "").strip():
            return "No content to summarise."

        topic_text = cluster_data["combined_text"][:1500]

        prompt = f"""You summarize ONE topic thread from a WhatsApp chat (already grouped by topic).

Participants in this thread: {', '.join(cluster_data['senders'])}
Messages in thread: {cluster_data['message_count']}

Normalized messages in this thread (do not quote them word-for-word):
---
{topic_text}
---

Rules:
- Summarize ONLY what this thread is about (theme + intent).
- Use your own words. Maximum 2 short sentences.
- Do NOT copy long phrases from the messages.
- Do NOT invent names, dates, amounts, or decisions not implied above.
- If the thread is only greetings, say it is a brief check-in.

Summary:"""

        # Global in-process cooldown to avoid repeated Gemini 429s
        cooldown_sec = int(os.getenv("GEMINI_COOLDOWN_SECONDS", "30"))
        global _gemini_disabled_until
        if "_gemini_disabled_until" in globals() and time.time() < _gemini_disabled_until:
            logger.warning("SummarizationService: using rule-based fallback (in cooldown)")
            return _rule_based_summary(cluster_data)

        # If local summarizer is preferred and available, use it (lazy load pipeline)
        use_local = self.prefer_local and HF_AVAILABLE
        if use_local:
            try:
                if self.local_pipeline is None:
                    logger.info("Initializing local summarizer model: %s", self.local_model_name)
                    self.local_pipeline = pipeline("summarization", model=self.local_model_name)
                out = self.local_pipeline(topic_text, max_length=120, min_length=8)
                if out and isinstance(out, list) and "summary_text" in out[0]:
                    return out[0]["summary_text"].strip()
                # transformers may return {'summary_text'} or {'generated_text'} depending on version
                if out and isinstance(out, list) and "generated_text" in out[0]:
                    return out[0]["generated_text"].strip()
            except Exception as e:
                logger.error("Local summarizer failed: %s", e)
                # fall through to Gemini if available, otherwise fallback

        # If Gemini is available, try it and apply cooldown on quota errors
        if self.gemini_available:
            try:
                response = self.model.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.3,
                        top_p=0.85,
                        max_output_tokens=120,
                    ),
                )
                return response.text.strip()
            except Exception as e:
                msg = str(e).lower()
                logger.error("[SummarizationService] Error: %s", e)
                if "429" in msg or "quota" in msg or "rate" in msg:
                    _gemini_disabled_until = time.time() + cooldown_sec
                    logger.warning("SummarizationService: Gemini rate-limited — entering cooldown for %s seconds", cooldown_sec)

        # Final fallback: rule-based summary
        return _rule_based_summary(cluster_data)

    def summarize_by_sender(self, clusters: list, current_user: str) -> dict:
        """
        Summarise all clusters, grouped by sender (excluding current_user).

        Args:
            clusters    : list of shaped cluster dicts
                          [{cluster_id, senders, combined_text, message_count}]
            current_user: sender name to exclude

        Returns:
            {
                sender_name: {
                    'clusters': [{'cluster_id', 'summary', 'message_count', 'intent'}],
                    'total_messages': int
                }
            }
        """
        sender_summaries: dict = {}

        for cluster in clusters:
            if not cluster.get("senders"):
                continue

            sender = cluster["senders"][0]

            # Skip current user's own messages
            if sender == current_user:
                continue

            if sender not in sender_summaries:
                sender_summaries[sender] = {"clusters": [], "total_messages": 0}

            summary = self.summarize_cluster(cluster)

            sender_summaries[sender]["clusters"].append({
                "cluster_id": cluster["cluster_id"],
                "summary": summary,
                "message_count": cluster["message_count"],
            })
            sender_summaries[sender]["total_messages"] += cluster["message_count"]

        return sender_summaries

    @staticmethod
    def summarize_by_sender_rule_based(clusters: list, current_user: str) -> dict:
        """Fallback when Gemini is unavailable — topic snippets only."""
        sender_summaries: dict = {}
        for cluster in clusters:
            if not cluster.get("senders"):
                continue
            sender = cluster["senders"][0]
            if sender == current_user:
                continue
            if sender not in sender_summaries:
                sender_summaries[sender] = {"clusters": [], "total_messages": 0}
            summary = _rule_based_summary(cluster)
            sender_summaries[sender]["clusters"].append(
                {
                    "cluster_id": cluster["cluster_id"],
                    "summary": summary,
                    "message_count": cluster["message_count"],
                }
            )
            sender_summaries[sender]["total_messages"] += cluster["message_count"]
        return sender_summaries