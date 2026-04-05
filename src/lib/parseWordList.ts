const MAX_ITEM_LEN = 80;
const MAX_ITEMS_PER_CATEGORY = 24;

/** Split pasted lines or comma-separated tokens into trimmed unique-ish list. */
export function parseWordList(raw: string): string[] {
  const parts = raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const cut = p.slice(0, MAX_ITEM_LEN);
    const key = cut.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cut);
    if (out.length >= MAX_ITEMS_PER_CATEGORY) break;
  }
  return out;
}

export function wordsToPromptLines(words: string[]): string {
  if (words.length === 0) return '(none)';
  return words.map((w) => `- ${w}`).join('\n');
}
