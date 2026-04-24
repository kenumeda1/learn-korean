/** Preset for English prompt + Korean reference style (sentence generation). */
export const SENTENCE_TONES = ['beginner', 'medium', 'native', 'humorous'] as const;
export type SentenceTone = (typeof SENTENCE_TONES)[number];

export const DEFAULT_SENTENCE_TONE: SentenceTone = 'medium';

export const LS_SENTENCE_TONE_KEY = 'language-helper:sentence-tone';

/** @deprecated Superseded by {@link LS_SENTENCE_TONE_KEY}; read only for migration. */
export const LS_SENTENCE_LEVEL_KEY = 'language-helper:sentence-level';

export const SENTENCE_TONE_LABELS: Record<SentenceTone, string> = {
  beginner: 'beginner',
  medium: 'medium',
  native: 'native',
  humorous: 'humorous',
};

function isSentenceTone(s: string): s is SentenceTone {
  return (SENTENCE_TONES as readonly string[]).includes(s);
}

/** Map any legacy stored value to the current tone set. */
function migrateStringToTone(s: string): SentenceTone {
  const t = s.trim().toLowerCase();
  if (t === 'beginner') return 'beginner';
  if (
    t === 'mid' ||
    t === 'medium' ||
    t === 'balanced' ||
    t === 'formal' ||
    t === 'casual' ||
    t === 'textbook'
  ) {
    return 'medium';
  }
  if (t === 'advanced' || t === 'native') return 'native';
  if (t === 'humorous') return 'humorous';
  if (isSentenceTone(t)) return t;
  return DEFAULT_SENTENCE_TONE;
}

export function parseSentenceTone(s: string | undefined | null): SentenceTone {
  if (!s) return DEFAULT_SENTENCE_TONE;
  return migrateStringToTone(s);
}

/** @deprecated Use {@link parseSentenceTone} */
export const parseSentenceLevel = parseSentenceTone;

/** Map persisted localStorage from legacy keys to tone. */
export function parseLegacyToneStorage(raw: string | null | undefined): SentenceTone {
  if (!raw) return DEFAULT_SENTENCE_TONE;
  return migrateStringToTone(raw);
}

/** @deprecated Use {@link SentenceTone} */
export type SentenceLevel = SentenceTone;

export const SENTENCE_LEVELS = SENTENCE_TONES;
export const SENTENCE_LEVEL_LABELS = SENTENCE_TONE_LABELS;
export const DEFAULT_SENTENCE_LEVEL = DEFAULT_SENTENCE_TONE;

/** Resolve tone for an old or new history row (Check + UI). */
export function levelFromHistoryEntry(h: {
  sentenceLevel?: string;
  tone?: string;
}): SentenceTone {
  if (h.sentenceLevel != null) return migrateStringToTone(String(h.sentenceLevel));
  if (h.tone) {
    return migrateStringToTone(h.tone);
  }
  return DEFAULT_SENTENCE_TONE;
}

/** Appended to the generation user message after vocab. */
export function levelBlockForGeneration(tone: SentenceTone): string {
  const rules: Record<SentenceTone, string> = {
    beginner:
      'TONE — beginner: Keep both the English prompt and Korean reference short and simple. Use common grammar; avoid rare idioms and advanced structures. Prefer two very short clear sentences over one long sentence stuffed with objects and prepositions. The English must stay easy to picture.',
    medium:
      'TONE — medium: Natural everyday Korean and normal spoken English. Varied but not ornate; neutral register.',
    native:
      'TONE — native: Korean should sound like something a well-educated native might say—natural idioms and register where they fit. English prompt can be more layered; Korean must match that sophistication. Stay grammatical.',
    humorous:
      'TONE — humorous: Light, playful English prompt; Korean can use casual or witty phrasing where it fits the joke—still clear and natural, not forced random slang.',
  };
  return rules[tone];
}

/** Included in the checker user message so verdict matches intended tone. */
export function levelBlockForChecker(tone: SentenceTone): string {
  const hints: Record<SentenceTone, string> = {
    beginner: 'Intended tone: beginner. Prefer simple, correct sentences; do not demand advanced polish.',
    medium: 'Intended tone: medium. Judge naturalness; reasonable register variation is fine.',
    native: 'Intended tone: native. Nuanced or idiomatic choices are acceptable if meaning matches.',
    humorous: 'Intended tone: humorous. Light tone is fine; still judge clarity and natural Korean.',
  };
  return hints[tone];
}
