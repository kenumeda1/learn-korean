import type { SentenceGeneration } from '../schema/sentenceGeneration';

const K_VOCAB = 'language-helper:vocab';
const K_HISTORY = 'language-helper:history';
const HISTORY_MAX = 20;

export type PersistedVocab = {
  nounsText: string;
  adjectivesText: string;
  verbsText: string;
};

export type HistoryEntry = {
  id: string;
  ts: number;
  result: SentenceGeneration;
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadVocab(): PersistedVocab {
  const v = safeParse<PersistedVocab | null>(localStorage.getItem(K_VOCAB), null);
  if (!v || typeof v !== 'object') {
    return { nounsText: '', adjectivesText: '', verbsText: '' };
  }
  return {
    nounsText: typeof v.nounsText === 'string' ? v.nounsText : '',
    adjectivesText: typeof v.adjectivesText === 'string' ? v.adjectivesText : '',
    verbsText: typeof v.verbsText === 'string' ? v.verbsText : '',
  };
}

export function saveVocab(v: PersistedVocab): void {
  localStorage.setItem(K_VOCAB, JSON.stringify(v));
}

export function loadHistory(): HistoryEntry[] {
  const list = safeParse<unknown>(localStorage.getItem(K_HISTORY), []);
  if (!Array.isArray(list)) return [];
  return list
    .filter(
      (row): row is HistoryEntry =>
        !!row &&
        typeof row === 'object' &&
        typeof (row as HistoryEntry).id === 'string' &&
        typeof (row as HistoryEntry).ts === 'number' &&
        typeof (row as HistoryEntry).result === 'object' &&
        typeof (row as HistoryEntry).result?.sentence === 'string',
    )
    .slice(0, HISTORY_MAX);
}

export function prependHistory(entry: HistoryEntry): void {
  const prev = loadHistory();
  const next = [entry, ...prev.filter((e) => e.id !== entry.id)].slice(0, HISTORY_MAX);
  localStorage.setItem(K_HISTORY, JSON.stringify(next));
}

export function clearHistory(): void {
  localStorage.removeItem(K_HISTORY);
}
