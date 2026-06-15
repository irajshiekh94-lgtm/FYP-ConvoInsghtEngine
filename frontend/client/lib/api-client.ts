import { getApiUrl } from "./query-client";
import { Platform } from "react-native";

function wrapNetworkError(error: unknown, url: string): Error {
  if (error instanceof TypeError && /network request failed/i.test(error.message)) {
    return new Error(
      `Cannot reach the API at ${url}. ` +
        "Start the backend: uvicorn backend.server:app --reload --host 0.0.0.0 --port 8000. " +
        "In frontend/.env set EXPO_PUBLIC_API_URL — use http://localhost:8000 on this PC, " +
        "http://10.0.2.2:8000 for Android emulator, or http://YOUR_PC_LAN_IP:8000 for a phone " +
        "(run ipconfig on Windows and use your IPv4 address; phone and PC must be on the same Wi‑Fi)."
    );
  }
  return error instanceof Error ? error : new Error(String(error));
}
import type {
  AnalysisResult,
  JobResultResponse,
  JobUploadResponse,
} from "./analysis-schema";
import type { BackendUploadResponse } from "./transform-analysis";

/**
 * Response types for API endpoints
 */
export interface TranscriptionResponse {
  raw_transcription: string;
  normalized_text: string;
  language: string;
  source: string;
  validation: boolean;
}

export interface TextNormalizationResponse {
  normalized_text: string;
}

export interface ErrorResponse {
  error: string;
  detail: string;
  status_code: number;
  job_id?: string;
  traceback?: string;
}

export type JobStatus =
  | "uploaded"
  | "processing"
  | "done"
  | "failed";

export interface PriorityItem {
  sender: string;
  text: string;
  intent: string;
  cluster_id?: number;
  message_count?: number;
}

export type { AnalysisResult, JobResultResponse, JobStatusResponse, JobUploadResponse } from "./analysis-schema";
export type AnalysisPayload = AnalysisResult;

/**
 * Handle API errors with proper error messages
 */
async function handleApiError(response: Response): Promise<never> {
  let errorData: ErrorResponse | Record<string, unknown>;

  try {
    errorData = await response.json();
  } catch {
    errorData = {
      error: response.statusText,
      detail: "Failed to parse error response",
      status_code: response.status,
    };
  }

  const detail = errorData.detail;
  const errorMessage =
    (typeof detail === "string" ? detail : null) ||
    (typeof detail === "object" && detail !== null && "detail" in detail
      ? String((detail as { detail: string }).detail)
      : null) ||
    (typeof errorData.error === "string" ? errorData.error : null) ||
    "Unknown error";

  throw new Error(`API Error (${response.status}): ${errorMessage}`);
}

/**
 * Transcribe an audio file
 * 
 * @param file - Audio file (wav, mp3, m4a, ogg, opus, flac, webm, etc.)
 * @param language - Optional language code (e.g., 'en'). None for auto-detect
 * @returns Transcription result with raw and normalized text
 */
export async function transcribeAudio(
  file: File,
  language?: string
): Promise<TranscriptionResponse> {
  const baseUrl = getApiUrl();
  const formData = new FormData();
  formData.append('file', file);
  
  if (language) {
    formData.append('language', language);
  }

  const res = await fetch(new URL("/transcribe/audio", baseUrl).href, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!res.ok) {
    await handleApiError(res);
  }

  return res.json();
}

/**
 * Normalize text from a file upload
 * 
 * @param file - Text file to normalize (.txt)
 * @returns Normalized text response
 */
export async function normalizeTextFile(
  file: File
): Promise<TextNormalizationResponse> {
  const baseUrl = getApiUrl();
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(new URL("/normalize/text-file", baseUrl).href, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!res.ok) {
    await handleApiError(res);
  }

  return res.json();
}

/** Step 1 — store raw export; returns job id (status: uploaded). */
export async function uploadChat(payload: {
  rawText: string;
  currentUser?: string;
  chatName: string;
}): Promise<JobUploadResponse> {
  const baseUrl = getApiUrl();
  const url = new URL("/api/upload-chat", baseUrl).href;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rawText: payload.rawText,
        currentUser: payload.currentUser ?? "Me",
        chatName: payload.chatName,
      }),
      credentials: "include",
    });
  } catch (error) {
    throw wrapNetworkError(error, url);
  }
  if (!res.ok) {
    await handleApiError(res);
  }
  const data = await res.json();
  return data;
}

/** Step 2 — run analysis pipeline (status: processing → done | failed). */
export async function processChat(jobId: string): Promise<JobResultResponse> {
  const baseUrl = getApiUrl();
  const url = new URL("/api/process-chat", baseUrl).href;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
      credentials: "include",
    });
  } catch (error) {
    throw wrapNetworkError(error, url);
  }
  if (!res.ok) {
    await handleApiError(res);
  }
  const data: JobResultResponse = await res.json();
  if (data.status === "failed" && !data.result) {
    throw new Error(data.error || "Analysis failed");
  }
  return data;
}

