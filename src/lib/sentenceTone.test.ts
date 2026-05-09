import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SENTENCE_TONE,
  levelFromHistoryEntry,
  parseLegacyToneStorage,
  parseSentenceTone,
  SENTENCE_TONE_LABELS,
  SENTENCE_TONES,
} from './sentenceTone';

describe('parseSentenceTone', () => {
  it('defaults unknown to medium', () => {
    expect(parseSentenceTone(null)).toBe(DEFAULT_SENTENCE_TONE);
    expect(parseSentenceTone('')).toBe(DEFAULT_SENTENCE_TONE);
    expect(parseSentenceTone('unknown')).toBe(DEFAULT_SENTENCE_TONE);
  });

  it('parses all current tones correctly', () => {
    SENTENCE_TONES.forEach((tone) => {
      expect(parseSentenceTone(tone)).toBe(tone);
      expect(parseSentenceTone(SENTENCE_TONE_LABELS[tone])).toBe(tone);
    });
  });
});

describe('parseLegacyToneStorage', () => {
  it('maps old presets to beginner or medium', () => {
    expect(parseLegacyToneStorage('beginner')).toBe('beginner');
    expect(parseLegacyToneStorage('balanced')).toBe('medium');
    expect(parseLegacyToneStorage('formal')).toBe('medium');
  });
});

describe('levelFromHistoryEntry', () => {
  it('uses sentenceLevel when set', () => {
    expect(levelFromHistoryEntry({ sentenceLevel: 'native' })).toBe('native');
  });

  it('migrates old mid to medium', () => {
    expect(levelFromHistoryEntry({ sentenceLevel: 'mid' })).toBe('medium');
  });

  it('migrates legacy tone beginner', () => {
    expect(levelFromHistoryEntry({ tone: 'beginner' })).toBe('beginner');
  });

  it('migrates other legacy tones to medium', () => {
    expect(levelFromHistoryEntry({ tone: 'formal' })).toBe('medium');
  });

  it('defaults when empty', () => {
    expect(levelFromHistoryEntry({})).toBe(DEFAULT_SENTENCE_TONE);
  });
});
