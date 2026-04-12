<!-- /autoplan restore point: /Users/kenumeda/.gstack/projects/kenumeda1-learn-korean/main-autoplan-restore-20260412-124309.md -->
# Language Helper — experience plan (design review target)

**Last updated:** 2026-04-08  
**Design system:** `DESIGN.md` (Fluent Sky)

## North star

**Who:** English-speaking adults learning **Korean**.  
**Job:** Turn **words they are studying** into **real Korean usage** they can practice, not just isolated glosses.  
**Outcome:** After a short session, the learner has **added vocabulary** and **engaged with a sentence** built from that vocabulary, so they start to see *how* words combine—not only *what* they mean.

## Problem

“I’m learning new words, but I don’t know how to use them.” Word lists and flashcards leave a **usage gap**. This app closes it by making a **practice sentence** (from the learner’s own bank) the natural next step after collecting words.

## Product promise (one sentence)

**Add Korean words you care about → the app stores them with part-of-speech and gloss → you generate a sentence from your library → you study Korean first and reveal English when you choose.**

## Core journey (happy path)

| Step | User does | User sees | Emotional beat |
|------|-----------|-----------|----------------|
| 1 | Opens app | Library bar, word field, POS filters, word grid | “This is my workspace.” |
| 2 | Types a Korean word | Debounced classification: gloss, suggested POS, confidence | “It understands this word.” |
| 3 | Adds word (Add or ⌘/Ctrl+Enter) | Card in grid with Korean, English gloss when available, POS tag | “It’s in my bank.” |
| 4 | Adds more words (≥1 noun + ≥1 verb) | Filters help scan by POS | “I can build a usable set.” |
| 5 | Clicks **Generate sentence** | New **Recent sentence**: Korean line; English **hidden** until eye control | “I read Korean before peeking.” |
| 6 | Toggles eye | English translation appears | “I check myself.” |
| 7 | Manages libraries | Create (name first), rename, delete, switch; snapshots / archive under Library backup | “I can organize and recover.” |

## Information architecture (single page, top → bottom)

1. Eyebrow + title + hero (how to type, classify, add, generate).
2. **Library** toolbar (select library, create with inline name step, ⋯ rename/delete).
3. **Word input** shell (icon, field, Add) + classify hint + live classify status.
4. **POS filter** pills (All / Nouns / Verbs / Adjectives) for the grid only.
5. **Word bank** grid (streamlined cards: POS, KO, EN gloss, remove).
6. **Generate sentence** (primary CTA + hint when noun/verb missing).
7. **Library backup** (snapshots, archive) in a collapsed details block.
8. **Recent sentences** (clear all; cards with optional library line, **Latest** badge, Korean, gated English gloss, caveats).
9. **Model access** (dev/BYOK) in collapsed details.
10. Footer note (word count cap, generation uses whole library).

## “Learn deeply” → concrete UI behaviors

| Principle | Behavior |
|-----------|----------|
| **Usage over lists** | Generate is the main bridge from words → sentence; disabled until bank has at least one noun and one verb, with a short hint why. |
| **Effort before answer** | Recent sentences: English gloss **off by default**; eye icon reveals it (`aria-expanded`). |
| **Grounded in your data** | Sentence is generated from **all words in the active library** (same rules as model prompt). |
| **Honest AI** | Classifier shows confidence and note; add uses classifier POS when it matches the field (otherwise noun if classification not ready—document in hero). |
| **Ownership** | Libraries, local persistence, snapshots and archive for mistakes. |
| **Name before create** | New library uses an inline name field + Create/Cancel (no anonymous duplicate libraries). |

## Interaction states (what the user sees)

| Surface | Loading | Empty | Error | Success |
|---------|---------|-------|-------|---------|
| Classify | “Checking…” | Placeholder / “Type or…” | Red inline error | Gloss + POS + confidence |
| Word grid | — | “No words in this view…” | — | Cards |
| Generate | Button loading state | — | Error alert | History prepend |
| New library form | — | Empty name field | Inline “enter a name” | New library active |
| Recent sentences | — | “No sentences yet…” | — | Korean + eye for gloss |

## Responsive and accessibility (targets)

- **Keyboard:** Word field Enter vs ⌘/Ctrl+Enter; Escape/Enter on new-library name field; focus management after add; filter **radiogroup** with `aria-checked`.
- **Touch:** Toolbar controls and filters meet ~38px+ vertical targets where possible.
- **Screen readers:** `aria-live` on classify status; toolbar and gloss toggle labels; `aria-invalid` on library name when needed.

## Design system

Implementations follow **`DESIGN.md`** and `src/index.css` tokens (Fluent Sky). No parallel palette without updating `DESIGN.md`.

## Explicitly NOT in this experience plan

- Spaced repetition, quizzes, CEFR levels, or streaks.  
- Listening/speaking drills or romanization as the primary path.  
- Accounts, sync, or shared libraries.  
- Languages other than Korean for the learner path.

