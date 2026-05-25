"""
MongoDB Setup Script - ConvoInsight Engine
Run once to initialize all collections and indexes
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.mongodb import mongodb
from datetime import datetime

def setup_collections():
    db = mongodb.connect()
    print("\n🚀 Setting up MongoDB Collections...\n")

    # ─────────────────────────────────────────
    # 1. USERS
    # Who is using the app
    # ─────────────────────────────────────────
    print("📦 Creating 'users' collection...")
    db['users'].drop()
    db.create_collection('users')
    db['users'].create_index("email", unique=True)
    print("   ✅ Users ready\n")

    # ─────────────────────────────────────────
    # 2. CHATS
    # Each uploaded .txt file = one chat
    # e.g. "Fyp chat", "Javariya Yusra Friend"
    # ─────────────────────────────────────────
    print("📦 Creating 'chats' collection...")
    db['chats'].drop()
    db.create_collection('chats')
    db['chats'].create_index([("userId", 1), ("uploadedAt", -1)])

    # Sample document shape (for reference):
    # {
    #   _id, 
    #   userId,         → who uploaded this
    #   chatName,       → "Fyp chat" / "Javariya Yusra Friend"
    #   chatType,       → "group" or "individual"
    #   participants,   → ["Javariya Yusra Friend", "Eraj Cutie", "M.A"]
    #   totalMessages,
    #   uploadedAt
    # }
    print("   ✅ Chats ready\n")

    # ─────────────────────────────────────────
    # 3. MESSAGES
    # Every single message from the .txt file
    # ─────────────────────────────────────────
    print("📦 Creating 'messages' collection...")
    db['messages'].drop()
    db.create_collection('messages')
    db['messages'].create_index([("chatId", 1), ("timestamp", 1)])

    # Sample document shape:
    # {
    #   _id,
    #   chatId,         → links to chats collection
    #   sender,         → "Javariya Yusra Friend" / "Eraj Cutie"
    #   content,        → "Today is the meeting with client 3 pm sharp"
    #   timestamp,      → datetime(2026, 5, 15, 11, 44)
    #   messageType,    → "text" / "media" / "system"
    #   isDeleted       → True if "<This message was deleted>"
    # }
    print("   ✅ Messages ready\n")

    # ─────────────────────────────────────────
    # 4. SUMMARIES
    # Output of your summarization pipeline
    # ─────────────────────────────────────────
    print("📦 Creating 'summaries' collection...")
    db['summaries'].drop()
    db.create_collection('summaries')
    db['summaries'].create_index([("chatId", 1), ("generatedAt", -1)])

    # Sample document shape:
    # {
    #   _id,
    #   chatId,
    #   senderName,     → "Javariya Yusra Friend"
    #   summaryText,    → "Javariya asked about meeting schedule and confirmed..."
    #   keyPoints,      → ["Meeting at 3pm", "Deadline is Friday", "Assignment due"]
    #   priority,       → "high" / "medium" / "low"
    #   clusterId,      → which cluster this came from
    #   generatedAt
    # }
    print("   ✅ Summaries ready\n")

    # ─────────────────────────────────────────
    # 5. CALENDAR EVENTS
    # Important things extracted from summaries
    # Deadlines, meetings, follow-ups
    # ─────────────────────────────────────────
    print("📦 Creating 'calendar_events' collection...")
    db['calendar_events'].drop()
    db.create_collection('calendar_events')
    db['calendar_events'].create_index([("userId", 1), ("dueDate", 1)])
    db['calendar_events'].create_index([("userId", 1), ("priority", 1)])

    # Sample document shape:
    # {
    #   _id,
    #   userId,
    #   chatId,
    #   title,          → "Meeting with client at 3pm"
    #   priority,       → "high" / "medium" / "low"
    #   dueDate,        → datetime(2026, 5, 15, 15, 0)  ← extracted from message
    #   sourceMessage,  → original message text it came from
    #   status,         → "pending" / "done"
    #   createdAt
    # }
    print("   ✅ Calendar Events ready\n")

# ─────────────────────────────────────────
# 6. INTENTS
# What each message cluster is about
# e.g. "meeting request", "deadline reminder", "question"
# ─────────────────────────────────────────
    print("📦 Creating 'intents' collection...")
    db['intents'].drop()
    db.create_collection('intents')
    db['intents'].create_index([("chatId", 1)])
    db['intents'].create_index([("intentLabel", 1)])

# Sample document shape:
# {
#   _id,
#   chatId,
#   clusterId,       → which cluster this intent belongs to
#   senderName,
#   intentLabel,     → "meeting_request" / "deadline" / "question" / "follow_up" / "general"
#   confidence,      → 0.0 to 1.0
#   sourceMessages,  → list of message contents that led to this intent
#   detectedAt
# }
    print("   ✅ Intents ready\n")
    # ─────────────────────────────────────────
    # DONE
    # ─────────────────────────────────────────
    collections = db.list_collection_names()
    print("🎉 All done!")
    print(f"   Database   : convoinsight")
    print(f"   Collections: {collections}\n")

if __name__ == "__main__":
    setup_collections()