# Language Helper — product plan (draft)

**Branch:** master  
**Last updated:** 2026-04-06

## Premises (confirm or correct)

1. **Learner-first:** The primary user is a Korean language learner who wants to collect vocabulary by part of speech and generate practice sentences from that bank.
2. **LLM is required:** Classification and sentence generation depend on an LLM; offline-only mode is out of scope for v1.
3. **Trust boundary:** In development, BYOK in `localStorage` is acceptable with explicit opt-in; any shared or production deployment must route LLM calls through a same-origin proxy so the browser never holds long-lived provider secrets for strangers.
4. **Single-page app:** One React SPA, Vite, client persistence via `localStorage` is sufficient until multi-device sync is explicitly prioritized.

## Problem

Learners accumulate words ad hoc. The app should make it fast to type a Korean token, see a suggested part of speech (with confidence), override when the model is wrong, add to a structured bank, and generate sentences that exercise that bank.

## Current implementation (inventory)

- **Word input UX:** Debounced classify (~420ms), Enter triggers classify without saving; explicit POS choice + Add (and ⌘/Ctrl+Enter) commits to bank; max 100 words; dedupe by `pos:text`.
- **Persistence:** `language-helper:vocab` v2 JSON in `localStorage`; legacy textarea format migrates once; generation `language-helper:history` capped at 20.
- **LLM boundary:** `getLlmClient()` in `src/llm/getLlmClient.ts` — `VITE_LLM_PROXY_PATH` → `createProxyLlmClient`; else BYOK + optional `VITE_OPENAI_*` env. Matches TODOS P1 intent; production proxy route may still be unimplemented in repo.
- **Classification:** `classifyKoreanWord` with Zod schema, JSON repair pass on bad output.
- **Other:** Sentence generation via `generateSentence` (existing pipeline).

## Goals (from TODOS, prioritized)

| Priority | Item | Definition of done |
|----------|------|-------------------|
| P1 | Prod proxy | Document `VITE_LLM_PROXY_PATH`; ship minimal API route or worker that forwards to provider with server-side key; verify app works with proxy only (no BYOK) in prod-like build. |
| P2 | Golden prompts | `eval/prompts/` + fixtures; tests for parser/Zod; optional live eval flag. |
| P3 | CSP + headers | Document and apply CSP for static hosting before public URL. |

## Implementation approach (locked — /plan-ceo-review 2026-04-06)

**Approach B — Balanced:** Same-origin proxy + README env table; **Vitest** for `storage` / `wordBank` / `getLlmClient` branches; execute **`docs/test-plan.md` P0/P1**; add **`eval/prompts`** skeleton. **No eval CI gate in M1** (manual QA + unit/integration/RTL only until **M3**).

**Cherry-picks accepted:** (1) **M1 writing-lab slice** aligned with existing `generateSentence` JSON shape — ship fields that exist, stub/hide the rest with honest copy; (2) **RTL first** for word-add flow (**happy + classify error**); Playwright only if RTL cannot cover keyboard/focus.

**Cherry-picks skipped for v0:** Named provider error taxonomy (401/429/timeout copy + tests); PWA/install; word-bank export — see **TODOS.md** deferred items.

**Critical path:** M1 writing-lab UI in **dev** uses BYOK/env. **Prod-like proxy-only verification** is **M2**; do not block M1 on deploying the worker.

## Explicitly NOT in scope (near term)

- User accounts, sync, or backend DB.
- Non-Korean target languages.
- Full Wiktionary-grade POS disambiguation without LLM.
- **v0:** PWA / install (desktop-only until revisited).
- **v0:** Word-bank export (siloed local data is intentional until users ask).
- **v0:** Per-status provider error map (401/429/timeout); generic failure copy is accepted tech debt — promote when shipping beyond solo.

## Milestones

1. **M1 — Spec + writing-lab slice + tests**
   - **Word flow:** Matches **TODOS.md § Spec — word input, Enter, and Add** (debounce, Enter, Add, ⌘/Ctrl+Enter, focus return, dedupe, cap).
   - **Writing-lab slice:** Learner Korean text in → structured feedback UI; states: **loading**, **empty prompt**, **error**, **low-confidence** warning (confidence below app constant, e.g. `0.72`, or ambiguous POS — non-blocking, manual override stays).
   - **Shape:** Reuse **`generateSentence` / existing sentence feedback JSON** — no parallel LLM surface. Zod-validate; repair path logged in dev; one actionable user line on failure (generic OK for v0).
   - **Tests:** `docs/test-plan.md` **P0/P1** green; **RTL** word-add **happy + classify error** green.
   - **Checklist:** See **M1 acceptance checklist** below.
