import { extractJsonObjectText } from './extractJson';
import { getLlmClient } from '../llm/getLlmClient';
import { wordClassificationSchema, type WordClassification } from '../schema/wordClassification';

const SYSTEM = `You classify Korean words for language learners.
Given a single Korean word or a very short phrase (learning context), output exactly one JSON object (no markdown):
{"pos":"noun"|"adjective"|"verb","confidence":"low"|"medium"|"high","en": string,"note"?: string}
Rules:
- pos is the best primary part of speech for this token in isolation.
- en: concise English gloss or translation for the most likely sense (1–6 words, no punctuation-only).
- Korean is ambiguous without full sentence context. Use confidence low when unsure, medium when reasonably likely, high when clear for a common dictionary sense.
- Optional note: one short English phrase if ambiguous or you need to caveat (max 120 chars).
- If input is not Korean or is clearly not a word, still pick the closest pos, give a best-effort en gloss, set confidence low with a short note.`;

function validateRaw(raw: string): { ok: true; data: WordClassification } | { ok: false; reason: string } {
  try {
    const jsonText = extractJsonObjectText(raw);
    const data: unknown = JSON.parse(jsonText);
    const parsed = wordClassificationSchema.safeParse(data);
    if (parsed.success) return { ok: true, data: parsed.data };
    return { ok: false, reason: JSON.stringify(parsed.error.flatten().fieldErrors) };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : 'invalid JSON',
    };
  }
}

function repairMessage(badSnippet: string): string {
  return `Reply with ONLY valid JSON: {"pos":"noun"|"adjective"|"verb","confidence":"low"|"medium"|"high","en":string,"note"?:string}. Previous (trimmed): ${badSnippet.slice(0, 400)}`;
}

/** Classify a single Korean word or short phrase (max 80 chars after trim). */
export async function classifyKoreanWord(
  rawInput: string,
  options?: { signal?: AbortSignal },
): Promise<WordClassification> {
  const { signal } = options ?? {};
  const trimmed = rawInput.trim();
  if (!trimmed) throw new Error('Nothing to classify.');
  if (trimmed.length > 80) throw new Error('Word is too long (max 80 characters).');

  const client = getLlmClient();
  const userMsg = `Classify this Korean token:\n${trimmed}`;
  const reqOpts = { signal };

  let raw = await client.completeJson(
    [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: userMsg },
    ],
    reqOpts,
  );

  let checked = validateRaw(raw);
  if (!checked.ok) {
    raw = await client.completeJson(
      [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: userMsg },
        { role: 'user', content: repairMessage(raw) },
      ],
      reqOpts,
    );
    checked = validateRaw(raw);
  }

  if (!checked.ok) {
    throw new Error(`Could not classify: ${checked.reason}`);
  }

  return checked.data;
}
