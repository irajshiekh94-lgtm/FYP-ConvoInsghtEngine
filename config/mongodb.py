"""
MongoDB Connection Configuration
"""
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
import os
from dotenv import load_dotenv

load_dotenv()

class MongoDB:
    _instance = None
    _client = None
    _db = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MongoDB, cls).__new__(cls)
        return cls._instance
    
    def connect(self):
        """Connect to MongoDB"""
        if self._client is None:
            try:
                mongodb_uri = os.getenv('MONGODB_URI')
                self._client = MongoClient(mongodb_uri)
                
                # Test connection
                self._client.admin.command('ping')
                
                # Get database
                self._db = self._client['convoinsight']
                
                print("✅ Connected to MongoDB!")
                return self._db
                
            except ConnectionFailure as e:
                print(f"❌ MongoDB connection failed: {e}")
                raise
        
        return self._db
    
    def get_db(self):
        """Get database instance"""
        if self._db is None:
            return self.connect()
        return self._db
    
    def close(self):
        """Close MongoDB connection"""
        if self._client:
            self._client.close()
            print("✅ MongoDB connection closed")

# Singleton instance
mongodb = MongoDB()