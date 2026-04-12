# Test plan — language helper (autoplan Phase 3 artifact)

**Branch:** main  
**Date:** 2026-04-12  
**Commit:** d82330d

## Framework

- **Vitest** (align with Vite stack)
- **React Testing Library** for component-level tests
- Inject mock `LlmClient` via `getLlmClient` factory for all LLM tests
- Mock `localStorage` with `jsdom` environment

## P0 — Storage migration (must not lose data)

| Codepath | Type | Priority | Notes |
|----------|------|----------|-------|
| Legacy vocab JSON → v1 → v2 → v3 migration | Unit | P0 | `storage.ts` `migrateLegacy` + `loadWordBank` |
| `saveAppState` + `loadAppState` roundtrip | Unit | P0 | Serializes / deserializes cleanly |
| `normalizeStoredWord` invalid input rejection | Unit | P0 | Bad pos, missing id/text → null |

## P1 — LLM client routing

| Codepath | Type | Priority | Notes |
|----------|------|----------|-------|
| Proxy path (`VITE_LLM_PROXY_PATH` set) | Unit (env mock) | P1 | Returns proxy client |
| BYOK path (byok=true + storedKey) | Unit (env mock) | P1 | Returns Anthropic or OpenAI client |
| Env Anthropic key (`sk-ant-…`) | Unit (env mock) | P1 | Auto-routes to Anthropic |
| Env OpenAI key | Unit (env mock) | P1 | Routes to OpenAI-compatible |
| No key → throws descriptive error | Unit | P1 | Error message is user-readable |

## P1 — Word bank logic

| Codepath | Type | Priority | Notes |
|----------|------|----------|-------|
| `addWord` happy path | Unit | P1 | Word added, snapshot created |
| `addWord` deduplication | Unit | P1 | Exact duplicate silently ignored |
| `addWord` / `dedupeWords` MAX_WORDS cap | Unit | P1 | `wordBank.ts` |
| `moveWordToArchive` + `restoreFromArchive` | Unit | P1 | Round-trip preserves word |
| `restoreSnapshot` restores to prior word set | Unit | P1 | |

## P1 — LLM flows (mock LLM client)

| Codepath | Type | Priority | Notes |
|----------|------|----------|-------|
| `classifyKoreanWord` happy path | Unit (mock LLM) | P1 | Returns valid Zod shape |
| `classifyKoreanWord` invalid JSON → repair path | Unit | P1 | Second `completeJson` called |
| `classifyKoreanWord` repair also fails → throws | Unit | P1 | |
| `generateSentenceFromVocab` guard: no nouns/verbs | Unit | P1 | Throws before LLM call |
| `generateSentenceFromVocab` happy path | Unit (mock LLM) | P1 | Returns `SentenceGeneration` |
| `generateSentenceFromVocab` invalid JSON → repair | Unit | P1 | |
| `generateSentenceFromVocab` missing `korean_reference` | Unit | P1 | Throws after valid JSON |
| `checkKoreanTranslation` empty input guard | Unit | P1 | Throws "Enter your Korean…" |
| `checkKoreanTranslation` happy path | Unit (mock LLM) | P1 | Returns `TranslationCheck` |
| `checkKoreanTranslation` invalid JSON → repair | Unit | P1 | |

## P2 — User flows (E2E / React Testing Library)

| Flow | Type | Priority | Notes |
|------|------|----------|-------|
| Word add: type → classify debounce → Add → card appears | RTL/E2E | P2 | Matches TODOS spec |
| Generate sentence: ≥1 noun + ≥1 verb → Generate → card | RTL/E2E | P2 | |
| Full loop: Generate → type Korean → Check → verdict | RTL/E2E | P2 | Core integrated loop |
| Library create (named): inline form → Create → active | RTL | P2 | |
| Library rename / delete | RTL | P2 | |
| Snapshot restore | RTL | P2 | |
| POS filter: switch All → Nouns → cards update | RTL | P2 | |
| Sentence gloss toggle (eye icon) | RTL | P2 | |

## P3 — LLM evals (optional live toggle)

| Eval | Type | Notes |
|------|------|-------|
| `generateSentence` golden prompts (10 vocab sets) | Eval | `eval/prompts/generate-*.md` |
| `checkKoreanTranslation` golden pairs (correct/wrong/close) | Eval | `eval/prompts/check-*.md` |

## Deferred

- Abort signal handling on rapid classify re-type
- 10,000-word bank performance (MAX_WORDS cap prevents this in practice)
- Live LLM eval toggle (see TODOS P2 golden prompts)
