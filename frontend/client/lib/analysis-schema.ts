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

/** Exact backend `result` object when status is `done`. */
export interface AnalysisResult {
  messages: MessageOut[];
  summary: string;
  conversation_summary: ConversationSummaryOut;
  priorities: PrioritiesOut;
  actions: ActionItemOut[];
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
