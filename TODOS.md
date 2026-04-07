# TODOS — language helper

## Product brief

**Who:** Korean learners who want to practice **real writing** between human tutor sessions (or without leaning on a person every time).

**Status quo:** Most tools stop at **corrections**; the learner still sounds textbook-fine rather than **natural**, and does not get **teacher-shaped explanations** or **register/genre-aware** rewrites.

**Intended change:** A calm, one-screen **writing lab** where topic, genre/register, and the learner’s Korean text produce structured feedback: diagnoses with **why**, one or two **native-like rewrite** options, a small **drill**, plus honest **confidence/caveats**—with **local session history** (~20 entries) so use compounds.

**Goal:** **Learning / solo builder** first (v0 optimizes feedback quality and daily habit, not accounts or revenue). Distribution can stay local or static; a proxy comes later if the app is shared broadly.

## Spec — word input, Enter, and Add

While the word field is focused, typing triggers a debounced check; when a suggestion is ready, the UI shows part of speech (and confidence if we have it) without requiring Enter. **Enter** runs an immediate classify if nothing is shown yet or refreshes the suggestion if the text changed; it does **not** save the word. The user must explicitly choose **noun / adjective / verb** (defaulting to the suggestion but always overridable) and click **Add to list** (or press **⌘Enter** / **Ctrl+Enter** as shortcut for that same action). **Add** clears the field, moves focus back to the input, and appends the word to the visible list under the chosen role. If classification fails or returns low confidence, the same controls stay available and the user can pick the role manually before Add.

## P1 — Provider client abstraction (DEV BYOK + prod proxy)

- **What:** Single module (e.g. `getLlmClient()`) so the UI never branches on “am I in dev?” beyond env flags. DEV: optional browser key in `localStorage` with explicit opt-in. PROD: `fetch` to same-origin `/api/...` proxy.
- **Why:** Matches `/plan-eng-review` decision **1C**. Prevents shipping a one-way door where every component knows key handling.
- **Pros:** Security posture improves for any non-solo use; tests can mock one boundary.
- **Cons:** Small amount of serverless or edge boilerplate for prod.
- **Context:** Greenfield SPA; first commit should establish this seam before UI spreads.
- **Effort:** S (human) / S (CC+gstack)
- **Depends on:** Initial `vite` scaffold + first API route or worker.

## P2 — Golden prompt set + fixtures

- **What:** Directory `eval/prompts/*.md` (or `.txt`) and `eval/fixtures/*.json` with expected top-level schema keys; script or vitest test that validates parser + Zod only (not full LLM) first, then optional live eval toggle.
- **Why:** Design doc success criteria require **10 golden prompts**; prevents prompt drift.
- **Pros:** Catch schema/regression without manual clicking.
- **Cons:** Maintenance of fixtures when schema evolves.
- **Context:** After first working end-to-end path.
- **Effort:** M (human) / S (CC+gstack)

## P3 — Deploy CSP + static headers

- **What:** Document and apply a minimal **Content-Security-Policy** for static hosting (default deny inline if possible; hash only if needed). Ensure API proxy origin allowed.
- **Why:** Even solo BYOK in dev is risky; prod MUST reduce XSS blast radius if you ever paste untrusted content into the page.
- **Pros:** Cheap insurance; standard for static apps.
- **Cons:** Tight CSP can fight sloppy third-party widgets (avoid widgets in v0).
- **Context:** Before sharing a public URL beyond yourself.
- **Effort:** S (human) / S (CC+gstack)

## Deferred — /plan-ceo-review (2026-04-06)

Items explicitly **skipped for v0**; add when shipping beyond solo desktop or when users ask.

### D1 — Named provider errors (401 / 429 / timeout)

- **What:** Map HTTP/status outcomes to **user-visible copy** (no stack traces); mock-based tests for 401, 429, timeout; structured logging in dev.
- **Why:** Generic catch-all makes “what do I do?” opaque; rate limits are common in production.
- **Pros:** Fewer support mysteries; matches PLAN risk on provider outages.
- **Cons:** Must maintain copy as providers evolve.
- **Context:** Skipped in SELECTIVE cherry-pick 3; promoted in **PLAN M4** as optional bundle with error copy pass.
- **Effort:** S (human) / S (CC+gstack)
- **Priority:** P2
- **Depends on:** Stable `getLlmClient` + proxy path (M2).

### D2 — PWA / install

- **What:** Web app manifest, icons, “Add to Home Screen” docs; service worker only if offline shell is worth CSP review.
- **Why:** Habit apps benefit from one-tap access; **defer** until CSP (P3) is understood.
- **Pros:** Better daily use on mobile/tablet.
- **Cons:** CSP + caching footguns; not needed for desktop-only v0.
- **Context:** Cherry-pick skipped; revisit after **P3**.
- **Effort:** S–M (human) / S (CC+gstack)
- **Priority:** P3
- **Depends on:** P3 CSP baseline.

### D3 — Export word bank

- **What:** Export vocab (CSV or plain text, stable column order) from local storage.
- **Why:** Portability and trust; power users expect to own data.
- **Pros:** Reduces lock-in anxiety.
- **Cons:** Small UX + edge cases (encoding, large lists).
- **Context:** Cherry-pick skipped for siloed v0.
- **Effort:** S (human) / S (CC+gstack)
- **Priority:** P3
- **Depends on:** None.
