import type { Chat } from "@/types";

export function getUnreadUrgentCount(chat: Chat): number {
  if (chat.isRead) return 0;
  return chat.extractedData?.priorities?.urgent?.length ?? 0;
}

export function countUnreadUrgentMessages(chats: Chat[]): number {
  return chats.reduce((sum, chat) => sum + getUnreadUrgentCount(chat), 0);
}
