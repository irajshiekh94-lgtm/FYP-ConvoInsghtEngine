/** Remove WhatsApp / import voice-note filename tags from displayed text. */
const VOICE_IMPORT_TAG =
  /^\[(?:Voice note|PTT|ppt|AUD|audio|voice)[^\]]*\]\s*|^\[[^\]]*(?:WA\d{3,5}|wa\d{3,5})[^\]]*\]\s*/i;

const GENERIC_FILE_TAG = /^\[[A-Za-z0-9_\-\s]{3,80}\]\s+/;

const EMBEDDED_VOICE_TAG =
  /\[(?:Voice note|PTT|ppt|AUD|audio|voice)[^\]]*\]\s*|\[[^\]]*(?:WA\d{3,5}|wa\d{3,5})[^\]]*\]\s*/gi;

export function stripVoiceImportTag(text: string, aggressive = false): string {
  let cleaned = text.trim();
  let prev = "";
  while (cleaned !== prev) {
    prev = cleaned;
    cleaned = cleaned.replace(VOICE_IMPORT_TAG, "").trim();
    if (aggressive) {
      cleaned = cleaned.replace(GENERIC_FILE_TAG, "").trim();
    }
  }
  return cleaned;
}

export function stripVoiceTagsFromSummary(text: string): string {
  return text.replace(EMBEDDED_VOICE_TAG, "").replace(/\s{2,}/g, " ").trim();
}
