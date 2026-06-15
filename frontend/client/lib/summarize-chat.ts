import type { Chat, Message } from "@/types";
import { summarizeChat24h } from "@/lib/api-client";

const SUMMARY_MESSAGE_LIMIT = 150;

function normalizeTimestamp(value: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return new Date().toISOString();
  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  return trimmed;
}

export function buildSummarizePayload(chat: Chat) {
  const chatId = chat.jobId || chat.id;
  const chatType =
    chat.extractedData.metadata?.chat_type === "group" ? "group" : "individual";

  const recentMessages = [...chat.messages]
    .filter((m) => m.content?.trim())
    .sort((a, b) => {
      const ta = Date.parse(normalizeTimestamp(a.timestamp));
      const tb = Date.parse(normalizeTimestamp(b.timestamp));
      if (!Number.isNaN(ta) && !Number.isNaN(tb)) return ta - tb;
      return a.timestamp.localeCompare(b.timestamp);
    })
    .slice(-SUMMARY_MESSAGE_LIMIT)
    .map((m: Message) => ({
      senderName: m.sender,
      messageText: m.content.trim(),
      timestamp: normalizeTimestamp(m.timestamp),
    }));

  return {
    chatId,
    chatType: chatType as "individual" | "group",
    messages: recentMessages.length > 0 ? recentMessages : undefined,
    maxMessages: SUMMARY_MESSAGE_LIMIT,
  };
}

export async function summarizeChat(chat: Chat) {
  return summarizeChat24h(buildSummarizePayload(chat));
}

export function summaryPeriodLabel(period?: string): string {
  switch (period) {
    case "24h":
      return "Last 24 hours";
    case "conversation_tail":
      return "Recent conversation (24h window)";
    case "recent":
      return "Most recent messages";
    case "client":
      return "Most recent messages";
    default:
      return "Summary";
  }
}
