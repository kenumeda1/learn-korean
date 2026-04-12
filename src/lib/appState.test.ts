import { describe, it, expect } from 'vitest';
import {
  addWord,
  createEmptyLibrary,
  moveWordToArchive,
  restoreFromArchive,
  restoreSnapshot,
  normalizeStoredWord,
  type Library,
} from './appState';

function emptyLib(): Library {
  return createEmptyLibrary('Test');
}

describe('addWord', () => {
  it('adds a word and creates a snapshot', () => {
    const lib = emptyLib();
    const next = addWord(lib, '사과', 'noun');
    expect(next.words).toHaveLength(1);
    expect(next.words[0].text).toBe('사과');
    expect(next.words[0].pos).toBe('noun');
    expect(next.snapshots).toHaveLength(1);
  });

  it('stores optional English gloss', () => {
    const lib = emptyLib();
    const next = addWord(lib, '사과', 'noun', 'apple');
    expect(next.words[0].en).toBe('apple');
  });

  it('silently ignores duplicate text+pos', () => {
    let lib = emptyLib();
    lib = addWord(lib, '사과', 'noun');
    const again = addWord(lib, '사과', 'noun');
    expect(again).toBe(lib); // same reference — no change
  });

  it('treats same text with different pos as distinct', () => {
    let lib = emptyLib();
    lib = addWord(lib, '이쁘다', 'adjective');
    lib = addWord(lib, '이쁘다', 'verb');
    expect(lib.words).toHaveLength(2);
  });

  it('ignores empty/whitespace input', () => {
    const lib = emptyLib();
    const next = addWord(lib, '   ', 'noun');
    expect(next).toBe(lib);
  });
});

describe('moveWordToArchive / restoreFromArchive', () => {
  it('moves word out of words and into archive', () => {
    let lib = emptyLib();
    lib = addWord(lib, '사과', 'noun');
    const wordId = lib.words[0].id;
    lib = moveWordToArchive(lib, wordId);
    expect(lib.words).toHaveLength(0);
    expect(lib.archive).toHaveLength(1);
    expect(lib.archive[0].id).toBe(wordId);
    expect(typeof lib.archive[0].archivedAt).toBe('number');
  });

  it('restores archived word back to words', () => {
    let lib = emptyLib();
    lib = addWord(lib, '사과', 'noun');
    const wordId = lib.words[0].id;
    lib = moveWordToArchive(lib, wordId);
    lib = restoreFromArchive(lib, wordId);
    expect(lib.words).toHaveLength(1);
    expect(lib.archive).toHaveLength(0);
  });

  it('returns unchanged library if wordId not found', () => {
    const lib = emptyLib();
    expect(moveWordToArchive(lib, 'nonexistent')).toBe(lib);
    expect(restoreFromArchive(lib, 'nonexistent')).toBe(lib);
  });
});

describe('restoreSnapshot', () => {
  it('restores words to the snapshot state', () => {
    let lib = emptyLib();
    lib = addWord(lib, '사과', 'noun');
    const snapshot = lib.snapshots[0];
    lib = addWord(lib, '먹다', 'verb');
    expect(lib.words).toHaveLength(2);

    lib = restoreSnapshot(lib, snapshot);
    expect(lib.words).toHaveLength(1);
    expect(lib.words[0].text).toBe('사과');
  });
});

describe('normalizeStoredWord', () => {
  it('returns null for non-object input', () => {
    expect(normalizeStoredWord(null)).toBeNull();
    expect(normalizeStoredWord('string')).toBeNull();
    expect(normalizeStoredWord(42)).toBeNull();
  });

  it('returns null for invalid pos', () => {
    expect(normalizeStoredWord({ id: 'x', text: 'foo', pos: 'adverb' })).toBeNull();
  });

  it('returns null when id or text is missing', () => {
    expect(normalizeStoredWord({ text: 'foo', pos: 'noun' })).toBeNull();
    expect(normalizeStoredWord({ id: 'x', pos: 'noun' })).toBeNull();
  });

  it('returns a valid StoredWord for correct input', () => {
    const result = normalizeStoredWord({ id: 'x', text: '사과', pos: 'noun', en: 'apple' });
    expect(result).toEqual({ id: 'x', text: '사과', pos: 'noun', en: 'apple' });
  });

  it('truncates long text and en', () => {
    const longText = 'a'.repeat(100);
    const longEn = 'b'.repeat(200);
    const result = normalizeStoredWord({ id: 'x', text: longText, pos: 'noun', en: longEn });
    expect(result!.text).toHaveLength(80);
    expect(result!.en!).toHaveLength(120);
  });
});
