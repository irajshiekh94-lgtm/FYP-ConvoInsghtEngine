export interface SummaryInsights {
  keyDecisions: string[];
  assignedTasks: string[];
  pendingActions: string[];
  blockers: string[];
  peopleMentioned: string[];
  sentiment: "Positive" | "Neutral" | "Negative";
}

export interface TwentyFourHourSummary {
  summary: string;
  insights: SummaryInsights;
  messageCount: number;
  generatedAt: string;
  period?: "24h" | "conversation_tail" | "recent" | "client";
}

export interface Chat {
  id: string;
  name: string;
  category: "important" | "actionable" | "general" | "business";
  analyzedAt: string;
  summary: string;
  actionCount: number;
  messages: Message[];
  extractedData: ExtractedData;
  /** Backend job id used for MongoDB message storage and /api/summarize/ */
  jobId?: string;
  twentyFourHourSummary?: TwentyFourHourSummary;
  /** Set when the user opens the chat — hides unread urgent badge on the list. */
  isRead?: boolean;
  readAt?: string;
}

export interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isVoiceNote?: boolean;
  transcription?: string;
}

export interface SenderInsight {
  sender: string;
  summary: string;
  intent: string;
  messageCount?: number;
}

export interface PriorityInsight {
  sender: string;
  text: string;
  intent: string;
  cluster_id?: number;
  message_count?: number;
}

export interface PrioritiesBucket {
  urgent: PriorityInsight[];
  moderate: PriorityInsight[];
  low: PriorityInsight[];
}

export interface ConversationSummary {
  themes: string[];
  key_decisions: string[];
  important_messages: string[];
  overview: string;
}

export interface EntityInsight {
  text: string;
  type: string;
  count: number;
}

export interface TopicInsight {
  id: number;
  title: string;
  senders: string[];
  message_count: number;
  keywords: string[];
}

export interface SentimentInsight {
  label: string;
  score: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
}

export interface AnalyticsInsight {
  total_messages: number;
  total_participants: number;
  messages_by_sender: Record<string, number>;
  action_count: number;
  urgent_count: number;
  topic_count: number;
  entity_count: number;
}

export interface MetadataInsight {
  chat_name: string;
  chat_type: string;
  participants: string[];
  current_user: string;
  processed_at: string;
  pipeline_version: string;
}

export interface ExtractedData {
  actionItems: ActionItem[];
  businessOrders: BusinessOrder[];
  meetings: Meeting[];
  importantMessages: ImportantMessage[];
  senderInsights: SenderInsight[];
  priorities: PrioritiesBucket;
  conversationSummary: ConversationSummary;
  entities: EntityInsight[];
  topics: TopicInsight[];
  sentiment: SentimentInsight;
  analytics: AnalyticsInsight;
  metadata: MetadataInsight;
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