## Engineering pointer

Code: `src/App.tsx`, `src/lib/*`, `src/llm/*`, `DESIGN.md`.  
The previous long plan (milestones, autoplan tables, CEO lock-in) is archived as **`PLAN.archive-2026-04-06.md`**.

## Open questions (for `/plan-design-review`)

1. Hero copy: should we **name English learners** explicitly without adding noise?  
2. After a good generation: is **“Generate again”** (same bank) worth a first-class control, or clutter?  
3. When generate is disabled: is the **hint** warm and actionable enough on first visit?  
4. Word cards: should we ever show **“appeared in latest sentence”** to tie grid and history?  
5. Classifier wrong: today there is **no manual POS picker**; is that acceptable v1 or do we need a minimal override?

---

## /autoplan Full Review — 2026-04-12

**Branch:** main | **Commit:** d82330d | **Mode:** SELECTIVE EXPANSION  
**UI scope:** YES | **DX scope:** NO  
**Outside voices:** Claude subagent [subagent-only] (Codex not available)

---

## Phase 1 — CEO Review

### Pre-Review System Audit

**Recent activity (30 days):** 10 commits. Most touched: `src/index.css` (6), `src/App.tsx` (6), `src/lib/storage.ts` (5), `src/lib/generateSentence.ts` (5). App is actively evolving.

**Stash:** Clean. **Uncommitted changes:** README docs update, Terms/Privacy rewrite, CSS font fix (3 files, 185 additions). None affect core logic.

**TODOS cross-reference:**
- P1 (`getLlmClient` abstraction): DONE — `src/llm/getLlmClient.ts` is fully implemented with proxy/BYOK/env support.
- P2 (golden prompt set + fixtures): NOT DONE — `docs/test-plan.md` exists but no vitest config, no test directory, zero test files.
- P3 (CSP + static headers): NOT DONE — no Vercel headers config, no CSP policy.

**TODOs/FIXMEs in code:** `src/llm/getLlmClient.ts` has a comment note; nothing blocking.

**Existing well-designed patterns:** `getLlmClient.ts` (clean single-entry boundary), `appState.ts` (immutable library mutations), Zod schema validation in all LLM response paths.

**Anti-patterns to avoid:** `App.tsx` at 1345 lines doing all state — this monolith pattern should not grow further.

**DESIGN.md:** Exists and is authoritative (Fluent Sky). `src/index.css` aligns.

---

### 0A. Premise Challenge

The CEO subagent identified a **critical split** between PLAN.md (vocab-bank + sentence generation) and TODOS.md + actual code (translation checking / writing lab).

**User confirmed:** Both halves are the product. The real loop is:  
**Add vocab → Generate sentence → Attempt translation → Get AI feedback**

PLAN.md only describes the first two steps. This review will update it to cover the full loop.

**Other premises checked:**
- "Learners want to curate their own word bank" — plausible but creates friction. No import path. HIGH RISK. Deferred to TODOS (D4).
- "Local-only is acceptable for v0" — yes, confirmed by user; solo builder first.
- "English-to-Korean translation drill trains production" — reasonable for v0 vocabulary practice. Not a substitute for authentic input but a defensible v0 mechanic.
- "No ChatGPT differentiation yet" — honest gap. The moat must come from persistent personal vocabulary + session history creating compounding feedback over time. This is the right 12-month bet.

---

### 0B. Existing Code Leverage Map

| Sub-problem | Existing code |
|-------------|---------------|
| Word classification | `src/lib/classifyWord.ts` + `src/schema/wordClassification.ts` |
| Sentence generation (English prompt + Korean reference) | `src/lib/generateSentence.ts` — complete, with diversity + tone + retry |
| Translation checking | `src/lib/checkKoreanTranslation.ts` — complete, with Zod validation + retry |
| Library/word bank management | `src/lib/appState.ts` — immutable ops, snapshot/archive |
| LLM client abstraction | `src/llm/getLlmClient.ts` — proxy/BYOK/env, Anthropic + OpenAI |
| Local persistence | `src/lib/storage.ts` — with v1→v3 migration |
| Session history | `storage.ts::prependHistory` + `App.tsx` state |

Nothing to rebuild. All core logic exists.

---

### 0C. Dream State Delta

```
CURRENT STATE                    THIS PLAN                      12-MONTH IDEAL
────────────────────────────────────────────────────────────────────────────────
Word bank + sentence gen         Add: full loop in PLAN.md,     Persistent vocab across sessions
Translation check (built,        legal pages, README docs.      + streak/habit tracking.
  not in plan)                   Fix: PLAN.md describes the     Sentence quality improving as
                                 full loop end to end.           vocab grows. User can see
Local storage, no accounts.                                     "words used in N sentences."
Session history (in-memory,                                     Export + Anki sync.
  not persisted).                                               Maybe: learner profiles.
```

The delta between "THIS PLAN" and "12-MONTH IDEAL" is mostly features deferred to TODOS. This plan's job is just to make PLAN.md accurate.

