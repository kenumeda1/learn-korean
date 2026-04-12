import { extractJsonObjectText } from './extractJson';
import { wordsToPromptLines } from './parseWordList';
import { getLlmClient } from '../llm/getLlmClient';
import { translationCheckSchema, type TranslationCheck } from '../schema/translationCheck';
import type { WordLists } from './generateSentence';
import { DEFAULT_SENTENCE_TONE, toneBlockForChecker, type SentenceTone } from './sentenceTone';

const SYSTEM = `You are a Korean tutor. The learner saw an English prompt and wrote Korean.
Compare their Korean to the reference Korean and whether it expresses the English meaning using the given vocabulary where natural.
The user message includes an intended tone; judge register and style against that tone, not against a generic formal ideal.
Reply with ONLY a JSON object (no markdown):
{"verdict":"good"|"close"|"needs_work","feedback":"string"}
Rules:
- verdict "good": natural, meaning matches, vocab use is acceptable (minor typos ok).
- verdict "close": understandable but grammar/register/word choice could improve; or small meaning slip.
- verdict "needs_work": wrong meaning, missing key content, or unnatural in a way that would confuse a native.
- feedback: 2–4 short sentences in English, encouraging tone; mention what worked and one concrete improvement if not "good".
- Do not quote the full reference unless comparing one phrase; focus on the learner's text.`;

function userPayload(
  englishPrompt: string,
  referenceKorean: string,
  userKorean: string,
  lists: WordLists,
  tone: SentenceTone,
): string {
  return `English prompt:\n${englishPrompt}\n\nReference Korean (model):\n${referenceKorean}\n\nLearner's Korean:\n${userKorean}\n\n${toneBlockForChecker(tone)}\n\nVocabulary context:\nNouns:\n${wordsToPromptLines(lists.nouns)}\n\nAdjectives:\n${wordsToPromptLines(lists.adjectives)}\n\nVerbs:\n${wordsToPromptLines(lists.verbs)}\n\nReply with JSON now.`;
}

function validate(raw: string): { ok: true; data: TranslationCheck } | { ok: false; reason: string } {
  try {
    const jsonText = extractJsonObjectText(raw);
    const data: unknown = JSON.parse(jsonText);
    const parsed = translationCheckSchema.safeParse(data);
    if (parsed.success) return { ok: true, data: parsed.data };
    return { ok: false, reason: JSON.stringify(parsed.error.flatten().fieldErrors) };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'invalid JSON' };
  }
}

export async function checkKoreanTranslation(params: {
  englishPrompt: string;
  referenceKorean: string;
  userKorean: string;
  lists: WordLists;
  /** Must match the tone used when the sentence was generated. */
  tone?: SentenceTone;
}): Promise<TranslationCheck> {
  const trimmed = params.userKorean.trim();
  if (!trimmed) {
    throw new Error('Enter your Korean translation before checking.');
  }

  const tone = params.tone ?? DEFAULT_SENTENCE_TONE;
  const user = userPayload(
    params.englishPrompt,
    params.referenceKorean,
    trimmed,
    params.lists,
    tone,
  );
  const client = getLlmClient();
  let raw = await client.completeJson([
    { role: 'system', content: SYSTEM },
    { role: 'user', content: user },
  ]);

  let checked = validate(raw);
  if (!checked.ok) {
    raw = await client.completeJson([
      { role: 'system', content: SYSTEM },
      { role: 'user', content: user },
      {
        role: 'user',
        content: `Your reply was not valid JSON. Reply with ONLY: {"verdict":"good"|"close"|"needs_work","feedback":"..."}. Previous: ${raw.slice(0, 600)}`,
      },
    ]);
    checked = validate(raw);
  }

  if (!checked.ok) {
    throw new Error(`Invalid model JSON after retry: ${checked.reason}`);
  }

  return checked.data;
}
