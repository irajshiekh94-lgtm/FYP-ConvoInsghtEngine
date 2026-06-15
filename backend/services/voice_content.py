"""Strip WhatsApp / import voice-note filename tags from message text."""

import re

# Leading tags like [Voice note], [PTT-202603483-WA0035], [ppt 203483 wa0035]
_VOICE_IMPORT_TAG = re.compile(
    r"^\[(?:Voice note|[Pp][Tt][Tt]|AUD|audio|voice)[^\]]*\]\s*|"
    r"^\[[^\]]*(?:WA\d{3,5}|wa\d{3,5})[^\]]*\]\s*",
    re.I,
)

# Filename-style tags our app briefly prefixed at import (alphanumeric + dashes/spaces)
_GENERIC_FILE_TAG = re.compile(r"^\[[A-Za-z0-9_\-\s]{3,80}\]\s+")

# Same tags echoed inside LLM summaries
_EMBEDDED_VOICE_TAG = re.compile(
    r"\[(?:Voice note|[Pp][Tt][Tt]|AUD|audio|voice)[^\]]*\]\s*|"
    r"\[[^\]]*(?:WA\d{3,5}|wa\d{3,5})[^\]]*\]\s*",
    re.I,
)


def strip_voice_import_tag(text: str, *, aggressive: bool = False) -> str:
    """Remove leading voice-note filename tags from transcript text."""
    if not text:
        return text

    cleaned = text.strip()
    prev = None
    while cleaned != prev:
        prev = cleaned
        cleaned = _VOICE_IMPORT_TAG.sub("", cleaned).strip()
        if aggressive:
            cleaned = _GENERIC_FILE_TAG.sub("", cleaned).strip()
    return cleaned


def strip_voice_tags_from_summary(text: str) -> str:
    """Remove voice filename tags if the model copied them into summaries."""
    if not text:
        return text
    return _EMBEDDED_VOICE_TAG.sub("", text).strip()
