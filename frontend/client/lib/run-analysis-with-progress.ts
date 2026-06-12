import {
  uploadChat,
  processChat,
  getChatResults,
  type JobResultResponse,
} from "@/lib/api-client";

export type ProgressCallback = (stepId: string, message: string) => void;

/** Minimum dwell time per stage (startup feel). */
const STAGE_MS = {
  uploading: 2000,
  parsing: 3000,
  done: 500,
} as const;

const POLL_INTERVAL_MS = 2500;
const MAX_POLL_MS = 15 * 60 * 1000;

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

async function pollUntilComplete(
  jobId: string,
  onProgress: ProgressCallback
): Promise<JobResultResponse> {
  const started = Date.now();
  let tick = 0;

  while (Date.now() - started < MAX_POLL_MS) {
    const result = await getChatResults(jobId);

    if (result.status === "done") {
      return result;
    }
    if (result.status === "failed") {
      return result;
    }

    tick += 1;
    const elapsedSec = Math.floor((Date.now() - started) / 1000);
    const suffix =
      elapsedSec >= 30
        ? ` (${elapsedSec}s — large chats can take a few minutes)`
        : "";
    onProgress("analyzing", `Analyzing insights${".".repeat((tick % 3) + 1)}${suffix}`);

    await delay(POLL_INTERVAL_MS);
  }

  throw new Error(
    "Analysis timed out after 15 minutes. Try a smaller chat export or restart the backend."
  );
}

/**
 * Upload → start analysis → poll until done.
 * Backend runs the pipeline in the background so the UI stays responsive.
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

  onProgress("analyzing", "Analyzing insights…");
  await processChat(jobId);

  const result = await pollUntilComplete(jobId, onProgress);

  if (result.status === "failed") {
    onProgress("done", "Something went wrong");
    return result;
  }

  onProgress("done", "Done!");
  await delay(STAGE_MS.done);
  return result;
}
