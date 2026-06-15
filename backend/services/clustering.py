"""
Message Clustering Service - ConvoInsight
"""

from datetime import datetime


class ClusteringService:

    @staticmethod
    def calculate_similarity(text1: str, text2: str) -> float:
        """
        TF-IDF cosine similarity between two strings.
        Returns 0.0 on any error (e.g. empty strings, single-token vocab).
        """
        # Guard: both texts must be non-empty after stripping
        if not text1.strip() or not text2.strip():
            return 0.0

        if text1.strip().lower() == text2.strip().lower():
            return 1.0

        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.metrics.pairwise import cosine_similarity

            vectorizer = TfidfVectorizer()
            tfidf_matrix = vectorizer.fit_transform([text1, text2])
            score = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])
            return float(score[0][0])
        except ImportError:
            tokens1 = set(text1.lower().split())
            tokens2 = set(text2.lower().split())
            if not tokens1 or not tokens2:
                return 0.0
            overlap = tokens1.intersection(tokens2)
            union = tokens1.union(tokens2)
            return float(len(overlap) / len(union)) if union else 0.0
        except Exception:
            return 0.0

    @staticmethod
    def _to_datetime(ts) -> datetime:
        """Normalise a timestamp to datetime, supporting multiple input types."""
        if isinstance(ts, datetime):
            return ts
        if isinstance(ts, str):
            for fmt in ("%Y-%m-%d %H:%M:%S", "%d/%m/%Y %I:%M %p"):
                try:
                    return datetime.strptime(ts, fmt)
                except ValueError:
                    continue
        # Fallback — treat as epoch 0 so the message still gets clustered
        return datetime(1970, 1, 1)

    @staticmethod
    def aggregate_messages(
        messages: list,
        current_user: str,
        time_threshold: int = 5,
        similarity_threshold: float = 0.4,
        include_current_user: bool = False,
    ) -> list:
        """
        Group incoming messages into clusters.

        Rules (in order):
          1. Skip messages from current_user (unless include_current_user).
          2. Skip media / deleted messages (no content to cluster on).
          3. Two consecutive messages belong to the same cluster if:
             a. time gap ≤ time_threshold minutes AND similarity ≥ similarity_threshold, OR
             b. time gap ≤ 5 minutes AND same sender (burst of messages).

        Returns:
            List of clusters, where each cluster is a list of message dicts.
        """
        if not messages:
            return []

        # Keep analyzable text messages (voice notes / solo memos include self)
        incoming = [
            msg for msg in messages
            if (include_current_user or msg.get("sender") != current_user)
            and msg.get("messageType", "text") == "text"
            and msg.get("content", "").strip()
        ]

        if not incoming:
            return []

        # Sort chronologically
        sorted_msgs = sorted(incoming, key=lambda m: ClusteringService._to_datetime(m["timestamp"]))

        clusters: list[list] = []
        current_cluster = [sorted_msgs[0]]

        for msg in sorted_msgs[1:]:
            last = current_cluster[-1]

            curr_time = ClusteringService._to_datetime(msg["timestamp"])
            last_time = ClusteringService._to_datetime(last["timestamp"])
            time_diff = (curr_time - last_time).total_seconds() / 60  # minutes

            similarity = ClusteringService.calculate_similarity(
                msg.get("content", ""),
                last.get("content", ""),
            )

            same_sender = msg.get("sender") == last.get("sender")

            if (time_diff <= time_threshold and similarity >= similarity_threshold) or \
               (time_diff <= 5 and same_sender):
                current_cluster.append(msg)
            else:
                clusters.append(current_cluster)
                current_cluster = [msg]

        clusters.append(current_cluster)
        return clusters