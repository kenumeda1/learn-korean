import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateSentenceFromVocab, shouldPassLibraryTheme } from './generateSentence';

const VALID_RESPONSE = JSON.stringify({
  sentence: 'The apple is red.',
  korean_reference: '사과는 빨갛다.',
  confidence: 'high',
});

vi.mock('../llm/getLlmClient', () => ({
  getLlmClient: vi.fn(),
}));

import { getLlmClient } from '../llm/getLlmClient';

const mockGetLlmClient = vi.mocked(getLlmClient);

beforeEach(() => {
  vi.clearAllMocks();
});

const LISTS = { nouns: ['사과'], adjectives: [], verbs: ['먹다'] };

describe('shouldPassLibraryTheme', () => {
  it('returns false for empty and default My library', () => {
    expect(shouldPassLibraryTheme(undefined)).toBe(false);
    expect(shouldPassLibraryTheme('')).toBe(false);
    expect(shouldPassLibraryTheme('My library')).toBe(false);
    expect(shouldPassLibraryTheme('  my library  ')).toBe(false);
  });

  it('returns true for a named topic', () => {
    expect(shouldPassLibraryTheme('Pizza')).toBe(true);
    expect(shouldPassLibraryTheme('Travel')).toBe(true);
  });
});

describe('generateSentenceFromVocab', () => {
  it('throws if nouns list is empty', async () => {
    await expect(
      generateSentenceFromVocab({ nouns: [], adjectives: [], verbs: ['가다'] }),
    ).rejects.toThrow(/noun/i);
  });

  it('throws if verbs list is empty', async () => {
    await expect(
      generateSentenceFromVocab({ nouns: ['사과'], adjectives: [], verbs: [] }),
    ).rejects.toThrow(/verb/i);
  });

  it('returns SentenceGeneration on valid response', async () => {
    mockGetLlmClient.mockReturnValue({
      completeJson: vi.fn().mockResolvedValue(VALID_RESPONSE),
    });

    const result = await generateSentenceFromVocab(LISTS);
    expect(result.sentence).toBe('The apple is red.');
    expect(result.korean_reference).toBe('사과는 빨갛다.');
  });

  it('includes library theme in the user message when provided', async () => {
    const completeJson = vi.fn().mockResolvedValue(VALID_RESPONSE);
    mockGetLlmClient.mockReturnValue({ completeJson });

    await generateSentenceFromVocab(LISTS, { libraryTheme: 'Pizza' });

    const firstCall = completeJson.mock.calls[0];
    const messages = firstCall[0] as { role: string; content: string }[];
    const userContent = messages.find((m) => m.role === 'user')?.content ?? '';
    expect(userContent).toContain('Theme:');
    expect(userContent).toContain('Pizza');
  });

  it('includes level in the user message', async () => {
    const completeJson = vi.fn().mockResolvedValue(VALID_RESPONSE);
    mockGetLlmClient.mockReturnValue({ completeJson });

    await generateSentenceFromVocab(LISTS, { level: 'beginner' });

    const firstCall = completeJson.mock.calls[0];
    const messages = firstCall[0] as { role: string; content: string }[];
    const userContent = messages.find((m) => m.role === 'user')?.content ?? '';
    expect(userContent).toContain('beginner');
  });

  it('retries once on invalid JSON, succeeds on second call', async () => {
    const completeJson = vi
      .fn()
      .mockResolvedValueOnce('not json at all')
      .mockResolvedValueOnce(VALID_RESPONSE);

    mockGetLlmClient.mockReturnValue({ completeJson });

    const result = await generateSentenceFromVocab(LISTS);
    expect(result.sentence).toBe('The apple is red.');
    expect(completeJson).toHaveBeenCalledTimes(2);
  });

  it('throws after two invalid JSON responses', async () => {
    const completeJson = vi
      .fn()
      .mockResolvedValue('still not json');

    mockGetLlmClient.mockReturnValue({ completeJson });

    await expect(generateSentenceFromVocab(LISTS)).rejects.toThrow(/Invalid model JSON/);
    expect(completeJson).toHaveBeenCalledTimes(2);
  });

  it('throws when korean_reference is missing from otherwise valid JSON', async () => {
    const noRef = JSON.stringify({ sentence: 'The apple is red.' });
    mockGetLlmClient.mockReturnValue({
      completeJson: vi.fn().mockResolvedValue(noRef),
    });

    await expect(generateSentenceFromVocab(LISTS)).rejects.toThrow(/korean_reference/);
  });
});
