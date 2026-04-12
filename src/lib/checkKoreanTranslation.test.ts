import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkKoreanTranslation } from './checkKoreanTranslation';

const VALID_RESPONSE = JSON.stringify({ verdict: 'good', feedback: 'Great work!' });

vi.mock('../llm/getLlmClient', () => ({
  getLlmClient: vi.fn(),
}));

import { getLlmClient } from '../llm/getLlmClient';

const mockGetLlmClient = vi.mocked(getLlmClient);

beforeEach(() => {
  vi.clearAllMocks();
});

const PARAMS = {
  englishPrompt: 'The apple is red.',
  referenceKorean: '사과는 빨갛다.',
  userKorean: '사과는 빨개요.',
  lists: { nouns: ['사과'], adjectives: [], verbs: ['먹다'] },
};

describe('checkKoreanTranslation', () => {
  it('throws when userKorean is empty', async () => {
    await expect(
      checkKoreanTranslation({ ...PARAMS, userKorean: '   ' }),
    ).rejects.toThrow(/Enter your Korean/i);
  });

  it('returns TranslationCheck on valid response', async () => {
    mockGetLlmClient.mockReturnValue({
      completeJson: vi.fn().mockResolvedValue(VALID_RESPONSE),
    });

    const result = await checkKoreanTranslation(PARAMS);
    expect(result.verdict).toBe('good');
    expect(result.feedback).toBe('Great work!');
  });

  it('retries once on invalid JSON, succeeds on second call', async () => {
    const completeJson = vi
      .fn()
      .mockResolvedValueOnce('bad json')
      .mockResolvedValueOnce(VALID_RESPONSE);

    mockGetLlmClient.mockReturnValue({ completeJson });

    const result = await checkKoreanTranslation(PARAMS);
    expect(result.verdict).toBe('good');
    expect(completeJson).toHaveBeenCalledTimes(2);
  });

  it('throws after two invalid JSON responses', async () => {
    mockGetLlmClient.mockReturnValue({
      completeJson: vi.fn().mockResolvedValue('still bad'),
    });

    await expect(checkKoreanTranslation(PARAMS)).rejects.toThrow(/Invalid model JSON/);
  });

  it('accepts all three verdict values', async () => {
    for (const verdict of ['good', 'close', 'needs_work'] as const) {
      mockGetLlmClient.mockReturnValue({
        completeJson: vi
          .fn()
          .mockResolvedValue(JSON.stringify({ verdict, feedback: 'ok' })),
      });
      const result = await checkKoreanTranslation(PARAMS);
      expect(result.verdict).toBe(verdict);
    }
  });
});
