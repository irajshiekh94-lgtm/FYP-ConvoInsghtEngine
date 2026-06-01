import { getApiUrl } from "./query-client";
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

export type { AnalysisResult, JobResultResponse, JobUploadResponse } from "./analysis-schema";
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

  const res = await fetch(`${baseUrl}/transcribe/audio`, {
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

  const res = await fetch(`${baseUrl}/normalize/text-file`, {
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
  const res = await fetch(new URL("/api/upload-chat", baseUrl).href, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rawText: payload.rawText,
      currentUser: payload.currentUser ?? "Me",
      chatName: payload.chatName,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    await handleApiError(res);
  }
  return data;
}

/** Step 2 — run analysis pipeline (status: processing → done | failed). */
export async function processChat(jobId: string): Promise<JobResultResponse> {
  const baseUrl = getApiUrl();
  const res = await fetch(new URL("/api/process-chat", baseUrl).href, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId }),
  });
  const data: JobResultResponse = await res.json();
  if (!res.ok) {
    await handleApiError(res);
  }
  if (data.status === "failed") {
    throw new Error(data.error || "Analysis failed");
  }
  return data;
}

/** Step 3 — poll job status and canonical result. */
export async function getChatResults(jobId: string): Promise<JobResultResponse> {
  const baseUrl = getApiUrl();
  const res = await fetch(new URL(`/api/get-results/${jobId}`, baseUrl).href);
  const data: JobResultResponse = await res.json();
  if (!res.ok) {
    await handleApiError(res);
  }
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
  });

  const data: BackendUploadResponse = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Upload failed (${res.status})`);
  }

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
  const formData = new FormData();
  formData.append("file", {
    uri,
    name,
    type: mimeType,
  } as unknown as Blob);

  const res = await fetch(new URL("/transcribe/audio", baseUrl).href, {
    method: "POST",
    body: formData,
  });

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
export async function getHealth(): Promise<any> {
  const baseUrl = getApiUrl();
  
  try {
    const res = await fetch(`${baseUrl}/health`, {
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
