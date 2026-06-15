"""
Clean and normalize parsed WhatsApp messages before clustering / summarization.
"""

import re
from typing import List

from backend.services.text_normalizer import full_normalize
from backend.services.voice_content import (
    strip_voice_import_tag,
    strip_voice_tags_from_summary,
)

_MEDIA_PLACEHOLDER = re.compile(
    r"^(<\s*media\s+omitted\s*>|image omitted|video omitted|audio omitted|sticker omitted)$",
    re.I,
)

_VOICE_PREFIX = "[Voice note] "


def clean_messages(messages: List[dict]) -> List[dict]:
    """
    Filter and normalize messages for the analysis pipeline.
    Returns structured message dicts with cleaned text only.
    """
    cleaned: List[dict] = []

    for msg in messages:
        msg_type = msg.get("messageType", "text")
        if msg_type not in ("text", "voice"):
            continue

        content = (msg.get("content") or "").strip()
        if msg_type == "voice" and content.startswith(_VOICE_PREFIX):
            content = content[len(_VOICE_PREFIX) :].strip()

        content = strip_voice_import_tag(
            content,
            aggressive=msg_type == "voice" or "(voice" in (msg.get("sender") or "").lower(),
        )
        content = strip_voice_tags_from_summary(content)

        if not content or _MEDIA_PLACEHOLDER.match(content):
            continue

        norm = full_normalize(content, use_ml=False)
        if norm.get("validation"):
            content = norm["normalized_text"].strip()

        content = strip_voice_tags_from_summary(content).strip()

        if len(content) < 2:
            continue

        cleaned.append({**msg, "content": content})

    return cleaned
