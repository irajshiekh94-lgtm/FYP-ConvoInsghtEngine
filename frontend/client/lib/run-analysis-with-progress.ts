import {
  uploadChat,
  processChat,
  type JobResultResponse,
} from "@/lib/api-client";

export type ProgressCallback = (stepId: string, message: string) => void;

/** Track 4 — minimum dwell time per stage (startup feel). */
const STAGE_MS = {
  uploading: 2000,
  parsing: 3000,
  analyzingMin: 800,
  done: 500,
} as const;

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Fake real-time processing: Uploading (2s) → Parsing (3s) → Analyzing → Done.
 * API calls run during those stages; dwell times ensure visible progress.
 */
export async function runAnalysisWithProgress(
  payload: {
    rawText: string;
    currentUser?: string;
    chatName: string;
  },
  onProgress: ProgressCallback
): Promise<JobResultResponse> {
  onProgress("uploading", "Uploading…");
  const uploadPromise = uploadChat(payload);
  const [, uploadResult] = await Promise.all([
    delay(STAGE_MS.uploading),
    uploadPromise,
  ]);
  const jobId = uploadResult.id;

  onProgress("parsing", "Parsing…");
  await delay(STAGE_MS.parsing);

  onProgress("analyzing", "Analyzing…");
  const [result] = await Promise.all([
    processChat(jobId),
    delay(STAGE_MS.analyzingMin),
  ]);

  if (result.status === "failed") {
    onProgress("done", "Something went wrong");
    return result;
  }

  onProgress("done", "Done!");
  await delay(STAGE_MS.done);
  return result;
}
