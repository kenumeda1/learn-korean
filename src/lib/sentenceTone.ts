/** Presets for English prompt + Korean reference style (sentence generation). */
export const SENTENCE_TONES = [
  'balanced',
  'formal',
  'casual',
  'textbook',
  'humorous',
  'beginner',
] as const;

export type SentenceTone = (typeof SENTENCE_TONES)[number];

export const DEFAULT_SENTENCE_TONE: SentenceTone = 'balanced';

export const LS_SENTENCE_TONE_KEY = 'language-helper:sentence-tone';

export const SENTENCE_TONE_LABELS: Record<SentenceTone, string> = {
  balanced: 'Balanced',
  formal: 'Formal / polite',
  casual: 'Casual',
  textbook: 'Textbook / exam',
  humorous: 'Humorous',
  beginner: 'Beginner',
};

function isSentenceTone(s: string): s is SentenceTone {
  return (SENTENCE_TONES as readonly string[]).includes(s);
}

export function parseSentenceTone(s: string | undefined | null): SentenceTone {
  if (s && isSentenceTone(s)) return s;
  return DEFAULT_SENTENCE_TONE;
}

/** Appended to the generation user message after vocab. */
export function toneBlockForGeneration(tone: SentenceTone): string {
  const rules: Record<SentenceTone, string> = {
    balanced:
      'TONE — Balanced: Use natural everyday Korean. Do not force one speech level; vary as fits the scene. Match English register to that (normal spoken English).',
    formal:
      'TONE — Formal / polite: Use consistently polite, careful Korean (존댓말 where a native would with strangers, service, or senior contexts). English prompt should sound polite and neutral-professional too.',
    casual:
      'TONE — Casual: Use conversational Korean (해요체 with peers, or 반말 only if the scenario is clearly close friends; pick one coherent level). English prompt should sound relaxed and conversational.',
    textbook:
      'TONE — Textbook / exam: Clear, straightforward Korean suitable for a class or test. Avoid slang unless required by vocabulary. English prompt should be plain and unambiguous.',
    humorous:
      'TONE — Humorous: Aim for a joke, wit, or comedic beat while staying grammatical. English prompt should be funny but not cruel or confusing. Korean should land the same humor.',
    beginner:
      'TONE — Beginner: Short, simple Korean sentences; common grammar patterns; avoid rare idioms and advanced structures. English prompt must also be short, plain, and easy.',
  };
  return rules[tone];
}

/** Included in the checker user message so verdict matches intended register. */
export function toneBlockForChecker(tone: SentenceTone): string {
  const rules: Record<SentenceTone, string> = {
    balanced:
      'Intended tone: balanced. Judge naturalness; do not penalize reasonable register choices.',
    formal:
      'Intended tone: formal/polite. Do not mark "close" merely for using informal speech if the learner’s Korean is appropriately polite for the English prompt. If they are too casual versus the prompt, note that.',
    casual:
      'Intended tone: casual. Do not mark "close" merely for informal endings if meaning matches; penalize if the Korean sounds stiff relative to a clearly casual English prompt.',
    textbook:
      'Intended tone: textbook/exam. Prefer clear standard forms; minor stylistic stiffness is acceptable.',
    humorous:
      'Intended tone: humorous. If the joke lands differently but grammar is fine, "close" may be OK; use "needs_work" if humor or meaning is lost.',
    beginner:
      'Intended tone: beginner. Prefer simple, correct sentences over fancy phrasing; do not demand advanced polish.',
  };
  return rules[tone];
}
