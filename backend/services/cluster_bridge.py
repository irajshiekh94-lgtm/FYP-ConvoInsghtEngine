"""
Bridge between clustering output and summarization input.

Messages are already cleaned in message_cleaner — this module only shapes clusters.
"""


def shape_clusters(raw_clusters: list) -> list:
    """
    ClusteringService returns: [ [msg, msg, …], [msg, …] ]
    SummarizationService needs: [ {cluster_id, senders, combined_text, message_count} ]
    """
    shaped = []
    for i, cluster in enumerate(raw_clusters):
        text_msgs = [
            m
            for m in cluster
            if m.get("messageType", "text") == "text" and m.get("content", "").strip()
        ]
        senders = list({m.get("sender", "Unknown") for m in cluster})

        normalised_parts = [m["content"] for m in text_msgs]
        combined = " ".join(normalised_parts)

        shaped.append(
            {
                "cluster_id": i,
                "senders": senders,
                "message_count": len(cluster),
                "combined_text": combined,
            }
        )
    return shaped
