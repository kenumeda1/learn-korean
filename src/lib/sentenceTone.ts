/** Difficulty level for English prompt + Korean reference (sentence generation). */
export const SENTENCE_LEVELS = ['beginner', 'mid', 'advanced'] as const;
export type SentenceLevel = (typeof SENTENCE_LEVELS)[number];

export const DEFAULT_SENTENCE_LEVEL: SentenceLevel = 'mid';

export const LS_SENTENCE_LEVEL_KEY = 'language-helper:sentence-level';

export const SENTENCE_LEVEL_LABELS: Record<SentenceLevel, string> = {
  beginner: 'Beginner',
  mid: 'Mid',
  advanced: 'Advanced',
};

function isSentenceLevel(s: string): s is SentenceLevel {
  return (SENTENCE_LEVELS as readonly string[]).includes(s);
}

export function parseSentenceLevel(s: string | undefined | null): SentenceLevel {
  if (s && isSentenceLevel(s)) return s;
  return DEFAULT_SENTENCE_LEVEL;
}

/** Map persisted localStorage from the old single "tone" key (removed) to level. */
export function parseLegacyToneStorage(raw: string | null | undefined): SentenceLevel {
  if (!raw) return DEFAULT_SENTENCE_LEVEL;
  const t = raw.trim().toLowerCase();
  if (t === 'beginner') return 'beginner';
  if (
    t === 'balanced' ||
    t === 'formal' ||
    t === 'casual' ||
    t === 'textbook' ||
    t === 'humorous'
  ) {
    return 'mid';
  }
  return parseSentenceLevel(raw);
}

/** Resolve level for an old or new history row (Check + UI). */
export function levelFromHistoryEntry(h: {
  sentenceLevel?: SentenceLevel;
  tone?: string;
}): SentenceLevel {
  if (h.sentenceLevel != null) return parseSentenceLevel(h.sentenceLevel);
  if (h.tone) {
    const t = h.tone.trim().toLowerCase();
    if (t === 'beginner') return 'beginner';
    return 'mid';
  }
  return DEFAULT_SENTENCE_LEVEL;
}

/** Appended to the generation user message after vocab. */
export function levelBlockForGeneration(level: SentenceLevel): string {
  const levelRules: Record<SentenceLevel, string> = {
    beginner:
      'LEVEL — Beginner: Keep both the English prompt and Korean reference short and simple. Use common grammar; avoid rare idioms and advanced structures. Prefer two very short clear sentences over one long sentence stuffed with objects and prepositions. The English must stay easy to picture.',
    mid:
      'LEVEL — Mid: Natural everyday Korean and normal spoken English. Varied but not ornate.',
    advanced:
      'LEVEL — Advanced: Richer, more nuanced Korean where appropriate (natural idioms, subtle register choices). English prompt can be more layered; Korean should match that sophistication.',
  };
  return levelRules[level];
}

/** Included in the checker user message so verdict matches intended level. */
export function levelBlockForChecker(level: SentenceLevel): string {
  const levelHints: Record<SentenceLevel, string> = {
    beginner:
      'Intended level: beginner. Prefer simple, correct sentences; do not demand advanced polish.',
    mid: 'Intended level: mid. Judge naturalness; reasonable register variation is fine.',
    advanced:
      'Intended level: advanced. Nuanced or idiomatic choices are acceptable if meaning matches.',
  };
  return levelHints[level];
}
