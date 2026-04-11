import type { SentenceGeneration } from '../schema/sentenceGeneration';
import { parseWordList } from './parseWordList';
import { dedupeWords, type StoredWord } from './wordBank';
import type { WordPos } from '../schema/wordClassification';
import {
  type AppStateV3,
  type Library,
  createEmptyLibrary,
  createInitialAppState,
  newId,
  normalizeStoredWord,
} from './appState';

const K_APP = 'language-helper:app';
const K_VOCAB_LEGACY = 'language-helper:vocab';
const K_HISTORY = 'language-helper:history';
const K_CLASSIFY_REPORTS = 'language-helper:classify-reports';
const HISTORY_MAX = 20;
const CLASSIFY_REPORTS_MAX = 40;

/** Legacy shape before word-bank v2. */
export type PersistedVocabLegacy = {
  nounsText: string;
  adjectivesText: string;
  verbsText: string;
};

type PersistedVocabV2 = {
  version: 2;
  words: StoredWord[];
};

export type HistoryEntry = {
  id: string;
  ts: number;
  result: SentenceGeneration;
  libraryId?: string;
  libraryName?: string;
  themeId?: string;
  themeLabel?: string;
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function migrateLegacy(legacy: PersistedVocabLegacy): StoredWord[] {
  const nouns = parseWordList(legacy.nounsText ?? '');
  const adjectives = parseWordList(legacy.adjectivesText ?? '');
  const verbs = parseWordList(legacy.verbsText ?? '');
    const words: StoredWord[] = [
    ...nouns.map((text) => ({ id: newId(), text, pos: 'noun' as WordPos })),
    ...adjectives.map((text) => ({ id: newId(), text, pos: 'adjective' as WordPos })),
    ...verbs.map((text) => ({ id: newId(), text, pos: 'verb' as WordPos })),
  ];
  return dedupeWords(words);
}

function isV2(data: unknown): data is PersistedVocabV2 {
  return (
    !!data &&
    typeof data === 'object' &&
    (data as PersistedVocabV2).version === 2 &&
    Array.isArray((data as PersistedVocabV2).words)
  );
}

function isLegacy(data: unknown): data is PersistedVocabLegacy {
  return (
    !!data &&
    typeof data === 'object' &&
    ('nounsText' in data || 'adjectivesText' in data || 'verbsText' in data)
  );
}

function isV3(data: unknown): data is AppStateV3 {
  return (
    !!data &&
    typeof data === 'object' &&
    (data as AppStateV3).version === 3 &&
    Array.isArray((data as AppStateV3).libraries) &&
    typeof (data as AppStateV3).activeLibraryId === 'string'
  );
}

function normalizeV2Words(raw: unknown[]): StoredWord[] {
  const out: StoredWord[] = [];
  for (const w of raw) {
    const row = normalizeStoredWord(w);
    if (row) out.push(row);
  }
  return dedupeWords(out);
}

function normalizeLibrary(raw: unknown): Library | null {
  if (!raw || typeof raw !== 'object') return null;
  const L = raw as Record<string, unknown>;
  if (typeof L.id !== 'string' || typeof L.name !== 'string') return null;
  if (!Array.isArray(L.words)) return null;
  const words = normalizeV2Words(L.words);
  const archive: Library['archive'] = [];
  if (Array.isArray(L.archive)) {
    for (const a of L.archive) {
      if (!a || typeof a !== 'object') continue;
      const aw = a as Record<string, unknown>;
      const base = normalizeStoredWord(aw);
      if (base && typeof aw.archivedAt === 'number') {
        archive.push({ ...base, archivedAt: aw.archivedAt });
      }
    }
  }
  const snapshots: Library['snapshots'] = [];
  if (Array.isArray(L.snapshots)) {
    for (const s of L.snapshots) {
      if (!s || typeof s !== 'object') continue;
      const sn = s as Record<string, unknown>;
      if (typeof sn.ts !== 'number' || !Array.isArray(sn.words)) continue;
      const sw = normalizeV2Words(sn.words);
      snapshots.push({ ts: sn.ts, words: sw });
    }
  }
  return {
    id: L.id,
    name: L.name.slice(0, 60),
    words,
    archive,
    snapshots,
  };
}

function loadFromV2Blob(parsed: PersistedVocabV2): AppStateV3 {
  const words = normalizeV2Words(parsed.words as unknown[]);
  const lib = createEmptyLibrary('My library');
  const state = createInitialAppState();
  const first = { ...lib, words, name: 'My library' };
  return {
    ...state,
    libraries: [first],
    activeLibraryId: first.id,
  };
}

/** Load app state; migrates legacy localStorage keys once. */
export function loadAppState(): AppStateV3 {
  const rawApp = localStorage.getItem(K_APP);
  const parsedApp = safeParse<unknown>(rawApp, null);
  if (isV3(parsedApp)) {
    const libraries: Library[] = [];
    for (const l of parsedApp.libraries) {
      const lib = normalizeLibrary(l);
      if (lib) libraries.push(lib);
    }
    if (libraries.length === 0) {
      const fresh = createInitialAppState();
      saveAppState(fresh);
      return fresh;
    }
    const activeLibraryId = libraries.some((l) => l.id === parsedApp.activeLibraryId)
      ? parsedApp.activeLibraryId
      : libraries[0].id;
    return {
      version: 3,
      libraries,
      activeLibraryId,
    };
  }

  const rawVocab = localStorage.getItem(K_VOCAB_LEGACY);
  const parsedVocab = safeParse<unknown>(rawVocab, null);
  if (isV2(parsedVocab)) {
    const state = loadFromV2Blob(parsedVocab);
    saveAppState(state);
    localStorage.removeItem(K_VOCAB_LEGACY);
    return state;
  }
  if (isLegacy(parsedVocab)) {
    const words = migrateLegacy(parsedVocab);
    const state = loadFromV2Blob({ version: 2, words });
    saveAppState(state);
    localStorage.removeItem(K_VOCAB_LEGACY);
    return state;
  }

  const fresh = createInitialAppState();
  saveAppState(fresh);
  return fresh;
}

export function saveAppState(state: AppStateV3): void {
  localStorage.setItem(K_APP, JSON.stringify(state));
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

export function removeHistoryEntry(id: string): void {
  const prev = loadHistory();
  const next = prev.filter((e) => e.id !== id);
  localStorage.setItem(K_HISTORY, JSON.stringify(next));
}

export type ClassifyReportEntry = {
  id: string;
  ts: number;
  word: string;
  en: string;
  pos: WordPos;
  note: string;
};

/** Append a learner flag about an incorrect gloss or POS; stored locally only. */
export function appendClassifyReport(entry: { word: string; en: string; pos: WordPos; note: string }): void {
  const prev = safeParse<ClassifyReportEntry[]>(localStorage.getItem(K_CLASSIFY_REPORTS), []);
  const list = Array.isArray(prev) ? prev : [];
  const row: ClassifyReportEntry = {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()),
    ts: Date.now(),
    word: entry.word.trim().slice(0, 80),
    en: entry.en.trim().slice(0, 200),
    pos: entry.pos,
    note: entry.note.trim().slice(0, 500),
  };
  const next = [row, ...list.filter((r) => r && typeof r.id === 'string')].slice(0, CLASSIFY_REPORTS_MAX);
  localStorage.setItem(K_CLASSIFY_REPORTS, JSON.stringify(next));
}

/** @deprecated use loadAppState */
export function loadWordBank(): StoredWord[] {
  const s = loadAppState();
  return s.libraries.find((l) => l.id === s.activeLibraryId)?.words ?? [];
}

/** @deprecated */
export function saveWordBank(_words: StoredWord[]): void {
  /* no-op — App uses saveAppState */
}

/** @deprecated */
export function addWordToBank(words: StoredWord[], text: string, pos: WordPos, en?: string): StoredWord[] {
  const row: StoredWord = {
    id: newId(),
    text: text.trim().slice(0, 80),
    pos,
  };
  if (en?.trim()) row.en = en.trim().slice(0, 120);
  return dedupeWords([...words, row]);
}

/** @deprecated */
export function removeWordFromBank(words: StoredWord[], id: string): StoredWord[] {
  return words.filter((w) => w.id !== id);
}

/** @deprecated */
export function loadVocab(): PersistedVocabLegacy {
  const words = loadWordBank();
  const nounsText = words.filter((w) => w.pos === 'noun').map((w) => w.text).join('\n');
  const adjectivesText = words.filter((w) => w.pos === 'adjective').map((w) => w.text).join('\n');
  const verbsText = words.filter((w) => w.pos === 'verb').map((w) => w.text).join('\n');
  return { nounsText, adjectivesText, verbsText };
}

/** @deprecated */
export function saveVocab(_v: PersistedVocabLegacy): void {
  /* no-op */
}
