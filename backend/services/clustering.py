"""
Message Clustering Service
From your FYP_g.ipynb notebook
"""
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
from datetime import datetime
import re

class ClusteringService:
    
    @staticmethod
    def calculate_similarity(text1, text2):
        """Calculate TF-IDF similarity"""
        vectorizer = TfidfVectorizer()
        try:
            tfidf_matrix = vectorizer.fit_transform([text1, text2])
            similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])
            return similarity[0][0]
        except:
            return 0.0
    
    @staticmethod
    def aggregate_messages(messages, current_user, time_threshold=5, similarity_threshold=0.4):
        """
        Your existing clustering logic
        """
        if not messages:
            return []
        
        # Filter out current user's messages
        incoming = [msg for msg in messages if msg.get('sender') != current_user]
        
        if not incoming:
            return []
        
        # Sort by timestamp
        sorted_msgs = sorted(
            incoming,
            key=lambda x: x['timestamp'] if isinstance(x['timestamp'], datetime) 
                         else datetime.strptime(x['timestamp'], '%Y-%m-%d %H:%M:%S')
        )
        
        clusters = []
        current_cluster = [sorted_msgs[0]]
        
        for i in range(1, len(sorted_msgs)):
            current_msg = sorted_msgs[i]
            last_msg = current_cluster[-1]
            
            # Calculate time difference
            curr_time = current_msg['timestamp'] if isinstance(current_msg['timestamp'], datetime) else datetime.strptime(current_msg['timestamp'], '%Y-%m-%d %H:%M:%S')
            last_time = last_msg['timestamp'] if isinstance(last_msg['timestamp'], datetime) else datetime.strptime(last_msg['timestamp'], '%Y-%m-%d %H:%M:%S')
            
            time_diff = (curr_time - last_time).total_seconds() / 60
            
            # Calculate similarity
            similarity = ClusteringService.calculate_similarity(
                current_msg.get('content', current_msg.get('text', '')),
                last_msg.get('content', last_msg.get('text', ''))
            )
            
            # Clustering logic
            if time_diff <= time_threshold and similarity >= similarity_threshold:
                current_cluster.append(current_msg)
            elif time_diff <= 5 and current_msg.get('sender') == last_msg.get('sender'):
                current_cluster.append(current_msg)
            else:
                clusters.append(current_cluster)
                current_cluster = [current_msg]
        
        clusters.append(current_cluster)
        return clusters