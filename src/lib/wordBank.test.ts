import { describe, it, expect } from 'vitest';
import { dedupeWords, wordListsFromBank, MAX_WORDS, type StoredWord } from './wordBank';

function w(id: string, text: string, pos: StoredWord['pos'], en?: string): StoredWord {
  return en ? { id, text, pos, en } : { id, text, pos };
}

describe('dedupeWords', () => {
  it('keeps unique words', () => {
    const words = [w('1', '사과', 'noun'), w('2', '먹다', 'verb')];
    expect(dedupeWords(words)).toHaveLength(2);
  });

  it('removes exact text+pos duplicates, keeping first id', () => {
    const words = [w('1', '사과', 'noun'), w('2', '사과', 'noun')];
    const result = dedupeWords(words);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('treats same text with different pos as distinct', () => {
    const words = [w('1', '이쁘다', 'adjective'), w('2', '이쁘다', 'verb')];
    expect(dedupeWords(words)).toHaveLength(2);
  });

  it('is case-insensitive on text', () => {
    const words = [w('1', 'ABC', 'noun'), w('2', 'abc', 'noun')];
    expect(dedupeWords(words)).toHaveLength(1);
  });

  it('caps output at MAX_WORDS', () => {
    const words = Array.from({ length: MAX_WORDS + 10 }, (_, i) =>
      w(String(i), `word${i}`, 'noun'),
    );
    expect(dedupeWords(words)).toHaveLength(MAX_WORDS);
  });
});

describe('wordListsFromBank', () => {
  it('splits words into correct POS buckets', () => {
    const words = [
      w('1', '사과', 'noun'),
      w('2', '크다', 'adjective'),
      w('3', '먹다', 'verb'),
      w('4', '배', 'noun'),
    ];
    const lists = wordListsFromBank(words);
    expect(lists.nouns).toEqual(['사과', '배']);
    expect(lists.adjectives).toEqual(['크다']);
    expect(lists.verbs).toEqual(['먹다']);
  });

  it('returns empty arrays for empty bank', () => {
    const lists = wordListsFromBank([]);
    expect(lists.nouns).toHaveLength(0);
    expect(lists.adjectives).toHaveLength(0);
    expect(lists.verbs).toHaveLength(0);
  });
});
