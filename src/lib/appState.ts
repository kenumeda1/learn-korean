import type { WordPos } from '../schema/wordClassification';
import { dedupeWords, type StoredWord } from './wordBank';
import type { ThemePreset } from './themePresets';
import { DEFAULT_THEME_PRESETS } from './themePresets';

export const SNAPSHOT_CAP = 25;

export type ArchivedWord = StoredWord & { archivedAt: number };

export type LibrarySnapshot = {
  ts: number;
  words: StoredWord[];
};

export type Library = {
  id: string;
  name: string;
  words: StoredWord[];
  archive: ArchivedWord[];
  snapshots: LibrarySnapshot[];
};

export type AppStateV3 = {
  version: 3;
  libraries: Library[];
  activeLibraryId: string;
  themePresets: ThemePreset[];
  /** Theme used for sentence generation (subset of words). */
  activeThemeId: string | null;
};

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now());
}

export function cloneWord(w: StoredWord): StoredWord {
  return { ...w, themeIds: [...(w.themeIds ?? [])] };
}

function snapshotsEqual(a: StoredWord[], b: StoredWord[]): boolean {
  if (a.length !== b.length) return false;
  return JSON.stringify(a.map(cloneWord)) === JSON.stringify(b.map(cloneWord));
}

export function appendSnapshot(library: Library, wordsAfterChange: StoredWord[]): LibrarySnapshot[] {
  const copy = dedupeWords(wordsAfterChange).map(cloneWord);
  const last = library.snapshots[library.snapshots.length - 1];
  if (last && snapshotsEqual(last.words, copy)) return library.snapshots;
  return [...library.snapshots, { ts: Date.now(), words: copy }].slice(-SNAPSHOT_CAP);
}

export function createEmptyLibrary(name: string): Library {
  return {
    id: newId(),
    name: name.slice(0, 60),
    words: [],
    archive: [],
    snapshots: [],
  };
}

export function createInitialAppState(): AppStateV3 {
  const lib = createEmptyLibrary('My library');
  return {
    version: 3,
    libraries: [lib],
    activeLibraryId: lib.id,
    themePresets: [...DEFAULT_THEME_PRESETS],
    activeThemeId: DEFAULT_THEME_PRESETS[0]?.id ?? null,
  };
}

export function normalizeStoredWord(raw: unknown): StoredWord | null {
  if (!raw || typeof raw !== 'object') return null;
  const w = raw as Record<string, unknown>;
  const pos = w.pos;
  if (pos !== 'noun' && pos !== 'adjective' && pos !== 'verb') return null;
  if (typeof w.id !== 'string' || typeof w.text !== 'string') return null;
  const themeIds = Array.isArray(w.themeIds)
    ? (w.themeIds.filter((t) => typeof t === 'string') as string[])
    : [];
  const row: StoredWord = {
    id: w.id,
    text: w.text.slice(0, 80),
    pos,
    themeIds,
  };
  if (typeof w.en === 'string' && w.en.trim()) row.en = w.en.trim().slice(0, 120);
  return row;
}

export function applyWordsWithSnapshots(library: Library, nextWords: StoredWord[]): Library {
  const words = dedupeWords(nextWords);
  const snapshots = appendSnapshot(library, words);
  return { ...library, words, snapshots };
}

export function moveWordToArchive(library: Library, wordId: string): Library {
  const word = library.words.find((w) => w.id === wordId);
  if (!word) return library;
  const rest = library.words.filter((w) => w.id !== wordId);
  const archived: ArchivedWord = { ...cloneWord(word), archivedAt: Date.now() };
  let lib = applyWordsWithSnapshots(library, rest);
  lib = { ...lib, archive: [archived, ...lib.archive] };
  return lib;
}

export function restoreFromArchive(library: Library, archiveId: string): Library {
  const idx = library.archive.findIndex((w) => w.id === archiveId);
  if (idx === -1) return library;
  const aw = library.archive[idx];
  const { archivedAt: _a, ...word } = aw;
  const nextArchive = [...library.archive.slice(0, idx), ...library.archive.slice(idx + 1)];
  const lib = { ...library, archive: nextArchive };
  return applyWordsWithSnapshots(lib, [...lib.words, word]);
}

export function addWord(
  library: Library,
  text: string,
  pos: WordPos,
  themeIds: string[],
  en?: string,
): Library {
  const trimmed = text.trim();
  if (!trimmed) return library;
  const gloss = en?.trim();
  const row: StoredWord = {
    id: newId(),
    text: trimmed.slice(0, 80),
    pos,
    themeIds: [...new Set(themeIds)],
  };
  if (gloss) row.en = gloss.slice(0, 120);
  const next = [...library.words, row];
  const deduped = dedupeWords(next);
  if (deduped.length === library.words.length) return library;
  return applyWordsWithSnapshots(library, deduped);
}

export function setWordThemes(library: Library, wordId: string, themeIds: string[]): Library {
  const nextWords = library.words.map((w) =>
    w.id === wordId ? { ...w, themeIds: [...new Set(themeIds)] } : w,
  );
  return applyWordsWithSnapshots(library, nextWords);
}

export function purgeArchiveEntry(library: Library, archiveId: string): Library {
  return { ...library, archive: library.archive.filter((w) => w.id !== archiveId) };
}

export function restoreSnapshot(library: Library, snapshot: LibrarySnapshot): Library {
  return applyWordsWithSnapshots(library, snapshot.words.map(cloneWord));
}
