"""
Initialize MongoDB Collections and Indexes
Run this once to set up your database structure
"""
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from config.mongodb import mongodb
from datetime import datetime

def setup_collections():
    """Create all collections with sample data"""
    db = mongodb.connect()
    
    print("\n🚀 Setting up MongoDB Collections...\n")
    
    # 1. Users Collection
    print("📦 Creating 'users' collection...")
    users = db['users']
    users.delete_many({})  # Clear existing
    
    sample_user = {
        "email": "demo@convoinsight.com",
        "passwordHash": "$2b$10$samplehash",
        "fullName": "Demo User",
        "role": "business_owner",
        "accountStatus": "active",
        "createdAt": datetime.now()
    }
    users.insert_one(sample_user)
    users.create_index("email", unique=True)
    print("   ✅ Users collection ready")
    
    # 2. Chats Collection
    print("\n📦 Creating 'chats' collection...")
    chats = db['chats']
    chats.delete_many({})
    chats.create_index([("userId", 1), ("chatType", 1)])
    print("   ✅ Chats collection ready")
    
    # 3. Messages Collection
    print("\n📦 Creating 'messages' collection...")
    messages = db['messages']
    messages.delete_many({})
    messages.create_index([("chatId", 1), ("timestamp", -1)])
    print("   ✅ Messages collection ready")
    
    # 4. Summaries Collection
    print("\n📦 Creating 'summaries' collection...")
    summaries = db['summaries']
    summaries.delete_many({})
    summaries.create_index([("chatId", 1), ("generatedAt", -1)])
    print("   ✅ Summaries collection ready")
    
    print("\n🎉 MongoDB setup complete!")
    print(f"   Database: convoinsight")
    print(f"   Collections: {db.list_collection_names()}")

if __name__ == "__main__":
    setup_collections()