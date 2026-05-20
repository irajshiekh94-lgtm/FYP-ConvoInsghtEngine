# from text_normalizer import full_normalize

# def main():
#     text = input("Enter text to normalize:\n> ")

#     result = full_normalize(text, use_ml=True)

#     print("\n" + "="*80)
#     print("NORMALIZED OUTPUT (Rules + ML Combined)")
#     print("="*80)
#     print(result["normalized_text"])
#     print("\nSource:", result["source"])
#     print("Valid:", result["validation"])
#     print("="*80)

# if __name__ == "__main__":
#     main()

"""
Main Flask Application
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
from config.mongodb import mongodb
from backend.services.clustering import ClusteringService
from backend.services.summarization import SummarizationService
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

# Initialize services
clustering_service = ClusteringService()
summarization_service = SummarizationService()

# Connect to MongoDB
db = mongodb.connect()

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "ok", "message": "ConvoInsight API is running"})

@app.route('/api/chats/upload', methods=['POST'])
def upload_chat():
    """Upload and process WhatsApp chat"""
    try:
        data = request.json
        messages = data.get('messages', [])
        current_user = data.get('currentUser', 'Me')
        chat_name = data.get('chatName', 'Untitled Chat')
        
        # Store messages in MongoDB
        chat_doc = {
            'chatName': chat_name,
            'totalMessages': len(messages),
            'uploadedAt': datetime.now(),
            'currentUser': current_user
        }
        
        chat_result = db['chats'].insert_one(chat_doc)
        chat_id = str(chat_result.inserted_id)
        
        # Store individual messages
        for msg in messages:
            msg['chatId'] = chat_id
            db['messages'].insert_one(msg)
        
        # Cluster messages
        clusters = clustering_service.aggregate_messages(messages, current_user)
        
        # Generate summaries
        summaries = summarization_service.summarize_by_sender(
            clusters, 
            current_user
        )
        
        # Store summaries
        summary_doc = {
            'chatId': chat_id,
            'summaries': summaries,
            'generatedAt': datetime.now()
        }
        db['summaries'].insert_one(summary_doc)
        
        return jsonify({
            'success': True,
            'chatId': chat_id,
            'summaries': summaries
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/chats/<chat_id>/summaries', methods=['GET'])
def get_summaries(chat_id):
    """Get summaries for a chat"""
    try:
        summary = db['summaries'].find_one({'chatId': chat_id})
        
        if summary:
            summary['_id'] = str(summary['_id'])
            return jsonify({'success': True, 'data': summary})
        else:
            return jsonify({'success': False, 'error': 'Not found'}), 404
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)