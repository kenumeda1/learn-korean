# TODOS — language helper

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
