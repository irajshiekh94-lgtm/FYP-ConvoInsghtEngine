/** Truncate at a word boundary so previews don't cut mid-word. */
export function truncateAtWord(text: string, maxLength: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;

  const slice = trimmed.slice(0, maxLength);
  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace > maxLength * 0.5) {
    return slice.slice(0, lastSpace).trim() + "…";
  }
  return slice.trim() + "…";
}