---

### 0C-bis. Implementation Alternatives

```
APPROACH A: Update PLAN.md to reflect the integrated loop (current plan)
  Summary: Add translation check to core journey, IA, interaction states, accessibility.
  Effort:  S (CC: ~15 min)
  Risk:    Low
  Pros:    Plan matches code; design review has correct target; no scope creep
  Cons:    None

APPROACH B: Scope the plan as vocabulary tool only, split translation to a separate doc
  Summary: Keep PLAN.md as vocab/generation plan; write PLAN-translation.md separately.
  Effort:  M (CC: ~30 min)
  Risk:    Medium — two documents create drift risk
  Pros:    Simpler documents
  Cons:    Already one app; splitting creates artificial separation

APPROACH C: Full rewrite of PLAN.md as a unified spec
  Summary: Start fresh, include all features, open questions, and the full loop.
  Effort:  M (CC: ~30 min)
  Risk:    Low
  Pros:    Clean, complete
  Cons:    PLAN.archive already exists; unnecessary if we patch cleanly
```

**Auto-decision #1:** Choose Approach A. Minimal diff, boils the lake, no new files. (P3 pragmatic + P5 explicit over clever)

---

### 0D. Mode Selection: SELECTIVE EXPANSION

Hold current scope. Cherry-pick expansions only where they're in the blast radius (files touched by uncommitted changes) and < 1 day CC effort.

---

### 0E. Temporal Interrogation

**Hour 1:** Restore point created. Premise gate confirmed. Plan update started.  
**Hour 3:** Design + Eng review complete. Test plan updated with translation check coverage.  
**Hour 6:** Ship the docs/legal commit. TODOS updated with new deferred items.

---

### 0F. Mode Confirmed: SELECTIVE EXPANSION

---

### CEO Dual Voices — Consensus Table [subagent-only]

```
CEO DUAL VOICES — CONSENSUS TABLE:
═══════════════════════════════════════════════════════════════
  Dimension                           Claude  Codex  Consensus
  ────────────────────────────────── ─────── ─────── ─────────
  1. Premises valid?                   MIXED   N/A    [subagent-only]
  2. Right problem to solve?           YES     N/A    MIXED — core mechanic needs validation
  3. Scope calibration correct?        YES     N/A    CONFIRMED for v0
  4. Alternatives sufficiently explored?NO    N/A    NOT CONFIRMED — import path missing
  5. Competitive/market risks covered? NO     N/A    NOT CONFIRMED — ChatGPT gap noted
  6. 6-month trajectory sound?         YES     N/A    CONFIRMED (compounding vocab moat)
═══════════════════════════════════════════════════════════════
CONFIRMED = both agree. DISAGREE = models differ. Missing voice = N/A.
```

---

### CEO Review Sections 1–10

**Section 1 — Problem Definition**  
Examined: Does the plan state who it's for, what pain it solves, and why now?  
The north star and problem statement are clear (English-speaking Korean learners, usage gap). The integrated loop is the right framing per user. The ChatGPT gap is real but v0 is solo-builder — not yet a competitive product launch. Nothing blocking for v0.  
Finding: No critical gaps for v0. Gap noted for future: plan needs a 12-month success definition. Deferred to TODOS.

**Section 2 — Error & Rescue Registry**

| Error | Trigger | User sees | Tested? |
|-------|---------|-----------|---------|
| Classify fails — no API key | No key set, no proxy | Red inline error in classify hint | No |
| Classify fails — API error | 401/429/network | Red inline error in classify hint | No |
| Classify invalid JSON (repair path) | Bad model output | Silent retry then error | No |
| Generate fails — no noun/verb | Early guard | Button disabled + hint | No |
| Generate fails — API error | 401/429/network | `.alert-error` in generate section | No |
| Generate invalid JSON (repair path) | Bad model output | Error after 2 retries | No |
| Translation check empty input | User clicks check with no text | Thrown error "Enter your Korean…" | No |
| Translation check API error | 401/429/network | Error display in history card | No |
| localStorage quota | Massive word bank | Silent catch in storage.ts | No |
| Library name empty on create | Empty inline name field | Inline "enter a name" error | No |

**Auto-decision #2:** No immediate fixes required to plan. Error paths are coded. Tests needed (see Phase 3). (P6 bias toward action)

**Section 3 — Scope Boundaries**  
NOT in scope for this plan update:
- Anki/Quizlet import (deferred → TODOS D4)
- Spaced repetition (already noted in plan)
- Accounts/sync (already noted)
- 12-month success metrics (deferred → TODOS D5)
- ChatGPT differentiation narrative (deferred → TODOS D5)
- Session history persistence across browser sessions (deferred → TODOS D6)

**Section 4 — Failure Modes Registry**

