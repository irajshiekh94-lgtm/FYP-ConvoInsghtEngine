import type { Chat, Message } from "@/types";
import { summarizeChat24h } from "@/lib/api-client";

const SUMMARY_MESSAGE_LIMIT = 150;

export function buildSummarizePayload(chat: Chat) {
  const chatId = chat.jobId || chat.id;
  const chatType =
    chat.extractedData.metadata?.chat_type === "group" ? "group" : "individual";

  const recentMessages = [...chat.messages]
    .sort((a, b) => {
      const ta = new Date(a.timestamp).getTime();
      const tb = new Date(b.timestamp).getTime();
      if (!Number.isNaN(ta) && !Number.isNaN(tb)) return ta - tb;
      return a.timestamp.localeCompare(b.timestamp);
    })
    .slice(-SUMMARY_MESSAGE_LIMIT)
    .map((m: Message) => ({
      senderName: m.sender,
      messageText: m.content,
      timestamp: m.timestamp,
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
