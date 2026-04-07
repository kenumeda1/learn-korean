# Design System — Language Helper (Fluent Sky)

## Product Context

- **What this is:** A single-page React app where Korean learners build a vocabulary bank (with POS and manual override), generate practice sentences, and use LLM-backed flows with local session history.
- **Who it's for:** Korean learners who want structured feedback and vocabulary tools in one calm workspace.
- **Space / industry:** Language learning, AI-assisted practice.
- **Project type:** Web app — **Fluent Sky**: Microsoft Fluent–inspired surfaces (rounded shells, soft elevation, sky-blue accent on a cool gray field).

## Source of Truth

Implementations **must** stay aligned with these files:

- **`src/index.css`** — live `:root` tokens and component classes.
- **`mockups/card-grid-mockup.html`** — static reference for the same token set and early layout (title in mockup files: “Fluent Sky — Card grid mockup”).
- **`index.html`** — Google Font links and `theme-color` for the accent.

If tokens diverge between mockup and `index.css`, **`index.css` wins**.

## Aesthetic Direction

- **Direction:** **Fluent Sky** — airy cool background, white **surface** cards, **sky blue** primary actions, subtle **indigo/violet** tints for part-of-speech differentiation (pills), shallow shadows and hover lift on cards.
- **Decoration level:** Minimal pattern; personality comes from **elevation**, **rounded geometry**, and **pill/chip** color—not from illustration or marketing hero art.
- **Mood:** Friendly-professional studio tool: clear hierarchy, generous tap targets, no harsh chrome.

## Typography

| Role | Stack | Notes |
|------|--------|--------|
| **UI / Latin** | `DM Sans`, system-ui, sans-serif | `var(--font-ui)`. Body default on `body`. |
| **Korean** | `Noto Sans KR`, then `--font-ui` | `var(--font-ko)`. Inputs, word display, history sentences. |
| **Mono (inline)** | `ui-monospace`, SF Mono, Menlo | `.mono` helper only. |

**Loading:** Google Fonts URL in `index.html` (DM Sans + Noto Sans KR weights 400–700).

**Scale (as implemented):**

- Page title `h1`: `clamp(26px, 4vw, 34px)`, weight 700, centered; optional accent span uses `var(--accent)`.
- Section heading `.section-heading`: `clamp(20px, 3vw, 26px)`.
- Eyebrow: 12px, 600, uppercase, letter-spacing `0.06em`.
- Body / hero sub: ~15–16px, line-height ~1.5.
- Word card Korean `.word-ko`: 32px, weight 700.

## Color — CSS variables (`:root`)

These are the **authoritative** Fluent Sky tokens.

| Token | Value | Usage |
|--------|--------|--------|
| `--bg` | `#f4f6f9` | Page background (sky-tinted gray). |
| `--surface` | `#ffffff` | Cards, inputs, chips on filters. |
| `--text` | `#1a1f2e` | Primary text (cool slate). |
| `--muted` | `#6b7287` | Secondary labels, hints. |
| `--border` | `#e8ecf2` | Default borders. |
| `--accent` | `#2563eb` | Primary buttons, links, strong status emphasis. |
| `--accent-soft` | `#dbeafe` | Icon button hover, “latest” badges, focus-adjacent fills. |
| `--pill-noun` / `--pill-noun-text` | `#bfdbfe` / `#1e40af` | Noun POS tag. |
| `--pill-verb` / `--pill-verb-text` | `#ddd6fe` / `#5b21b6` | Verb POS tag. |
| `--pill-adj` / `--pill-adj-text` | `#93c5fd` / `#1d4ed8` | Adjective POS tag. |
| `--progress-empty` | `#e5e7eb` | Progress track empty segments. |
| *(sentence tag)* | bg `#e0e7ff`, text `#3730a3` | `.tag--sentence` in CSS. |

**Shadows**

- `--shadow`: `0 10px 40px -12px rgba(15, 23, 42, 0.12)` — card hover / emphasis.
- `--shadow-card`: `0 4px 24px -6px rgba(15, 23, 42, 0.08)` — resting cards, ghost buttons.

**Common hard-coded pairs in CSS (no variable yet):**

- Input shell focus: border `#c7d2fe`, shadow `rgba(37, 99, 235, 0.15)`.
- Error text / classify error: `#dc2626`; error alert surface `#fef2f2`, text `#b42318`.
- History caveats: `#b45309`.
- Placeholder / soft gray: `#9ca3af` range.
- Progress fill gradient: `#3b82f6` → `#2563eb`.
- `theme-color` in `index.html`: `#2563eb`.

**Dark mode:** Not defined in the stylesheet today. If added later, re-derive surfaces and desaturate accent; re-check POS pill contrast.

## Spacing & density

- **Page** `.page`: max-width **1120px**, horizontal padding **20px** (16px on small screens), vertical **32px** top / **80px** bottom (tighter on mobile).
- **Card grid** `.grid`: `minmax(260px, 1fr)`, gap **20px**.
- **Rhythm:** 8px grid implied (8, 16, 24, 32, 48… used throughout).

## Layout

- **Approach:** Centered **single column** for hero / input / primary actions; **responsive card grid** for the word bank; history as a section below.
- **Max content width:** 1120px shell; key controls often capped at **640px** centered.
- **Border radius scale:**
  - `--radius-lg`: **16px** (cards).
  - `--radius-pill`: **999px** (filters, badges).
  - Input shell / large buttons: **14px**.
  - Tags: **8px**; small icon buttons: **10px**; classify status mini-tag: **10px**.

## Motion

- **Approach:** Light **Fluent** motion: card **hover** `translateY(-2px)` + shadow promotion, **~0.18s ease** (disabled when `prefers-reduced-motion: reduce`).
- **Buttons:** `filter: brightness(1.05)` on hover; active `scale(0.99)` on `.generate-btn`.
- **Transitions:** ~**0.15s** on backgrounds, borders, color for filters and icon buttons.

## Components (naming)

Key classes documented in CSS: `.input-shell`, `.add-btn`, `.generate-btn`, `.filters`, `.card`, `.tag` (+ `--noun` / `--verb` / `--adjective` / `--sentence`), `.icon-btn`, `.progress`, `.alert-error`, `.history-*`, `.settings-details`, `.field-input`.

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-06 | **Fluent Sky** tokens | Implemented in `src/index.css`; mockup `mockups/card-grid-mockup.html`. |
| 2026-04-06 | DESIGN.md remapped from prior consultation doc | Older `DESIGN.md` described teal / paper / Fraunces; **current product UI is Fluent Sky** only. |
| 2026-04-06 | Earlier gstack HTML preview | Optional archive only; not the app source of truth. |