| Failure Mode | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Vercel proxy rate limit hits Anthropic tier | Medium | Users see errors mid-session | D1 (named errors) partially covers this |
| localStorage wipe loses all vocabulary | Low | High for learner (data loss) | Snapshot/archive exists; export deferred |
| Model returns wrong-language content | Medium | Learner confused | Caveats field in schema handles this |
| App grows beyond 50 words and classification degrades | Low | Low — word bank is context, not input | MAX_WORDS cap exists |
| Translation check references english_gloss vs sentence field incorrectly | Low | Feedback on wrong sentence | Schema separation + `isLegacySentenceResult` handles |

**Section 5 — Dependencies**  
All dependencies (React, Zod, Vite, Anthropic SDK equivalent) are in place. No new dependencies needed for this plan update.

**Section 6 — Rollback Strategy**  
Uncommitted changes are all additive (docs, legal). Git revert is trivially available. No database migrations. No risk.

**Section 7 — Observability**  
Examined: Is there logging, monitoring, or error reporting?  
Result: None beyond browser console. No Vercel analytics. No error telemetry. Acceptable for solo v0. Add before any public sharing.  
**Auto-decision #3:** Defer observability to D7 in TODOS. (P3 pragmatic — solo builder doesn't need Datadog)

**Section 8 — Security**  
Examined: API key handling, proxy, CSP.  
`getLlmClient.ts` correctly gates browser-stored key behind explicit BYOK opt-in. Proxy path is the prod path. TODOS P3 (CSP) is still unimplemented — important before sharing the Vercel URL publicly. No XSS vectors found in the plan description.  
**Auto-decision #4:** CSP stays in TODOS P3. Flag: do not share the public URL broadly until CSP is implemented.

**Section 9 — Performance**  
Examined: Any performance risks in the plan?  
`App.tsx` is 1345 lines with all state co-located. Not a performance problem now, but `practiceById` and `checkById` maps grow unbounded in memory per session. History is in-memory only (good — localStorage would bloat). The translation check makes two API calls (generate + check) in sequence — no parallelism issue.  
**Auto-decision #5:** No plan changes needed. Flag App.tsx monolith for eventual decomposition in TODOS.

**Section 10 — Documentation**  
Examined: Does the plan adequately document the system?  
The plan + DESIGN.md + TODOS.md cover the intent. README is being updated (uncommitted). Legal pages are being rewritten (uncommitted). The gap: PLAN.md doesn't describe the translation check surface at all. This is fixed in the plan update below.

**Section 11 — Design Scope** (UI scope detected)  
Flagged for Phase 2 design review. See below.

---

### CEO Completion Summary

| Dimension | Status | Notes |
|---|---|---|
| Premises validated | YES | Confirmed by user |
| Core loop correct | YES | Generate + check = integrated |
| Code aligned with plan | AFTER UPDATE | Plan update needed |
| Error paths documented | YES | See registry |
| Tests | MISSING | Phase 3 |
| Scope boundaries set | YES | See NOT in scope |
| Deferred items captured | YES | TODOS updates below |

**NOT in scope (CEO decisions):**
- Anki import path
- ChatGPT differentiation copy  
- 12-month success metrics
- Session history persistence
- Observability/monitoring
- CSP (TODOS P3 already)

**What already exists:**
- Full LLM client abstraction (TODOS P1)
- Sentence generation with diversity/tone/retry
- Translation check with Zod validation + retry  
- Library/word bank with snapshot/archive
- v1→v3 storage migration
- Vercel proxy deployment

---

**Phase 1 complete.** Subagent: 5 concerns. No Codex. Consensus: 3/6 confirmed (scope, trajectory, code leverage), 3 not confirmed (premises partially, alternatives, competitive).  
Passing to Phase 2 (Design Review).

---

## Phase 2 — Design Review

**Initial Design Rating: 6/10**  
The plan describes the vocab + generation half well (good IA, interaction states, accessibility notes). The translation check half is absent. A 10 would specify: the full 8-step IA, translation input interaction states, verdict display, and accessibility for the feedback announcement.

**DESIGN.md:** Exists. All design decisions calibrated against Fluent Sky tokens.  
**Existing design patterns to reuse:** `.input-shell`, `.add-btn`, `.generate-btn`, `.history-*` cards, `.alert-error`, `.tag`, `.icon-btn`.

**DESIGN_NOT_AVAILABLE** (gstack designer binary not found — skipping visual mockups, proceeding with text analysis).

---

### Design Litmus Scorecard

```
DESIGN DUAL VOICES — CONSENSUS TABLE [subagent-only]:
═══════════════════════════════════════════════════════════════
  Dimension                           Claude  Codex  Consensus
  ────────────────────────────────── ─────── ─────── ─────────
  1. Information hierarchy clear?      7/10    N/A    PARTIAL
  2. Missing states specified?         5/10    N/A    GAP — translation check missing
  3. User journey complete?            5/10    N/A    GAP — ends at Generate
  4. Design specificity?               8/10    N/A    CONFIRMED
  5. Accessibility specified?          7/10    N/A    PARTIAL
  6. Responsive strategy intentional?  7/10    N/A    CONFIRMED
  7. Trust/empty states designed?      7/10    N/A    PARTIAL
═══════════════════════════════════════════════════════════════
```

