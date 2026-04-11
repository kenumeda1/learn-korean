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

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope and strategy | — | — | See archive if needed |
| Eng Review | `/plan-eng-review` | Architecture and tests | — | — | See archive |
| Design Review | `/plan-design-review` | UI/UX vs this plan | 0 | — | Run review to fill |
| DX Review | `/plan-devex-review` | Dev onboarding | — | — | — |

**VERDICT:** Pending design review against this document.
