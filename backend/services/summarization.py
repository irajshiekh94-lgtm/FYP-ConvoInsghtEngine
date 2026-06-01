"""
Abstractive Summarization Service - ConvoInsight
Uses Gemini to summarise clustered WhatsApp messages.
"""

import os
import google.generativeai as genai


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
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise EnvironmentError("GEMINI_API_KEY environment variable is not set.")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel("models/gemini-2.5-flash")

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
            print(f"[SummarizationService] Error: {e}")
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