---

### Pass 1 — Information Architecture (7/10)

Current IA lists 10 items (1-10). Item 8 "Recent sentences" contains the translation practice surface but it's not broken out. The learner needs to see the translation input as a first-class step, not a buried control inside a history card.

**Finding P2-01 (medium):** IA item 8 should be split:
- 8a. **Recent sentences** (header, clear all, cards)
- 8b. **Translation practice** (inside each card: textarea for Korean attempt, Check button, verdict/feedback)

**Auto-decision #6:** Add 8b to IA in plan update. (P1 completeness)

### Pass 2 — User Journey (5/10)

Core journey table ends at Step 6 (toggle eye). The actual journey has 2 more steps:

**Finding P2-02 (high):** Missing steps 7-8:
- Step 7: Types Korean translation into textarea | Sees character input, placeholder "Write your Korean here…" | "I'm trying it."
- Step 8: Clicks **Check** | Sees verdict (Good match / Close / Needs work) + 2-4 sentence feedback | "I know where I went wrong."

**Auto-decision #7:** Add Steps 7-8 to core journey table. (P1 completeness)

### Pass 3 — Interaction States (5/10)

Translation check surface has no states documented.

**Finding P2-03 (high):** Add to interaction states table:

| Surface | Loading | Empty | Error | Success |
|---------|---------|-------|-------|---------|
| Translation check | "Checking…" button state | Placeholder in textarea | Red inline error | Verdict badge + feedback text |

**Auto-decision #8:** Add translation check row to interaction states table. (P1 completeness)

### Pass 4 — Accessibility (6/10)

**Finding P2-04 (medium):** Translation check feedback is dynamic content and needs `aria-live`. The verdict announcement ("Good match") should be read aloud. The plan should specify:
- Verdict/feedback region: `aria-live="polite"` on the feedback container when check completes
- Check button: `aria-busy="true"` during loading
- Textarea: label attribute or `aria-label="Your Korean translation"`

**Auto-decision #9:** Add accessibility notes for translation check. (P1 completeness)

### Pass 5 — Empty States (7/10)

Examined: "No words in this view…", "No sentences yet…", new library form empty.  
**Finding:** Translation textarea placeholder is not specified. It should be warm and instructive: "Write your Korean here, then click Check."  
**Auto-decision #10:** Add placeholder spec to plan. (P1 completeness)

### Pass 6 — Responsive (7/10)

Examined: Touch targets for toolbar, filters mentioned. Translation check textarea/button targets not mentioned.  
**Finding P2-05 (low):** Check button should meet 38px touch target. Textarea should be at least 3 lines tall on mobile.  
**Auto-decision #11:** Add to responsive targets. (P1 completeness)

### Pass 7 — Design System Alignment (8/10)

Examined: DESIGN.md tokens vs plan description.  
The plan references DESIGN.md correctly. Verdict display: "good" = green adjacent to `--pill-adj` (emerald), "close" = amber adjacent to `--pill-adj-text`, "needs_work" = red (`#dc2626`). These colors exist in the CSS as error/warning tones. Consistent.  
**No issues found.** Examined DESIGN.md colors section and all verdict states map cleanly to existing palette.

---

### Phase 2 Completion Summary

| Dimension | Score | Issues |
|---|---|---|
| Information Architecture | 7→8/10 | IA 8b added |
| User Journey | 5→8/10 | Steps 7-8 added |
| Interaction States | 5→8/10 | Translation check states added |
| Accessibility | 6→7/10 | aria-live, aria-busy, textarea label added |
| Empty States | 7→8/10 | Placeholder copy added |
| Responsive | 7→7/10 | Touch targets noted |
| Design System | 8/10 | Clean |

**Phase 2 complete.** Subagent: 5 findings. Consensus: 4/7 confirmed, 3 improved.  
Passing to Phase 3 (Eng Review).

---

## Phase 3 — Eng Review

### Step 0: Scope Challenge

Blast radius of uncommitted changes: `README.md`, `src/StaticPages.tsx`, `src/index.css` — pure additive, no logic changes. No architecture decisions required for the uncommitted diff itself.

But the plan update (adding translation check to PLAN.md) touches the conceptual architecture of the whole app. Let me map it.

**Complexity check:** Plan update touches 0 new files and introduces 0 new classes. No complexity alarm.

**Existing code leverage:** All features are already built. This eng review is about test coverage gaps and architectural health, not new implementation.

---

### Architecture ASCII Diagram

