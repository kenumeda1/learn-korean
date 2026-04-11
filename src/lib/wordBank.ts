import type { WordLists } from './generateSentence';
import type { WordPos } from '../schema/wordClassification';

export type StoredWord = {
  id: string;
  text: string;
  pos: WordPos;
  /** English gloss; optional for entries saved before this field existed. */
  en?: string;
};

export const MAX_WORDS = 100;

export function wordListsFromBank(words: StoredWord[]): WordLists {
  const nouns: string[] = [];
  const adjectives: string[] = [];
  const verbs: string[] = [];
  for (const w of words) {
    if (w.pos === 'noun') nouns.push(w.text);
    else if (w.pos === 'adjective') adjectives.push(w.text);
    else verbs.push(w.text);
  }
  return { nouns, adjectives, verbs };
}

export function bankKey(text: string, pos: WordPos): string {
  return `${pos}:${text.trim().toLowerCase()}`;
}

/** Dedupe: same text+pos only once (keeps first id). */
export function dedupeWords(words: StoredWord[]): StoredWord[] {
  const seen = new Set<string>();
  const out: StoredWord[] = [];
  for (const w of words) {
    const k = bankKey(w.text, w.pos);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(w);
  }
  return out.slice(0, MAX_WORDS);
}
