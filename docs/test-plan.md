# Test plan — language helper (autoplan Phase 3 artifact)

**Branch:** master  
**Date:** 2026-04-06

## Coverage map

| Codepath | Type | Priority | Notes |
|----------|------|----------|--------|
| Legacy vocab JSON → v2 migration | Unit | P0 | `storage.ts` `migrateLegacy` + `loadWordBank` |
| `dedupeWords` / `MAX_WORDS` cap | Unit | P0 | `wordBank.ts` |
| `getLlmClient` proxy vs BYOK vs env | Unit (env mock) | P1 | `getLlmClient.ts` |
| `classifyKoreanWord` happy path | Integration (mock LLM) | P1 | Returns valid Zod shape |
| `classifyKoreanWord` invalid JSON then repair | Integration | P2 | Second `completeJson` call |
| Word add flow (focus, Enter, Add) | E2E or RTL | P2 | Matches TODOS spec |

## Tooling

- Vitest (align with Vite stack).
- Mock `fetch` or inject mock `LlmClient` for classification tests.

## Deferred

- Live LLM eval toggle (see TODOS P2 golden prompts).