2. **M2 — Proxy path:** Implement + document proxy; treat BYOK as dev-only in README; prod-like build works proxy-only.
3. **M3 — Evals:** Golden set for classification JSON (and sentence schema if stable); optional live eval / CI gate from here on.
4. **M4 — Hardening:** CSP, dependency audit note, broader error copy pass (can incorporate deferred provider status map).

### M1 acceptance checklist (engineering)

- [ ] TODOS word-flow spec behaviors verified in `App.tsx`.
- [ ] Writing-lab panel: loading, empty, error, low-confidence warning, success — real model output or sections hidden (no fake data).
- [ ] LLM response Zod-validated; repair path observable in dev.
- [ ] `docs/test-plan.md` P0/P1 tests green; RTL word-add happy + classify error green.

**CEO plan artifact:** `~/.gstack/projects/languagehelper/ceo-plans/2026-04-06-language-helper-selective.md`

## Risks

- **Key leak:** BYOK in `localStorage` is XSS-sensitive; README must warn; prod must use proxy.
- **Ambiguous POS:** UX must keep manual override obvious (already in spec).
- **Provider outages:** Surface actionable errors (HTTP message / proxy error) without dumping raw stack traces to UI.

---

<!-- /autoplan: review appended below; restore point N/A for first draft -->

## /autoplan review (2026-04-06)

**Mode:** single-reviewer (Codex CLI and separate Claude subagent not run in this session). Treat outside-voice rows as **N/A**.

### CEO DUAL VOICES — CONSENSUS TABLE

| Dimension | Claude | Codex | Consensus |
|-----------|--------|-------|-----------|
| Premises valid? | Plausible for v1; #3 needs enforcement in docs + deploy | N/A | **PENDING USER** (premise gate) |
| Right problem? | Yes for solo learner tool | N/A | Align |
| Scope calibration? | M1–M4 are boilable; sync/accounts correctly deferred | N/A | Align |
| Alternatives explored? | Could add “no-LLM heuristic POS” — deferred (complexity) | N/A | Defer |
| Competitive risks? | Generic; differentiation is UX + eval discipline | N/A | Monitor |
| 6-month trajectory? | Proxy + evals + CSP = reasonable foundation | N/A | Align |

**NOT in scope (CEO):** Multi-tenant hosted BYOK, mobile apps, curriculum partnerships (defer to TODOS if needed).

**What already exists:** `getLlmClient`, word bank v2, classify + Zod, history, generate path — **P1 seam exists in code; missing piece is likely deployable proxy + docs.**

**Dream state delta:** 12-month ideal might include spaced repetition and cross-device lists; this plan stops at sentence practice + solid LLM boundary.

### Design (UI scope — yes)

**Litmus (single reviewer):**

| Dimension | Score / note |
|-----------|----------------|
| Hierarchy | Input + suggestion + POS chips + Add should stay above the fold; verify on small laptop height. |
| States | Specify: classify loading, empty suggestion, low confidence, classify error, proxy/key missing. |
| Journey | Type → see suggestion → adjust POS → Add → see chip in list; emotional break if “Add” feels inert (focus + hint). |
| Specificity | TODOS spec is concrete; ensure ⌘Enter matches button behavior in code review. |
| Ambiguity debt | BYOK panel vs env key: one paragraph in UI help to avoid “why doesn’t it work”. |

**Auto-decisions:** Require non-blocking inline error for missing API key (catch `getLlmClient` throw path). **TASTE:** Whether BYOK toggle is prominent vs buried under “Advanced” (recommend: advanced collapsible to reduce accidental key storage).

### ENG DUAL VOICES — CONSENSUS TABLE

| Dimension | Claude | Codex | Consensus |
|-----------|--------|-------|-----------|
| Architecture sound? | Client + thin proxy pattern is right | N/A | Align |
| Tests sufficient? | Gap: no automated tests cited for classify or storage migration | N/A | **Gap** |
| Performance? | Debounce + abort on new input — good; watch LLM double-call on repair | N/A | Align |
| Security? | BYOK XSS risk documented; proxy required for prod | N/A | Align |
| Error paths? | Validate user-facing messages for 401/429 from provider | N/A | **Check** |
| Deploy risk? | Proxy not in repo may block “production-like” CI | N/A | **Implement or stub** |

