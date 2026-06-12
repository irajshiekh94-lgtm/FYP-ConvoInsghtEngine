/**
 * Canonical analysis schema — must match backend/schemas/analysis.py AnalysisResult.
 */

export interface MessageOut {
  sender: string;
  content: string;
  timestamp?: string | null;
  messageType?: string;
  rawTimestamp?: string;
}

export interface PriorityItem {
  sender: string;
  text: string;
  intent: string;
  cluster_id?: number;
  message_count?: number;
}

export interface PrioritiesOut {
  urgent: PriorityItem[];
  moderate: PriorityItem[];
  low: PriorityItem[];
}

export interface ActionItemOut {
  id: string;
  type: string;
  description: string;
  sender: string;
  urgency: string;
  source_summary?: string;
}

export interface ConversationSummaryOut {
  themes: string[];
  key_decisions: string[];
  important_messages: string[];
  overview: string;
}

export interface EntityOut {
  text: string;
  type: string;
  count: number;
}

export interface TopicOut {
  id: number;
  title: string;
  senders: string[];
  message_count: number;
  keywords: string[];
}

export interface SentimentOut {
  label: string;
  score: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
}

export interface AnalyticsOut {
  total_messages: number;
  total_participants: number;
  messages_by_sender: Record<string, number>;
  action_count: number;
  urgent_count: number;
  topic_count: number;
  entity_count: number;
}

export interface MetadataOut {
  chat_name: string;
  chat_type: string;
  participants: string[];
  current_user: string;
  processed_at: string;
  pipeline_version: string;
}

/** Exact backend `result` object when status is `done`. */
export interface AnalysisResult {
  messages: MessageOut[];
  summary: string;
  conversation_summary: ConversationSummaryOut;
  priorities: PrioritiesOut;
  actions: ActionItemOut[];
  entities: EntityOut[];
  topics: TopicOut[];
  sentiment: SentimentOut;
  analytics: AnalyticsOut;
  metadata: MetadataOut;
}

export type JobStatus = "uploaded" | "processing" | "done" | "failed";

export interface JobStatusResponse {
  id: string;
  status: JobStatus;
  chat_name?: string;
}

export type JobUploadResponse = JobStatusResponse;

export interface JobResultResponse {
  id: string;
  status: JobStatus;
  chat_name?: string;
  participants?: string[];
  message_count?: number;
  result?: AnalysisResult;
  error?: string;
  success?: boolean;
  chatId?: string;
}

export const EMPTY_CONVERSATION_SUMMARY: ConversationSummaryOut = {
  themes: [],
  key_decisions: [],
  important_messages: [],
  overview: "",
};

export const EMPTY_PRIORITIES: PrioritiesOut = {
  urgent: [],
  moderate: [],
  low: [],
};

export const EMPTY_SENTIMENT: SentimentOut = {
  label: "neutral",
  score: 0,
  positive_count: 0,
  negative_count: 0,
  neutral_count: 0,
};

export const EMPTY_ANALYTICS: AnalyticsOut = {
  total_messages: 0,
  total_participants: 0,
  messages_by_sender: {},
  action_count: 0,
  urgent_count: 0,
  topic_count: 0,
  entity_count: 0,
};

export const EMPTY_METADATA: MetadataOut = {
  chat_name: "",
  chat_type: "individual",
  participants: [],
  current_user: "Me",
  processed_at: "",
  pipeline_version: "",
};