/** Step 3 — poll job status and canonical result. */
export async function getChatResults(jobId: string): Promise<JobResultResponse> {
  const baseUrl = getApiUrl();
  const res = await fetch(new URL(`/api/get-results/${jobId}`, baseUrl).href, {
    credentials: "include",
  });
  if (!res.ok) {
    await handleApiError(res);
  }
  const data: JobResultResponse = await res.json();
  return data;
}

/** Three-step pipeline: upload → process → return results. */
export async function runChatAnalysisJob(payload: {
  rawText: string;
  currentUser?: string;
  chatName: string;
}): Promise<JobResultResponse> {
  const { id } = await uploadChat(payload);
  return processChat(id);
}

/**
 * Legacy one-shot upload (still supported). Prefer runChatAnalysisJob for new UI.
 */
export async function uploadChatAnalysis(payload: {
  rawText: string;
  currentUser?: string;
  chatName: string;
}): Promise<BackendUploadResponse> {
  const baseUrl = getApiUrl();
  const res = await fetch(new URL("/api/chats/upload", baseUrl).href, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rawText: payload.rawText,
      currentUser: payload.currentUser ?? "Me",
      chatName: payload.chatName,
    }),
    credentials: "include",
  });

  if (!res.ok) {
    await handleApiError(res);
  }

  const data: BackendUploadResponse = await res.json();

  if (!data.success) {
    throw new Error(data.error || "Analysis failed");
  }

  return data;
}

/**
 * Transcribe a voice note file (React Native URI) and return normalized text.
 */
export async function transcribeVoiceNoteFile(
  uri: string,
  name: string,
  mimeType = "audio/m4a"
): Promise<string> {
  const baseUrl = getApiUrl();
  const url = new URL("/transcribe/audio", baseUrl).href;
  const formData = new FormData();
  const uploadUri =
    Platform.OS === "android" ? uri : uri.replace("file://", "");
  const uploadName = name.includes(".") ? name : `${name}.m4a`;

  formData.append("file", {
    uri: uploadUri,
    name: uploadName,
    type: mimeType,
  } as unknown as Blob);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    throw wrapNetworkError(error, url);
  }

  if (!res.ok) {
    await handleApiError(res);
  }

  const data: TranscriptionResponse = await res.json();
  return data.normalized_text || data.raw_transcription || "";
}

/**
 * Get API health status
 * 
 * @returns Health status of the API
 */
export interface SummaryInsights {
  keyDecisions: string[];
  assignedTasks: string[];
  pendingActions: string[];
  blockers: string[];
  peopleMentioned: string[];
  sentiment: "Positive" | "Neutral" | "Negative";
}

export interface SummarizeMessageItem {
  senderName: string;
  messageText: string;
  timestamp: string;
}

export interface SummarizeResponse {
  success: boolean;
  summary: string;
  insights?: SummaryInsights;
  messageCount?: number;
  period?: "24h" | "conversation_tail" | "recent" | "client";
  error?: string;
}

export interface LlamaTestResponse {
  success: boolean;
  status: string;
  message: string;
  model?: string;
  provider?: string;
  sample_response?: string;
}

/** @deprecated use LlamaTestResponse */
export type GeminiTestResponse = LlamaTestResponse;

/** Test Meta Llama connectivity (Ollama / Groq / Together). */
export async function testLlamaConnection(): Promise<LlamaTestResponse> {
  const baseUrl = getApiUrl();
  const res = await fetch(new URL("/api/llama/test", baseUrl).href, {
    credentials: "include",
  });
  if (!res.ok) {
    await handleApiError(res);
  }
  return res.json();
}

/** @deprecated use testLlamaConnection */
export const testGeminiConnection = testLlamaConnection;

/** Generate an executive summary (24h when available, else most recent messages). */
export async function summarizeChat24h(payload: {
  chatId: string;
  chatType?: "individual" | "group";
  messages?: SummarizeMessageItem[];
  maxMessages?: number;
}): Promise<SummarizeResponse> {
  const baseUrl = getApiUrl();
  const res = await fetch(new URL("/api/summarize/", baseUrl).href, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  if (!res.ok) {
    await handleApiError(res);
  }
  const data: SummarizeResponse = await res.json();
  if (!data.success) {
    throw new Error(data.error || "Summarization failed");
  }
  return data;
}

export async function getHealth(): Promise<any> {
  const baseUrl = getApiUrl();
  
  try {
    const res = await fetch(new URL("/health", baseUrl).href, {
      credentials: 'include',
    });
    
    if (!res.ok) {
      throw new Error('API health check failed');
    }
    
    return res.json();
  } catch (error) {
    console.error('Health check error:', error);
    throw error;
  }
}
