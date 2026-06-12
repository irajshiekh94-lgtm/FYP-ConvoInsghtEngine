"""
MongoDB Connection Configuration
"""
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
import os
from dotenv import load_dotenv
import certifi

# Load environment variables
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

                if not mongodb_uri:
                    raise ValueError("MONGODB_URI is not set in .env file")

                # Atlas (mongodb+srv) requires TLS; local mongodb:// does not
                client_kwargs: dict = {"serverSelectionTimeoutMS": 30000}
                if mongodb_uri.startswith("mongodb+srv://") or "mongodb.net" in mongodb_uri:
                    client_kwargs["tls"] = True
                    client_kwargs["tlsCAFile"] = certifi.where()

                self._client = MongoClient(mongodb_uri, **client_kwargs)

                # Test connection
                self._client.admin.command('ping')

                # Get database
                self._db = self._client['convoinsight']

                print("✅ Connected to MongoDB!")
                return self._db

            except ConnectionFailure as e:
                print(f"❌ MongoDB connection failed: {e}")
                raise
            except Exception as e:
                print(f"❌ Unexpected error: {e}")
                raise

        return self._db

    def get_db(self):
        """Get database instance"""
        if self._db is None:
            return self.connect()
        return self._db

    def close(self):
        """Close MongoDB connection"""
        if self._client is not None:
            self._client.close()
            print("✅ MongoDB connection closed")


# Singleton instance
mongodb = MongoDB()