```
                    ┌─────────────────────────────┐
                    │         App.tsx              │
                    │   (1345 lines, all state)    │
                    │                              │
                    │  ┌─────────┐ ┌────────────┐ │
                    │  │ Library │ │  History   │ │
                    │  │ toolbar │ │  (session) │ │
                    │  └────┬────┘ └─────┬──────┘ │
                    │       │            │        │
                    │  ┌────▼─────┐ ┌────▼──────┐ │
                    │  │Word input│ │Sentence   │ │
                    │  │+ classify│ │cards      │ │
                    │  └────┬─────┘ │(practice  │ │
                    │       │       │ + check)  │ │
                    │  ┌────▼─────┐ └─────┬─────┘ │
                    │  │Word bank │       │       │
                    │  │grid+filt.│  ┌────▼──────┐ │
                    │  └────┬─────┘  │Translation│ │
                    │       │        │check UI   │ │
                    │  ┌────▼─────┐  └───────────┘ │
                    │  │Generate  │               │
                    │  │button    │               │
                    │  └──────────┘               │
                    └─────────────────────────────┘
                              │
                    ┌─────────▼──────────────────┐
                    │      lib/ layer            │
                    │  classifyWord.ts           │
                    │  generateSentence.ts       │
                    │  checkKoreanTranslation.ts │
                    │  appState.ts (immutable)   │
                    │  storage.ts (localStorage) │
                    └─────────┬──────────────────┘
                              │
                    ┌─────────▼──────────────────┐
                    │    llm/ layer              │
                    │  getLlmClient()            │
                    │  ┌──────────────────────┐  │
                    │  │ Proxy path (Vercel)   │  │
                    │  │ BYOK (localStorage)   │  │
                    │  │ Env vars (dev)        │  │
                    │  └──────────────────────┘  │
                    └─────────┬──────────────────┘
                              │
                    ┌─────────▼──────────────────┐
                    │  Anthropic API / OpenAI    │
                    └────────────────────────────┘
```

**Architecture findings:**
1. **[P2] (confidence: 8/10)** `App.tsx` is a 1345-line monolith. All state (`practiceById`, `checkById`, `checkingId`, `historyGlossVisible`, `historyCaveatsVisible`, history, appState, library UI state) lives in one component. This is manageable now but will become painful at ~2000 lines. The correct fix is a `HistoryCard` component with its own local state for practice/check/gloss visibility. **Deferred to TODOS** — not blocking this PR.
2. **[P1] (confidence: 9/10)** `practiceById` and `checkById` are session-only flat maps in App state. If history grows large, the maps grow with it. Since `history` is already cleared on session end (no persistence), this is fine for v0.
3. **No new security attack surface** — the uncommitted changes are static HTML content (legal pages). Checked for XSS: the Terms/Privacy pages render static JSX with no `dangerouslySetInnerHTML`. Clean.

---

### Code Quality Review

**Section 2 findings:**

1. **[P2] (confidence: 7/10) `src/App.tsx:44`** — `recentEnglishPromptsFromHistory` checks `r.korean_reference` to decide what to push, but pushes `r.sentence`. The intent is: push the English sentence (the one the learner was asked to translate). Logic is correct but naming is confusing. Not a bug; low priority.

2. **[P3] (confidence: 8/10) `src/lib/appState.ts:37`** — `snapshotsEqual` uses `JSON.stringify` comparison on sorted copies. Works but is O(n) on every word add. Fine for word banks under 100 items (MAX_WORDS cap ensures this). No action needed.

3. **[P2] (confidence: 9/10)** `src/StaticPages.tsx` (uncommitted) — The new Terms and Privacy pages are well-structured JSX. No issues found. Font stack is now explicit (`var(--font-ui)` added via `src/index.css` — correct). Font size 15→16px and weight 500 are design improvements consistent with `DESIGN.md` hero sub style.

4. **DRY check:** `validateRawModelOutput` in `generateSentence.ts` and `validate` in `checkKoreanTranslation.ts` do the same extract-parse-validate pattern with different schemas. Not worth abstracting yet (two instances). No DRY alarm.

5. **`src/index.css`** (uncommitted) — adds `font-family: var(--font-ui)` to `.static-page` and changes body text. The comment "Same stack as body / DESIGN.md — explicit so legal pages never drift" is exactly right. Good defensive comment.

---

### Test Review — Coverage Diagram

**Test framework:** None configured. No `vitest.config.ts`, no `test/` directory, no test files. Runtime: Node/Vite.

