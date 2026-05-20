"""
Abstractive Summarization Service
Integrates your existing Gemini code
"""
import google.generativeai as genai
import os
from datetime import datetime

class SummarizationService:
    def __init__(self):
        genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
        self.model = genai.GenerativeModel("models/gemini-2.5-flash")
    
    def summarize_cluster(self, cluster_data):
        """
        Your existing summarization logic from FYP_g.ipynb
        """
        prompt = f"""
You are summarizing a WhatsApp conversation.

Messages from: {', '.join(cluster_data['senders'])}
Number of messages: {cluster_data['message_count']}

Conversation:
{cluster_data['combined_text'][:2000]}

Task:
- Write an abstractive summary of the conversation
- Explain the main idea and intent in your own words
- Do NOT repeat phrases from the messages
- Focus on what the sender(s) were trying to communicate
- Use simple English
- 2–3 sentences maximum

Summary:
"""
        
        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                    top_p=0.9,
                    max_output_tokens=150,
                )
            )
            return response.text.strip()
        except Exception as e:
            print(f"Summarization error: {e}")
            return "Error generating summary"
    
    def summarize_by_sender(self, clusters, current_user):
        """
        Summarize all clusters, excluding current user
        """
        sender_summaries = {}
        
        for cluster in clusters:
            sender = cluster['senders'][0]
            
            if sender == current_user:
                continue
            
            if sender not in sender_summaries:
                sender_summaries[sender] = {
                    'clusters': [],
                    'total_messages': 0
                }
            
            summary = self.summarize_cluster(cluster)
            
            sender_summaries[sender]['clusters'].append({
                'cluster_id': cluster['cluster_id'],
                'summary': summary,
                'message_count': cluster['message_count']
            })
            sender_summaries[sender]['total_messages'] += cluster['message_count']
        
        return sender_summaries