**Architecture (ASCII)**

```
[App.tsx] → classifyKoreanWord / generateSentence
       → getLlmClient()
              ├─ VITE_LLM_PROXY_PATH → fetch(same-origin) → [server TBD]
              └─ BYOK / env → OpenAI-compatible HTTPS
       → storage.ts (localStorage vocab v2, history)
```

**Test diagram (gaps)**

| Codepath | Suggested test | Exists? |
|----------|----------------|---------|
| Legacy vocab → v2 migration | Unit: `migrateLegacy` + round-trip | **?** add if missing |
| `dedupeWords` / MAX_WORDS | Unit | **?** |
| `classifyKoreanWord` Zod fail → repair | Integration mock client | **No** — P2 |
| `getLlmClient` branches | Unit with env mocks | **?** |

**Test plan artifact:** `~/.gstack/projects/language-helper/master-test-plan-20260406.md` — *write deferred* if `~/.gstack` unavailable; see Decision log.

### DX review (conditional — yes: env vars, proxy, BYOK)

**DX consensus (single reviewer):**

| Dimension | Note |
|-----------|------|
| TTHW | Target &lt; 5 min: `npm install`, `npm run dev`, set BYOK or `VITE_OPENAI_API_KEY`, works. |
| Naming | `VITE_LLM_PROXY_PATH`, `VITE_OPENAI_*` are guessable; document in README. |
| Errors | `getLlmClient` throw message is actionable — keep in sync with README. |
| Docs | README missing from repo root — **add** getting started + security note. |
| Upgrade | No breaking migration yet; when proxy lands, document env transition. |

**Developer journey (short):** Clone → install → dev server → choose BYOK or env → classify word → add → generate.

### Cross-phase themes

- **Prod readiness vs dev BYOK** appears in CEO, Eng, DX: same fix — proxy + README contract.
- **Testing** appears in Eng and P2 TODOS: golden prompts are the right next artifact.

### Decision Audit Trail

<!-- AUTONOMOUS DECISION LOG -->
| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|----------------|-----------|----------|----------|
| 1 | CEO | Defer non-LLM heuristic POS | Mechanical | P4 DRY | Duplicates LLM value; high maintenance | Heuristic classifier |
| 2 | CEO | Keep milestones M1–M4 | Mechanical | P1 completeness | Covers boundary, evals, hardening | Larger scope (accounts) |
| 3 | Design | BYOK under “Advanced” collapsible | Taste | P5 explicit | Reduces casual key storage | Prominent toggle |
| 4 | Eng | Prioritize unit tests for storage + dedupe before live LLM eval | Mechanical | P1 | Fast feedback | Only manual QA |
| 5 | DX | Add root README with env table | Mechanical | P1 | TTHW blocker | Defer docs |

### Pre-gate verification checklist

- [x] Plan premises stated
- [x] CEO / Design / Eng / DX sections present (dual voice marked N/A)
- [x] Architecture diagram
- [x] Test diagram with gaps
- [x] Test plan in repo: `docs/test-plan.md`
- [x] Decision audit trail started

### User Challenges

None (single reviewer; no second model to agree on “change user direction”).

### Final approval gate (your turn)

**Summary:** This plan nails a learner SPA with a clean LLM seam in code; **ship risk** is documented proxy + tests + README. **TASTE:** BYOK prominence (recommend Advanced).

**RECOMMENDATION:** Approve premises #1–4 as written unless you want offline or multi-device in scope.

**Options:**

- **A)** Approve plan + premises; proceed implementation in milestone order.
- **B)** Override: specify premise or taste changes (e.g. BYOK always visible).
- **C)** Revise plan text in `PLAN.md` and re-review a subsection.

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | /plan-ceo-review | Scope & strategy | 2 | **LOCKED** | SELECTIVE + Approach B; 2 cherry-picks accepted, 3 skipped; CEO plan on disk |
| Codex Review | /codex review | Independent 2nd opinion | 0 | — | Not run (Codex not on PATH) |
| Eng Review | /autoplan, /plan-eng-review | Architecture & tests | 1+ | Re-run advised | Stale vs working tree until M1 lands |
| Design Review | /autoplan | UI/UX | 1 | — | Consider /plan-design-review if M1 UI grows |
| DX Review | /autoplan | Developer experience | 1 | — | README + env table still P0 |

**VERDICT:** **CEO scope locked** — implement M1–M4 per milestones above; **re-run Eng Review** on latest diff before ship.
