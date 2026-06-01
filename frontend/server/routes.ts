import type { Express } from "express";
import { createServer, type Server } from "node:http";
import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

interface AnalysisResult {
  category: "important" | "actionable" | "general" | "business";
  summary: string;
  actionItems: Array<{
    content: string;
    type: "task" | "deadline" | "assignment" | "order" | "meeting";
    urgency: "high" | "medium" | "low";
    dueDate?: string;
  }>;
  businessOrders: Array<{
    product: string;
    quantity: number;
    price?: string;
    deliveryDate?: string;
    customerName: string;
    status: "pending" | "confirmed" | "completed";
  }>;
  meetings: Array<{
    title: string;
    date: string;
    time?: string;
    location?: string;
    participants: string[];
  }>;
  importantMessages: Array<{
    content: string;
    sender: string;
    timestamp: string;
    reason: string;
  }>;
}

async function analyzeWhatsAppChat(
  chatContent: string,
  chatName: string
): Promise<AnalysisResult> {
  const systemPrompt = `You are an AI assistant that analyzes WhatsApp chat exports. Your task is to:
1. Summarize the conversation
2. Extract action items, deadlines, and tasks
3. Detect business orders (product, quantity, price, delivery details)
4. Identify meetings and events with dates/times
5. Highlight important messages that require attention
6. Categorize the overall chat as: important, actionable, general, or business

Respond with JSON in this exact format:
{
  "category": "important" | "actionable" | "general" | "business",
  "summary": "Brief summary of the conversation",
  "actionItems": [
    {
      "content": "Description of the action",
      "type": "task" | "deadline" | "assignment" | "order" | "meeting",
      "urgency": "high" | "medium" | "low",
      "dueDate": "ISO date string if applicable"
    }
  ],
  "businessOrders": [
    {
      "product": "Product name",
      "quantity": 1,
      "price": "Price if mentioned",
      "deliveryDate": "Delivery date if mentioned",
      "customerName": "Customer name",
      "status": "pending" | "confirmed" | "completed"
    }
  ],
  "meetings": [
    {
      "title": "Meeting title",
      "date": "ISO date string",
      "time": "Time if mentioned",
      "location": "Location if mentioned",
      "participants": ["List of participants"]
    }
  ],
  "importantMessages": [
    {
      "content": "The important message content",
      "sender": "Sender name",
      "timestamp": "Timestamp from chat",
      "reason": "Why this message is important"
    }
  ]
}

Be thorough but concise. Focus on actionable and time-sensitive information.`;

  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Analyze this WhatsApp chat export named "${chatName}":\n\n${chatContent}`,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 4096,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result as AnalysisResult;
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to analyze chat with AI");
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/analyze", async (req, res) => {
    try {
      const { chatContent, chatName, voiceNoteCount } = req.body;

      if (!chatContent || typeof chatContent !== "string") {
        return res.status(400).json({ error: "Chat content is required" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ 
          error: "OpenAI API key not configured. Please add your API key to use the analysis feature." 
        });
      }

      const analysis = await analyzeWhatsAppChat(
        chatContent,
        chatName || "WhatsApp Chat"
      );

      res.json(analysis);
    } catch (error) {
      console.error("Analysis error:", error);
      res.status(500).json({ 
        error: "Failed to analyze chat. Please try again." 
      });
    }
  });

  app.post("/api/transcribe", async (req, res) => {
    try {
      res.json({ 
        message: "Voice note transcription would be handled here",
        note: "This endpoint requires audio file upload which is handled separately"
      });
    } catch (error) {
      console.error("Transcription error:", error);
      res.status(500).json({ error: "Failed to transcribe voice note" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      openaiConfigured: !!process.env.OPENAI_API_KEY
    });
  });

  const httpServer = createServer(app);

  return httpServer;
}
