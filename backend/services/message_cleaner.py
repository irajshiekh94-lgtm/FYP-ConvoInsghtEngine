"""
Clean and normalize parsed WhatsApp messages before clustering / summarization.
"""

import re
from typing import List

from backend.services.text_normalizer import full_normalize

_MEDIA_PLACEHOLDER = re.compile(
    r"^(<\s*media\s+omitted\s*>|image omitted|video omitted|audio omitted|sticker omitted)$",
    re.I,
)


def clean_messages(messages: List[dict]) -> List[dict]:
    """
    Filter and normalize messages for the analysis pipeline.
    Returns structured message dicts with cleaned text only.
    """
    cleaned: List[dict] = []

    for msg in messages:
        if msg.get("messageType", "text") != "text":
            continue

        content = (msg.get("content") or "").strip()
        if not content or _MEDIA_PLACEHOLDER.match(content):
            continue

        norm = full_normalize(content, use_ml=False)
        if norm.get("validation"):
            content = norm["normalized_text"].strip()

        if len(content) < 2:
            continue

        cleaned.append({**msg, "content": content})

    return cleaned
