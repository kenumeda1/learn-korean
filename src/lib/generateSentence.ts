import { extractJsonObjectText } from './extractJson';
import { wordsToPromptLines } from './parseWordList';
import { getLlmClient } from '../llm/getLlmClient';
import { sentenceGenerationSchema, type SentenceGeneration } from '../schema/sentenceGeneration';
import { DEFAULT_SENTENCE_TONE, levelBlockForGeneration, type SentenceTone } from './sentenceTone';

export type WordLists = {
  nouns: string[];
  adjectives: string[];
  verbs: string[];
};

const SYSTEM = `You are a Korean language tutor assistant.
The learner supplies vocabulary lists by part of speech (nouns, adjectives, verbs).
They will see an English prompt and translate into Korean themselves.

Output exactly one JSON object (no markdown) with this shape:
{"sentence": string (English only), "korean_reference": string (Korean), "caveats"?: string[], "confidence"?: "low"|"medium"|"high", "used_vocab"?: {"nouns"?: string[], "adjectives"?: string[], "verbs"?: string[]}}

Rules:
- "sentence" is what the learner translates FROM: one or two short English sentences max (prefer one). Natural spoken English—contractions where natural, normal word order, not translationese.
- ENGLISH CLARITY (critical): The prompt must sound like something a native would say without re-reading. Do not cram every vocab item into one tangled noun phrase. If the scene needs several things (food, toppings, tools, surfaces), prefer two short sentences or a simple "and" chain—not one sentence where "with X on Y" makes it unclear what sits where (bad: "We're going to eat a delicious pizza with tomatoes on the cutting board" is muddled; good: "The tomatoes are on the cutting board. We're going to make a yummy pizza." or "We're making pizza with tomatoes—I'll chop them on the board."). Never sacrifice clear meaning to force vocabulary into a single awkward line.
- "korean_reference" is YOUR model answer: natural Korean that expresses the same meaning and uses the learner's vocabulary words where a native would naturally use them. One or two Korean sentences max (prefer one). The Korean should be grammatical; if fitting a vocab item would require broken Korean (e.g. jamming adjective forms into wrong slots), simplify the English prompt instead of shipping bad Korean. Use caveats only for minor tradeoffs, not to excuse ungrammatical output.
- Do not put Korean in "sentence"—English only there. Do not put English in "korean_reference"—Korean only there.
- Be honest: set confidence low if unsure.
- For taste/texture reactions in English, use lines like "It's spicy." / "It's really sweet." etc.
- Dish names in English: loanword or brief gloss (gamjatang, budae jjigae); stay consistent.

DIVERSITY (critical): Each generation must feel like a new drill, not a small tweak of the last one.
- Vary situation, speaker, and intent: observation vs question vs complaint vs plan vs story beat—not the same template every time (avoid repeating patterns like "The X has a strange Y" or "I think the X is Y" if you used that recently).
- Change register and rhythm: statements, exclamations, questions, or two short beats—mix it up.
- If the user message lists recent English prompts you already wrote, treat them as off-limits for reuse: new scenario, new predicate, new angle—same vocab allowed, different sentence DNA.

LIBRARY THEME (when the user message includes a "Theme" section):
- The learner grouped these words under one topic. The English prompt and Korean reference must be *about* that topic—same world, same scenario family—not a grab bag of unrelated situations.
- Weave every vocab item into that world naturally (e.g. theme "pizza" with vocab including sleep/rest and tomato: dough resting before baking, a yummy tomato pizza—not a random sentence that ignores pizza).`;

export type GenerateSentenceOptions = {
  /** Recent English prompts from this session; model should avoid same framing. */
  recentEnglishPrompts?: string[];
  /** Style preset: beginner / medium / native / humorous. Defaults to medium. */
  level?: SentenceTone;
  /**
   * Library theme label (usually the library name). When set, sentences anchor on this topic.
   * Omit for generic names like "My library" — see `shouldPassLibraryTheme`.
   */
  libraryTheme?: string;
};

/** Use theme in prompts when the name is a real topic, not the default placeholder. */
export function shouldPassLibraryTheme(name: string | undefined): boolean {
  const n = name?.trim().toLowerCase() ?? '';
  if (!n) return false;
  return n !== 'my library';
}

function userPayload(
  lists: WordLists,
  recentEnglishPrompts: string[] | undefined,
  level: SentenceTone,
  libraryTheme: string | undefined,
): string {
  const vocab = `Nouns:\n${wordsToPromptLines(lists.nouns)}\n\nAdjectives:\n${wordsToPromptLines(
    lists.adjectives,
  )}\n\nVerbs:\n${wordsToPromptLines(lists.verbs)}`;

  const themeSection =
    libraryTheme?.trim() ?
      `\n\nTheme:\nThe learner's vocabulary library is themed around: "${libraryTheme.trim()}".\nAnchor the whole drill in this topic—story, setting, and intent should belong to this world. Fit the listed words in naturally (including loosely related senses when needed: e.g. "sleep" might appear as rest, dough resting, or a break—not an unrelated bedtime story unless it still fits the theme).`
    : '';

  const levelSection = `\n\n${levelBlockForGeneration(level)}`;

  if (!recentEnglishPrompts?.length) {
    return `${vocab}${themeSection}${levelSection}\n\nWrite the JSON now.`;
  }

  const recent = recentEnglishPrompts
    .slice(0, 10)
    .map((line, i) => `${i + 1}. ${line}`)
    .join('\n');

  return `${vocab}${themeSection}${levelSection}\n\nRecent English prompts you already generated in this session (do NOT repeat the same idea, structure, or scenario—write something clearly different):\n${recent}\n\nWrite a NEW JSON object now.`;
}

function repairMessage(badSnippet: string): string {
  return `Your previous reply was not valid JSON for the schema. Reply with ONLY a JSON object. Previous reply (trimmed): ${badSnippet.slice(0, 800)}`;
}

function validateRawModelOutput(raw: string):
  | { ok: true; data: SentenceGeneration }
  | { ok: false; reason: string } {
  try {
    const jsonText = extractJsonObjectText(raw);
    const data: unknown = JSON.parse(jsonText);
    const parsed = sentenceGenerationSchema.safeParse(data);
    if (parsed.success) return { ok: true, data: parsed.data };
    return { ok: false, reason: JSON.stringify(parsed.error.flatten().fieldErrors) };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : 'invalid JSON',
    };
  }
}

export async function generateSentenceFromVocab(
  lists: WordLists,
  options?: GenerateSentenceOptions,
): Promise<SentenceGeneration> {
  if (lists.nouns.length === 0 || lists.verbs.length === 0) {
    throw new Error('Add at least one noun and one verb before generating.');
  }

  const level = options?.level ?? DEFAULT_SENTENCE_TONE;
  const user = userPayload(lists, options?.recentEnglishPrompts, level, options?.libraryTheme);
  const client = getLlmClient();
  let raw = await client.completeJson([
    { role: 'system', content: SYSTEM },
    { role: 'user', content: user },
  ]);

  let checked = validateRawModelOutput(raw);
  if (!checked.ok) {
    raw = await client.completeJson([
      { role: 'system', content: SYSTEM },
      { role: 'user', content: user },
      { role: 'user', content: repairMessage(raw) },
    ]);
    checked = validateRawModelOutput(raw);
  }

  if (!checked.ok) {
    throw new Error(`Invalid model JSON after retry: ${checked.reason}`);
  }

  const data = checked.data;
  if (!data.korean_reference?.trim()) {
    throw new Error('Model did not return korean_reference. Try generating again.');
  }

  return data;
}