```
CODEPATH COVERAGE DIAGRAM:

src/lib/classifyWord.ts
  classifyKoreanWord(word)
    ├── happy path (valid JSON)                          [→UNIT] ★ MISSING
    ├── invalid JSON → repair path                       [→UNIT] ★ MISSING
    └── abort signal                                     [→UNIT] ★ MISSING

src/lib/generateSentence.ts
  generateSentenceFromVocab(lists, options)
    ├── guard: nouns=0 || verbs=0                        [→UNIT] ★ MISSING
    ├── happy path (valid JSON, with korean_reference)   [→UNIT] ★ MISSING
    ├── invalid JSON → repair path                       [→UNIT] ★ MISSING
    ├── repair path also fails                           [→UNIT] ★ MISSING
    └── missing korean_reference after valid JSON        [→UNIT] ★ MISSING

src/lib/checkKoreanTranslation.ts
  checkKoreanTranslation(params)
    ├── empty userKorean guard                           [→UNIT] ★ MISSING
    ├── happy path (valid JSON, verdict)                 [→UNIT] ★ MISSING
    ├── invalid JSON → repair path                       [→UNIT] ★ MISSING
    └── repair path also fails                           [→UNIT] ★ MISSING

src/llm/getLlmClient.ts
  getLlmClient()
    ├── proxy path (VITE_LLM_PROXY_PATH set)             [→UNIT] ★ MISSING
    ├── BYOK path (byok=true + storedKey)                [→UNIT] ★ MISSING
    ├── env Anthropic key (sk-ant-)                      [→UNIT] ★ MISSING
    ├── env OpenAI key                                   [→UNIT] ★ MISSING
    └── no key → throw                                   [→UNIT] ★ MISSING

src/lib/appState.ts
  addWord()
    ├── adds word, dedupes, creates snapshot             [→UNIT] ★ MISSING
    └── duplicate word silently deduped                  [→UNIT] ★ MISSING
  moveWordToArchive() / restoreFromArchive()             [→UNIT] ★ MISSING
  restoreSnapshot()                                      [→UNIT] ★ MISSING

src/lib/storage.ts
  migrateLegacy (v1→v2→v3)                              [→UNIT] P0 ★ MISSING
  loadAppState / saveAppState roundtrip                  [→UNIT] ★ MISSING
  loadHistory / prependHistory                           [→UNIT] ★ MISSING

USER FLOWS (E2E / Integration):
  Word add flow:
    Type word → debounce classify → Add → card appears   [→E2E] ★ MISSING
  Generate sentence flow:
    ≥1 noun + ≥1 verb → click Generate → card in history [→E2E] ★ MISSING
  Full loop:
    Generate → type Korean → Check → see verdict          [→E2E] ★ MISSING
  Library management:
    Create (named) → add words → rename → delete          [→E2E] ★ MISSING
  Snapshot/restore:
    Modify → auto-snapshot → restore → words back         [→UNIT] ★ MISSING

LLM EVALS:
  generateSentence prompt                                 [→EVAL] ★ MISSING
  checkKoreanTranslation prompt                          [→EVAL] ★ MISSING
```

**REGRESSION RULE:** The uncommitted changes don't modify existing logic — no regression risk.

**Test plan artifact:** Written to `docs/test-plan.md` (updated below).

---

### Performance Review

Examined: Any performance risks?

1. `classifyWord.ts` fires on debounce (420ms). No concern.
2. `generateSentence.ts` makes 1 API call (2 on repair). ~1-3s typical. Acceptable.
3. `checkKoreanTranslation.ts` makes 1 API call (2 on repair). ~1-3s typical. Acceptable.
4. `App.tsx` re-renders: all state is in one component so any state update re-renders the whole tree. For 1345-line component this is slow but not catastrophic — React's diffing keeps it manageable. Not a problem for v0.
5. localStorage read on every App mount: fine, localStorage is synchronous and fast for < 1MB payloads.

**No performance issues in scope of this update.**

---

### Eng Completion Summary

| Dimension | Status | Notes |
|---|---|---|
| Architecture | SOUND for v0 | App.tsx monolith flagged for TODOS |
| Code quality | GOOD | Minor naming issue in recentEnglishPromptsFromHistory |
| Test coverage | CRITICAL GAP | Zero tests written |
| Performance | OK | No blocking issues |
| Security | OK for v0 | CSP needed before public sharing |
| LLM evals | MISSING | Both prompts need eval suites |

**Phase 3 complete.** 2 architectural concerns (monolith, test coverage). Both deferred to TODOS.  
DX scope: skipped (no developer-facing scope in PLAN.md).

---

## Plan Updates Applied

The following updates to PLAN.md are auto-decided (see Decision Audit Trail):

### Core Journey — Steps Added

| Step | User does | User sees | Emotional beat |
|------|-----------|-----------|----------------|
| 7 | Types Korean translation into textarea | Textarea with placeholder "Write your Korean here…"; character input | "I'm trying it." |
| 8 | Clicks **Check** (or ⌘/Ctrl+Enter) | Verdict badge (Good match / Close / Needs work) + 2–4 sentence feedback | "I know where I went wrong." |

*(Existing steps 7 → Library management renumbered to step 9.)*

### Information Architecture — Updated

Item 8 split into:  
**8a. Recent sentences** (clear all; cards with library line, Latest badge, Korean, gated English gloss, caveats).  
**8b. Translation practice** (inside each history card: textarea for Korean attempt, Check/⌘+Enter; verdict badge + feedback; aria-live on feedback region).

### Interaction States — Translation Check Added

