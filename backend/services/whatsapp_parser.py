"""
WhatsApp Chat Parser - ConvoInsight Engine

Reads exported WhatsApp .txt files and converts them
into clean message dictionaries ready for the analysis pipeline.

Handles format:
13/05/2026, 4:25 pm - Sender: Message
"""

import logging
import os
import re
from datetime import datetime
from typing import List, Optional

logger = logging.getLogger(__name__)


# ------------------------------------------------------------------
# WhatsApp message line
# Example:
# 13/05/2026, 4:22 pm - Ali: Hello
# 13/05/2026, 4:22 pm - Ali: Hello
# ------------------------------------------------------------------
MESSAGE_PATTERN = re.compile(
    r'^(\d{2}/\d{2}/\d{4}),\s*'
    r'(\d{1,2}:\d{2}[\s\u202F\u00A0]*(?:am|pm|AM|PM))'
    r'\s-\s(.+?):\s(.+)$'
)

# ------------------------------------------------------------------
# WhatsApp system messages
# Example:
# 13/05/2026, 4:22 pm - Ali created group
# ------------------------------------------------------------------
SYSTEM_PATTERN = re.compile(
    r'^(\d{2}/\d{2}/\d{4}),\s*'
    r'(\d{1,2}:\d{2}[\s\u202F\u00A0]*(?:am|pm|AM|PM))'
    r'\s-\s(.+)$'
)


def parse_timestamp(date_str, time_str):
    """
    Convert WhatsApp timestamp into datetime object.

    Supports:
    13/05/2026, 4:22 pm
    13/05/2026, 4:22 PM
    13/05/2026, 4:22 pm
    """

    try:
        clean_time = (
            time_str
            .replace("\u202F", " ")
            .replace("\u00A0", " ")
            .strip()
            .upper()
        )

        return datetime.strptime(
            f"{date_str} {clean_time}",
            "%d/%m/%Y %I:%M %p"
        )

    except Exception:
        return None


def classify_message(content):
    """
    Determine message type.
    """

    content = content.strip()

    if content == "<Media omitted>":
        return "media"

    if "<This message was deleted>" in content:
        return "deleted"

    return "text"


def _parse_lines(lines: List[str]) -> dict:
    """Parse WhatsApp export lines into structured chat data."""
    messages = []
    participants = set()
    current_message = None

    for raw_line in lines:

        line = raw_line.strip()

        if not line:
            continue

        # Skip encryption banner
        if "end-to-end encrypted" in line:
            continue

        # ----------------------------------------------------------
        # Normal message
        # ----------------------------------------------------------
        msg_match = MESSAGE_PATTERN.match(line)

        if msg_match:

            if current_message:
                messages.append(current_message)

            date_str, time_str, sender, content = msg_match.groups()

            timestamp = parse_timestamp(date_str, time_str)
            message_type = classify_message(content)

            participants.add(sender)

            current_message = {
                "sender": sender,
                "content": content if message_type == "text" else "",
                "timestamp": timestamp,
                "messageType": message_type,
                "rawTimestamp": f"{date_str} {time_str}"
            }

            continue

        # ----------------------------------------------------------
        # System message
        # ----------------------------------------------------------
        sys_match = SYSTEM_PATTERN.match(line)

        if sys_match:

            if current_message:
                messages.append(current_message)
                current_message = None

            continue

        # ----------------------------------------------------------
        # Multiline continuation
        # ----------------------------------------------------------
        if current_message:
            current_message["content"] += " " + line

    if current_message:
        messages.append(current_message)

    chat_type = "group" if len(participants) > 2 else "individual"

    if len(messages) == 0:
        logger.warning("No messages parsed — check WhatsApp export format")
    else:
        logger.info("Parsed %d messages, %d participants", len(messages), len(participants))

    return {
        "chatName": "",
        "chatType": chat_type,
        "participants": sorted(list(participants)),
        "totalMessages": len(messages),
        "messages": messages,
    }


def _chat_name_from_filename(filepath: str) -> str:
    filename = os.path.basename(filepath)
    return (
        filename.replace("WhatsApp Chat with ", "")
        .replace("WhatsApp_Chat_with_", "")
        .replace(".txt", "")
        .replace("_", " ")
        .strip()
    )


def parse_chat_file(filepath: str) -> dict:
    """
    Parse WhatsApp exported TXT file from disk.

    Returns:
        chatName, chatType, participants, totalMessages, messages
    """
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()

    result = _parse_lines(lines)
    result["chatName"] = _chat_name_from_filename(filepath)
    return result


def parse_chat_from_text(text_content: str, chat_name: str = "Uploaded Chat") -> dict:
    """Parse WhatsApp chat directly from raw export text (no temp file)."""
    lines = text_content.splitlines()
    result = _parse_lines(lines)
    result["chatName"] = chat_name
    return result


# ------------------------------------------------------------------
# Local test
# ------------------------------------------------------------------
if __name__ == "__main__":

    import sys

    if len(sys.argv) < 2:
        print("Usage:")
        print("python whatsapp_parser.py path/to/chat.txt")
        sys.exit(1)

    result = parse_chat_file(sys.argv[1])

    print(f"\n✅ Parsed: {result['chatName']}")
    print(f"Type        : {result['chatType']}")
    print(f"Participants: {result['participants']}")
    print(f"Messages    : {result['totalMessages']}")

    print("\n--- First 5 Messages ---")

    for msg in result["messages"][:5]:
        print(
            f"[{msg['rawTimestamp']}] "
            f"{msg['sender']}: "
            f"{msg['content'][:80]}"
        )

