export interface Chat {
  id: string;
  name: string;
  category: "important" | "actionable" | "general" | "business";
  analyzedAt: string;
  summary: string;
  actionCount: number;
  messages: Message[];
  extractedData: ExtractedData;
}

export interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isVoiceNote?: boolean;
  transcription?: string;
}

export interface ExtractedData {
  actionItems: ActionItem[];
  businessOrders: BusinessOrder[];
  meetings: Meeting[];
  importantMessages: ImportantMessage[];
}

export interface ActionItem {
  id: string;
  chatId: string;
  chatName: string;
  content: string;
  type: "task" | "deadline" | "assignment" | "order" | "meeting";
  urgency: "high" | "medium" | "low";
  dueDate?: string;
  completed: boolean;
  createdAt: string;
}

export interface BusinessOrder {
  id: string;
  product: string;
  quantity: number;
  price?: string;
  deliveryDate?: string;
  customerName: string;
  status: "pending" | "confirmed" | "completed";
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
  participants: string[];
}

export interface ImportantMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
  reason: string;
}

export interface Settings {
  remindersEnabled: boolean;
  urgentAlertsEnabled: boolean;
  dailySummaryEnabled: boolean;
  dataRetentionDays: number;
}