| Surface | Loading | Empty | Error | Success |
|---------|---------|-------|-------|---------|
| Translation check | `aria-busy` on Check button, "Checking…" | Textarea placeholder "Write your Korean here…" | Red inline error | Verdict badge + 2–4 sentence feedback |

### Accessibility — Added

- Translation feedback container: `aria-live="polite"` when check completes.
- Check button: `aria-busy="true"` during request.
- Translation textarea: `aria-label="Your Korean translation"`.

### Responsive — Added

- Translation check textarea: minimum 3 lines tall on mobile.
- Check button: meets 38px touch target.

---

## Decision Audit Trail

<!-- AUTONOMOUS DECISION LOG -->

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|----------------|-----------|-----------|---------|
| 1 | CEO | Update PLAN.md (not split into two docs) | Mechanical | P3 pragmatic + P5 explicit | One app, one plan, minimal diff | Approach B (split docs) |
| 2 | CEO | Error paths coded, defer tests to TODOS | Mechanical | P6 bias toward action | Tests needed but not blocking plan update | Immediate test requirement |
| 3 | CEO | Defer observability to TODOS D7 | Mechanical | P3 pragmatic | Solo v0, not a production service yet | Add Vercel analytics now |
| 4 | CEO | CSP stays in TODOS P3, flag before public sharing | Mechanical | P3 pragmatic | TODOS P3 already tracks this | Implement CSP now |
| 5 | CEO | Flag App.tsx monolith for TODOS | Mechanical | P5 explicit over clever | Not blocking v0, no user-visible impact | Refactor now |
| 6 | Design | Add IA item 8b (translation practice surface) | Mechanical | P1 completeness | Feature exists in code, plan was missing it | Keep plan incomplete |
| 7 | Design | Add journey Steps 7-8 | Mechanical | P1 completeness | Core loop confirmed by user | End journey at Generate |
| 8 | Design | Add translation check interaction states | Mechanical | P1 completeness | Feature exists, states unspecified | Leave states table incomplete |
| 9 | Design | Add aria-live/aria-busy/aria-label for check | Mechanical | P1 completeness | Accessibility parity with classify/generate | Defer accessibility |
| 10 | Design | Add textarea placeholder spec | Mechanical | P1 completeness | Empty state is a feature | Generic browser default |
| 11 | Design | Add touch targets for check button/textarea | Mechanical | P1 completeness | Responsive parity with rest of app | Defer mobile |

---

## TODOS Updates (from this review)

The following items should be added to TODOS.md:

**D4 — Vocabulary import path**  
Manual word entry is the only path. Import from Anki/Quizlet CSV would remove the biggest onboarding friction. Effort: M (human) / S (CC+gstack).

**D5 — 12-month success definition + differentiation narrative**  
App needs a stated success metric (e.g., "learner returns 3+ days per week, vocab bank grows by 5+ words per week") and a clear answer to "why not just use ChatGPT." The moat is compounding personal data — make it legible. Effort: S.

**D6 — Session history persistence**  
History is in-memory only. Cleared on page reload. A learner who comes back tomorrow cannot see yesterday's sentences or feedback. localStorage persistence of last ~20 history entries is the minimal fix. Effort: S (human) / S (CC+gstack).

**D7 — Observability**  
No error telemetry, no Vercel analytics. Before sharing publicly, add at minimum: Vercel Web Analytics (zero config), and structured error logging to console in dev mode with full API error detail.

**D8 — App.tsx decomposition**  
`App.tsx` at 1345 lines. Extract `HistoryCard` component with local state for practice/check/gloss visibility. Extract `LibraryToolbar`, `WordInputShell`, `WordBankGrid` as independent components. Effort: M (human) / S (CC+gstack).

**D9 — Test suite (vitest)**  
Zero tests. Vitest + React Testing Library setup needed. Priority: migrate `docs/test-plan.md` coverage map to actual test files. Highest priority: `getLlmClient` path selection, `storage.ts` migration, `appState.ts` word add/dedup. Effort: M (human) / S (CC+gstack).

---

## Cross-Phase Themes

**Theme: Tests — flagged in Phase 1 (Section 2, error paths untested) and Phase 3 (zero test files).** This is a high-confidence signal. The test gap is the single biggest risk to this codebase's long-term health. The existing `docs/test-plan.md` coverage map needs to graduate to actual test files.

No other cross-phase themes. Each phase's remaining concerns were distinct.

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope and strategy | 1 | issues_open | 2 critical, 2 high, 1 medium |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | clean | 5 plan updates applied |
| Eng Review | `/plan-eng-review` | Architecture and tests | 1 | issues_open | 0 tests, monolith flag |
| DX Review | `/plan-devex-review` | Dev onboarding | — | skipped | No DX scope |
| Codex Review | outside voice | Independent challenge | 0 | unavailable | Codex not installed |

**VERDICT:** Plan updated with full loop. 2 open concerns: (1) zero test files, (2) session history not persisted. Both deferred to TODOS. Ready to ship docs/legal commit.
