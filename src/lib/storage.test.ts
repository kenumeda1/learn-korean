import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadAppState,
  saveAppState,
  loadHistory,
  prependHistory,
  clearHistory,
  removeHistoryEntry,
  type HistoryEntry,
  type PersistedVocabLegacy,
} from './storage';
import type { AppStateV3 } from './appState';

const K_APP = 'munjang:app';
const K_VOCAB_LEGACY = 'language-helper:vocab';

beforeEach(() => {
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// P0 — loadAppState / saveAppState roundtrip
// ---------------------------------------------------------------------------

describe('loadAppState', () => {
  it('returns fresh initial state when localStorage is empty', () => {
    const state = loadAppState();
    expect(state.version).toBe(3);
    expect(state.libraries).toHaveLength(1);
    expect(state.libraries[0].words).toHaveLength(0);
  });

  it('roundtrips a V3 state correctly', () => {
    const initial = loadAppState();
    initial.libraries[0].words.push({ id: 'w1', text: '사과', pos: 'noun' });
    saveAppState(initial);

    const loaded = loadAppState();
    expect(loaded.version).toBe(3);
    expect(loaded.libraries[0].words).toHaveLength(1);
    expect(loaded.libraries[0].words[0].text).toBe('사과');
  });

  it('falls back to fresh state when stored JSON is corrupted', () => {
    localStorage.setItem(K_APP, 'not-json{{{');
    const state = loadAppState();
    expect(state.version).toBe(3);
    expect(state.libraries).toHaveLength(1);
  });

  it('falls back to fresh state when activeLibraryId references missing library', () => {
    const state = loadAppState();
    const broken: AppStateV3 = { ...state, activeLibraryId: 'does-not-exist' };
    saveAppState(broken);
    const loaded = loadAppState();
    // Falls back to first library id
    expect(loaded.activeLibraryId).toBe(loaded.libraries[0].id);
  });
});

// ---------------------------------------------------------------------------
// P0 — legacy migration (v1 nounsText/verbsText → V3)
// ---------------------------------------------------------------------------

describe('loadAppState — legacy migration', () => {
  it('migrates legacy nounsText/verbsText vocab to V3', () => {
    const legacy: PersistedVocabLegacy = {
      nounsText: '사과\n바나나',
      adjectivesText: '',
      verbsText: '먹다',
    };
    localStorage.setItem(K_VOCAB_LEGACY, JSON.stringify(legacy));

    const state = loadAppState();
    expect(state.version).toBe(3);
    const words = state.libraries[0].words;
    expect(words.some((w) => w.text === '사과' && w.pos === 'noun')).toBe(true);
    expect(words.some((w) => w.text === '바나나' && w.pos === 'noun')).toBe(true);
    expect(words.some((w) => w.text === '먹다' && w.pos === 'verb')).toBe(true);
    // Legacy key should be removed after migration
    expect(localStorage.getItem(K_VOCAB_LEGACY)).toBeNull();
  });

  it('migrates V2 blob (version:2 words array) to V3', () => {
    const v2 = {
      version: 2,
      words: [
        { id: 'a', text: '학교', pos: 'noun' },
        { id: 'b', text: '가다', pos: 'verb' },
      ],
    };
    localStorage.setItem(K_VOCAB_LEGACY, JSON.stringify(v2));

    const state = loadAppState();
    expect(state.version).toBe(3);
    const words = state.libraries[0].words;
    expect(words.some((w) => w.text === '학교')).toBe(true);
    expect(words.some((w) => w.text === '가다')).toBe(true);
    expect(localStorage.getItem(K_VOCAB_LEGACY)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// History helpers
// ---------------------------------------------------------------------------

function makeEntry(id: string): HistoryEntry {
  return {
    id,
    ts: Date.now(),
    result: {
      sentence: 'The apple is red.',
      korean_reference: '사과는 빨갛다.',
    },
  };
}

describe('history', () => {
  it('loadHistory returns empty array when nothing stored', () => {
    expect(loadHistory()).toEqual([]);
  });

  it('prependHistory adds entry and loadHistory retrieves it', () => {
    prependHistory(makeEntry('e1'));
    const hist = loadHistory();
    expect(hist).toHaveLength(1);
    expect(hist[0].id).toBe('e1');
  });

  it('prependHistory deduplicates by id (most recent wins at front)', () => {
    prependHistory(makeEntry('e1'));
    prependHistory(makeEntry('e2'));
    prependHistory(makeEntry('e1')); // re-add e1
    const hist = loadHistory();
    expect(hist[0].id).toBe('e1');
    expect(hist.filter((e) => e.id === 'e1')).toHaveLength(1);
  });

  it('clearHistory removes all entries', () => {
    prependHistory(makeEntry('e1'));
    clearHistory();
    expect(loadHistory()).toHaveLength(0);
  });

  it('removeHistoryEntry removes only the matching entry', () => {
    prependHistory(makeEntry('e1'));
    prependHistory(makeEntry('e2'));
    removeHistoryEntry('e1');
    const hist = loadHistory();
    expect(hist.some((e) => e.id === 'e1')).toBe(false);
    expect(hist.some((e) => e.id === 'e2')).toBe(true);
  });
});
