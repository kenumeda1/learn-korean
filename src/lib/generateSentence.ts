import { extractJsonObjectText } from './extractJson';
import { wordsToPromptLines } from './parseWordList';
import { getLlmClient } from '../llm/getLlmClient';
import { sentenceGenerationSchema, type SentenceGeneration } from '../schema/sentenceGeneration';

export type WordLists = {
  nouns: string[];
  adjectives: string[];
  verbs: string[];
};

const SYSTEM = `You are a Korean language tutor assistant.
The learner supplies vocabulary lists by part of speech (nouns, adjectives, verbs).
Output exactly one JSON object (no markdown) with this shape:
{"sentence": string in Korean using those words naturally, "english_gloss"?: string, "caveats"?: string[], "confidence"?: "low"|"medium"|"high", "used_vocab"?: {"nouns"?: string[], "adjectives"?: string[], "verbs"?: string[]}}
Rules:
- Use the learner's words in natural Korean. If a combination is unnatural, still produce the best single sentence and explain in caveats.
- One or two sentences max in "sentence" (prefer one).
- Be honest: set confidence low if unsure.`;

function userPayload(lists: WordLists, themeLabel?: string): string {
  const themeLine = themeLabel
    ? `Learner theme focus: "${themeLabel}". Prefer vocabulary and situations that fit this theme.\n\n`
    : '';
  return `${themeLine}Nouns:\n${wordsToPromptLines(lists.nouns)}\n\nAdjectives:\n${wordsToPromptLines(
    lists.adjectives,
  )}\n\nVerbs:\n${wordsToPromptLines(lists.verbs)}\n\nWrite the JSON now.`;
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
  options?: { themeLabel?: string },
): Promise<SentenceGeneration> {
  if (lists.nouns.length === 0 || lists.verbs.length === 0) {
    throw new Error('Add at least one noun and one verb before generating.');
  }

  const user = userPayload(lists, options?.themeLabel);
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

  return checked.data;
}
