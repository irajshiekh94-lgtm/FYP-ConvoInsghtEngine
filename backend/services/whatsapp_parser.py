"""
WhatsApp Chat Parser - ConvoInsight Engine

Reads exported WhatsApp .txt files and converts them
into clean message dictionaries ready to save to MongoDB.

Handles format: "13/05/2026, 4:25 pm - Sender: Message"
"""

import re
from datetime import datetime


# ─────────────────────────────────────────────────────────
# REGEX: matches lines like:
# "13/05/2026, 4:25 pm - Javariya Yusra Friend: Hello"
# "13/05/2026, 4:25 pm - Yusra Adil❤️ created group"
# ─────────────────────────────────────────────────────────
MESSAGE_PATTERN = re.compile(
    r'^(\d{2}/\d{2}/\d{4}),\s(\d{1,2}:\d{2}\s(?:am|pm))\s-\s(.+?):\s(.+)$'
)

SYSTEM_PATTERN = re.compile(
    r'^(\d{2}/\d{2}/\d{4}),\s(\d{1,2}:\d{2}\s(?:am|pm))\s-\s(.+)$'
)


def parse_timestamp(date_str, time_str):
    """Convert '13/05/2026' and '4:25 pm' into a datetime object"""
    try:
        return datetime.strptime(f"{date_str} {time_str}", "%d/%m/%Y %I:%M %p")
    except:
        return None


def classify_message(content):
    """
    Decide what type a message is:
    - text     → normal message
    - media    → image/video/audio was shared
    - system   → WhatsApp system message (group created, added, etc.)
    - deleted  → message was deleted
    """
    if content.strip() == "<Media omitted>":
        return "media"
    if "<This message was deleted>" in content:
        return "deleted"
    return "text"


def parse_chat_file(filepath):
    """
    Main function — reads a .txt file and returns:
    {
      'chatName': str,
      'chatType': 'group' or 'individual',
      'participants': [list of sender names],
      'messages': [list of message dicts]
    }
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    messages = []
    participants = set()
    current_message = None

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Skip the encryption notice line
        if "end-to-end encrypted" in line:
            continue

        # Try to match a normal message line
        match = MESSAGE_PATTERN.match(line)
        if match:
            # Save previous message if exists
            if current_message:
                messages.append(current_message)

            date_str, time_str, sender, content = match.groups()
            timestamp = parse_timestamp(date_str, time_str)
            msg_type = classify_message(content)

            participants.add(sender)

            current_message = {
                "sender": sender,
                "content": content if msg_type == "text" else "",
                "timestamp": timestamp,
                "messageType": msg_type,
                "rawTimestamp": f"{date_str} {time_str}"
            }
            continue

        # Try system message (group created, added, etc.)
        sys_match = SYSTEM_PATTERN.match(line)
        if sys_match:
            if current_message:
                messages.append(current_message)
                current_message = None
            continue

        # If no match, this line is a continuation of the previous message
        if current_message:
            current_message["content"] += " " + line

    # Don't forget the last message
    if current_message:
        messages.append(current_message)

    # Figure out chat name from filename
    # e.g. "WhatsApp_Chat_with_Fyp_chat.txt" → "Fyp chat"
    filename = filepath.split("/")[-1].split("\\")[-1]
    chat_name = filename.replace("WhatsApp_Chat_with_", "").replace(".txt", "").replace("_", " ")

    # Group or individual?
    chat_type = "group" if len(participants) > 2 else "individual"

    return {
        "chatName": chat_name,
        "chatType": chat_type,
        "participants": list(participants),
        "totalMessages": len(messages),
        "messages": messages
    }


def parse_chat_from_text(text_content, chat_name="Uploaded Chat"):
    """
    Same as above but accepts raw text string instead of file path.
    Used when frontend sends file content directly to Flask API.
    """
    import tempfile, os

    # Write to temp file and parse
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt',
                                     encoding='utf-8', delete=False) as f:
        f.write(text_content)
        temp_path = f.name

    result = parse_chat_file(temp_path)
    result["chatName"] = chat_name
    os.unlink(temp_path)
    return result


# ─────────────────────────────────────────────────────────
# TEST — run this file directly to verify it works
# python backend/services/whatsapp_parser.py
# ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys

    test_file = sys.argv[1] if len(sys.argv) > 1 else None

    if not test_file:
        print("Usage: python whatsapp_parser.py path/to/chat.txt")
        sys.exit(1)

    result = parse_chat_file(test_file)

    print(f"\n✅ Parsed: {result['chatName']}")
    print(f"   Type        : {result['chatType']}")
    print(f"   Participants: {result['participants']}")
    print(f"   Messages    : {result['totalMessages']}")
    print(f"\n--- First 3 messages ---")
    for msg in result['messages'][:3]:
        print(f"  [{msg['rawTimestamp']}] {msg['sender']}: {msg['content'][:60]}")