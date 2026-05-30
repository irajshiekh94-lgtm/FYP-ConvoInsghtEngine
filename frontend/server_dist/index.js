// server/index.ts
import express from "express";

// server/routes.ts
import { createServer } from "node:http";
import OpenAI from "openai";
var openai = null;
function getOpenAIClient() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}
async function analyzeWhatsAppChat(chatContent, chatName) {
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
          content: `Analyze this WhatsApp chat export named "${chatName}":

${chatContent}`
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 4096
    });
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to analyze chat with AI");
  }
}
async function registerRoutes(app2) {
  app2.post("/api/analyze", async (req, res) => {
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
  app2.post("/api/transcribe", async (req, res) => {
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
  app2.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      openaiConfigured: !!process.env.OPENAI_API_KEY
    });
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/index.ts
import fs from "fs";
import path from "path";
var app = express();
var log = console.log;
function setupCors(app2) {
  app2.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    res.header("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      if (!req.path.startsWith("/api")) return;
      const duration = Date.now() - start;
      log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJson = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), "app.json"), "utf-8")
    );
    return appJson.expo?.name ?? "Expo App";
  } catch {
    return "Expo App";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({
      error: `Manifest not found for platform: ${platform}`
    });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  res.send(fs.readFileSync(manifestPath, "utf-8"));
}
function serveLandingPage(req, res, template) {
  const protocol = req.protocol || "http";
  const host = req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const html = template.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/APP_NAME_PLACEHOLDER/g, getAppName());
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function configureExpoRouting(app2) {
  log("Serving static Expo files with dynamic manifest routing");
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingTemplate = fs.existsSync(templatePath) ? fs.readFileSync(templatePath, "utf-8") : "<h1>Expo App</h1>";
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    if (req.path === "/" || req.path === "/manifest") {
      const platform = req.header("expo-platform");
      if (platform === "ios" || platform === "android") {
        return serveExpoManifest(platform, res);
      }
      if (req.path === "/") {
        return serveLandingPage(req, res, landingTemplate);
      }
    }
    next();
  });
  app2.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app2.use(express.static(path.resolve(process.cwd(), "static-build")));
  log("Expo routing enabled");
}
function setupErrorHandler(app2) {
  app2.use(
    (err, _req, res, _next) => {
      const error = err;
      res.status(error.status ?? 500).json({
        message: error.message ?? "Internal Server Error"
      });
      console.error(err);
    }
  );
}
(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  configureExpoRouting(app);
  const server = await registerRoutes(app);
  setupErrorHandler(app);
  const PORT = Number(process.env.PORT) || 3001;
  const HOST = "127.0.0.1";
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\u274C Port ${PORT} is already in use`);
      process.exit(1);
    }
    throw err;
  });
  server.listen(PORT, HOST, () => {
    log(`\u2705 Express server running at http://${HOST}:${PORT}`);
  });
})();
