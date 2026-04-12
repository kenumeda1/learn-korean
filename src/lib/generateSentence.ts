import { extractJsonObjectText } from './extractJson';
import { wordsToPromptLines } from './parseWordList';
import { getLlmClient } from '../llm/getLlmClient';
import { sentenceGenerationSchema, type SentenceGeneration } from '../schema/sentenceGeneration';
import { DEFAULT_SENTENCE_TONE, toneBlockForGeneration, type SentenceTone } from './sentenceTone';

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
- "korean_reference" is YOUR model answer: natural Korean that expresses the same meaning and uses the learner's vocabulary words where a native would naturally use them. One or two Korean sentences max (prefer one). If a combination is awkward, still do your best and explain in caveats.
- Do not put Korean in "sentence"—English only there. Do not put English in "korean_reference"—Korean only there.
- Be honest: set confidence low if unsure.
- For taste/texture reactions in English, use lines like "It's spicy." / "It's really sweet." etc.
- Dish names in English: loanword or brief gloss (gamjatang, budae jjigae); stay consistent.

DIVERSITY (critical): Each generation must feel like a new drill, not a small tweak of the last one.
- Vary situation, speaker, and intent: observation vs question vs complaint vs plan vs story beat—not the same template every time (avoid repeating patterns like "The X has a strange Y" or "I think the X is Y" if you used that recently).
- Change register and rhythm: statements, exclamations, questions, or two short beats—mix it up.
- If the user message lists recent English prompts you already wrote, treat them as off-limits for reuse: new scenario, new predicate, new angle—same vocab allowed, different sentence DNA.`;

export type GenerateSentenceOptions = {
  /** Recent English prompts from this session; model should avoid same framing. */
  recentEnglishPrompts?: string[];
  /** Style for English prompt + Korean reference. Defaults to balanced. */
  tone?: SentenceTone;
};

function userPayload(
  lists: WordLists,
  recentEnglishPrompts: string[] | undefined,
  tone: SentenceTone,
): string {
  const vocab = `Nouns:\n${wordsToPromptLines(lists.nouns)}\n\nAdjectives:\n${wordsToPromptLines(
    lists.adjectives,
  )}\n\nVerbs:\n${wordsToPromptLines(lists.verbs)}`;

  const toneSection = `\n\n${toneBlockForGeneration(tone)}`;

  if (!recentEnglishPrompts?.length) {
    return `${vocab}${toneSection}\n\nWrite the JSON now.`;
  }

  const recent = recentEnglishPrompts
    .slice(0, 10)
    .map((line, i) => `${i + 1}. ${line}`)
    .join('\n');

  return `${vocab}${toneSection}\n\nRecent English prompts you already generated in this session (do NOT repeat the same idea, structure, or scenario—write something clearly different):\n${recent}\n\nWrite a NEW JSON object now.`;
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

  const tone = options?.tone ?? DEFAULT_SENTENCE_TONE;
  const user = userPayload(lists, options?.recentEnglishPrompts, tone);
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
