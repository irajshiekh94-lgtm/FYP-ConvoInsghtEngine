"""
Bridge between clustering output and summarization input.
Preserves per-message speaker attribution in cluster text.
"""


def format_cluster_dialogue(messages: list) -> str:
    """Chronological speaker-labelled lines for summarization."""
    lines: list[str] = []
    for msg in messages:
        content = (msg.get("content") or "").strip()
        if not content:
            continue
        sender = (msg.get("sender") or "Unknown").strip()
        lines.append(f"{sender}: {content}")
    return "\n".join(lines)


def shape_clusters(raw_clusters: list) -> list:
    """
    ClusteringService returns: [ [msg, msg, …], [msg, …] ]
    SummarizationService needs: [ {cluster_id, senders, combined_text, message_count, messages} ]
    """
    shaped = []
    for i, cluster in enumerate(raw_clusters):
        content_msgs = [
            m
            for m in cluster
            if m.get("messageType", "text") in ("text", "voice")
            and (m.get("content") or "").strip()
        ]
        senders = list(dict.fromkeys(m.get("sender", "Unknown") for m in content_msgs))

        messages = [
            {"sender": m.get("sender", "Unknown"), "content": m["content"].strip()}
            for m in content_msgs
        ]
        combined = format_cluster_dialogue(messages)

        shaped.append(
            {
                "cluster_id": i,
                "senders": senders,
                "message_count": len(content_msgs),
                "combined_text": combined,
                "messages": messages,
            }
        )
    return shaped
