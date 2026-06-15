"""Tests for cluster dialogue formatting."""

from backend.services.cluster_bridge import format_cluster_dialogue, shape_clusters


def test_format_cluster_dialogue_preserves_speakers():
    messages = [
        {"sender": "Alice", "content": "Send the invoice today"},
        {"sender": "Bob", "content": "I will send it by 5pm"},
    ]
    dialogue = format_cluster_dialogue(messages)
    assert "Alice: Send the invoice today" in dialogue
    assert "Bob: I will send it by 5pm" in dialogue


def test_shape_clusters_includes_voice_messages():
    raw = [
        [
            {"sender": "Me", "content": "Reminder about the FYP deadline", "messageType": "voice"},
            {"sender": "Me", "content": "Ask Sara to review chapter 3", "messageType": "text"},
        ]
    ]
    shaped = shape_clusters(raw)
    assert len(shaped) == 1
    assert "Me: Reminder about the FYP deadline" in shaped[0]["combined_text"]
    assert "Me: Ask Sara to review chapter 3" in shaped[0]["combined_text"]
    assert shaped[0]["message_count"] == 2
