import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SENTENCE_LEVEL,
  levelFromHistoryEntry,
  parseLegacyToneStorage,
  parseSentenceLevel,
} from './sentenceTone';

describe('parseSentenceLevel', () => {
  it('defaults unknown to mid', () => {
    expect(parseSentenceLevel(null)).toBe(DEFAULT_SENTENCE_LEVEL);
    expect(parseSentenceLevel('')).toBe(DEFAULT_SENTENCE_LEVEL);
  });
});

describe('parseLegacyToneStorage', () => {
  it('maps old presets to beginner or mid', () => {
    expect(parseLegacyToneStorage('beginner')).toBe('beginner');
    expect(parseLegacyToneStorage('balanced')).toBe('mid');
    expect(parseLegacyToneStorage('formal')).toBe('mid');
  });
});

describe('levelFromHistoryEntry', () => {
  it('uses sentenceLevel when set', () => {
    expect(levelFromHistoryEntry({ sentenceLevel: 'advanced' })).toBe('advanced');
  });

  it('migrates legacy tone beginner', () => {
    expect(levelFromHistoryEntry({ tone: 'beginner' })).toBe('beginner');
  });

  it('migrates other legacy tones to mid', () => {
    expect(levelFromHistoryEntry({ tone: 'formal' })).toBe('mid');
  });

  it('defaults when empty', () => {
    expect(levelFromHistoryEntry({})).toBe(DEFAULT_SENTENCE_LEVEL);
  });
});
