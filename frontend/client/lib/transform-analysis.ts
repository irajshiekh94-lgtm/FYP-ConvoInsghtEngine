import {
  Chat,
  ActionItem,
  BusinessOrder,
  Meeting,
  ImportantMessage,
  Message,
  SenderInsight,
  PrioritiesBucket,
  PriorityInsight,
  ConversationSummary,
} from "@/types";
import type {
  AnalysisResult,
  JobResultResponse,
  ActionItemOut,
} from "@/lib/analysis-schema";
import {
  EMPTY_ANALYTICS,
  EMPTY_CONVERSATION_SUMMARY,
  EMPTY_METADATA,
  EMPTY_PRIORITIES,
  EMPTY_SENTIMENT,
} from "@/lib/analysis-schema";
import { stripVoiceImportTag } from "@/lib/strip-voice-tag";

export type { AnalysisResult, JobResultResponse } from "@/lib/analysis-schema";

/** @deprecated legacy upload shape */
export interface BackendSummaryItem {
  sender: string;
  summary: string;
  intent: string;
  cluster_id?: number;
  message_count?: number;
}

export interface BackendUploadResponse {
  success: boolean;
  status?: string;
  chatId?: string;
  summaries?: BackendSummaryItem[];
  participants?: string[];
  messageCount?: number;
  messages?: AnalysisResult["messages"];
  summary?: string;
  conversation_summary?: ConversationSummary;
  priorities?: PrioritiesBucket;
  actions?: ActionItemOut[];
  entities?: AnalysisResult["entities"];
  topics?: AnalysisResult["topics"];
  sentiment?: AnalysisResult["sentiment"];
  analytics?: AnalysisResult["analytics"];
  metadata?: AnalysisResult["metadata"];
  error?: string;
}

const ACTION_INTENTS = new Set(["question", "request"]);

function mapBackendActionType(t: string): ActionItem["type"] {
  if (t === "follow-up") return "assignment";
  if (t === "reminder") return "deadline";
  return "task";
}

function mapBackendUrgency(u: string): ActionItem["urgency"] {
  if (u === "high") return "high";
  if (u === "low") return "low";
  return "medium";
}

function inferCategory(priorities: PrioritiesBucket): Chat["category"] {
  if (priorities.urgent.length > 0) return "important";
  if (priorities.moderate.length >= 2) return "actionable";
  if (priorities.moderate.length > 0) return "actionable";
  return "general";
}

function mapActions(
  chatId: string,
  chatName: string,
  now: string,
  actions: ActionItemOut[]
): ActionItem[] {
  return actions.map((a, index) => ({
    id: a.id || `${chatId}_action_${index}`,
    chatId,
    chatName,
    content: a.description,
    type: mapBackendActionType(a.type),
    urgency: mapBackendUrgency(a.urgency),
    completed: false,
    createdAt: now,
  }));
}

function mapMessages(
  chatId: string,
  raw: AnalysisResult["messages"],
  now: string
): Message[] {
  return (raw || [])
    .filter((m) => m.content?.trim())
    .slice(-200)
    .map((m, i) => ({
      id: `${chatId}_msg_${i}`,
      sender: m.sender,
      content: stripVoiceImportTag(
        m.content,
        /\(voice/i.test(m.sender) || m.messageType === "voice"
      ),
      timestamp: m.timestamp || m.rawTimestamp || now,
    }));
}

function mapPriorities(p: AnalysisResult["priorities"]): PrioritiesBucket {
  const mapItems = (items: typeof p.urgent): PriorityInsight[] =>
    (items || []).map((item) => ({
      sender: item.sender,
      text: item.text,
      intent: item.intent,
      cluster_id: item.cluster_id,
      message_count: item.message_count,
    }));

  return {
    urgent: mapItems(p?.urgent),
    moderate: mapItems(p?.moderate),
    low: mapItems(p?.low),
  };
}

function mapConversationSummary(
  cs: AnalysisResult["conversation_summary"] | undefined,
  overview: string
): ConversationSummary {
  if (cs) {
    return {
      themes: cs.themes || [],
      key_decisions: cs.key_decisions || [],
      important_messages: cs.important_messages || [],
      overview: cs.overview || overview,
    };
  }
  return {
    ...EMPTY_CONVERSATION_SUMMARY,
    overview: overview || "",
  };
}

/** Map canonical backend AnalysisResult → local Chat model. */
export function transformAnalysisResult(
  result: AnalysisResult,
  chatId: string,
  chatName: string
): Chat {
  const now = new Date().toISOString();
  const priorities = mapPriorities(result.priorities);
  const conversationSummary = mapConversationSummary(
    result.conversation_summary,
    result.summary
  );
  const actionItems = mapActions(chatId, chatName, now, result.actions || []);
  const messages = mapMessages(chatId, result.messages, now);

  const senderInsights: SenderInsight[] = [
    ...priorities.urgent,
    ...priorities.moderate,
    ...priorities.low,
  ].map((p) => ({
    sender: p.sender,
    summary: p.text,
    intent: p.intent,
  }));

  return {
    id: chatId,
    jobId: chatId,
    name: chatName,
    category: inferCategory(priorities),
    analyzedAt: now,
    summary: conversationSummary.overview || result.summary,
    actionCount: actionItems.length,
    messages,
    extractedData: {
      actionItems,
      businessOrders: [] as BusinessOrder[],
      meetings: [] as Meeting[],
      importantMessages: conversationSummary.important_messages.map(
        (text, i) => ({
          id: `${chatId}_imp_${i}`,
          content: text,
          sender: "",
          timestamp: now,
          reason: "Highlighted by analysis",
        })
      ),
      senderInsights,
      priorities,
      conversationSummary,
      entities: result.entities || [],
      topics: result.topics || [],
      sentiment: result.sentiment || EMPTY_SENTIMENT,
      analytics: result.analytics || EMPTY_ANALYTICS,
      metadata: result.metadata || EMPTY_METADATA,
    },
  };
}

export function transformJobResultToChat(
  job: JobResultResponse,
  chatName: string,
  _currentUserName = "Me"
): Chat {
  if (!job.result) {
    throw new Error(job.error || "Analysis returned no result");
  }
  return transformAnalysisResult(
    job.result,
    job.chatId || job.id,
    chatName
  );
}

export {
  EMPTY_ANALYTICS,
  EMPTY_METADATA,
  EMPTY_PRIORITIES,
  EMPTY_CONVERSATION_SUMMARY,
  EMPTY_SENTIMENT,
};
