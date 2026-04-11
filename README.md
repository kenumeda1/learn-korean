# Language Helper — Korean Vocabulary & Sentence Practice

A personal web app for English speakers learning Korean. Add words you're studying, let AI classify them, then generate a real Korean sentence using your own vocabulary bank.

## What it does

**The problem:** Word lists and flashcards leave a usage gap — you learn what words mean, but not how to use them.

**The solution:** Add Korean words → the app stores them with part-of-speech and English gloss → generate a sentence from your library → read Korean first, then reveal the English translation when you're ready.

## Features

- **Word classification** — Type a Korean word and get an AI-powered gloss, part-of-speech, and confidence score
- **Personal word bank** — Cards display Korean, English gloss, and POS tag; filter by Nouns / Verbs / Adjectives
- **Sentence generation** — Builds a real Korean sentence from your library (requires at least one noun + one verb)
- **Study-first design** — English translation is hidden by default; reveal it with the eye toggle when you're ready to check yourself
- **Libraries** — Create, rename, and switch between multiple word libraries to organize by topic or lesson
- **Snapshots & archive** — Back up and restore your libraries locally

## Tech stack

- **React 18** + **TypeScript**
- **Vite** for bundling
- **Zod** for schema validation
- Local persistence (no account required)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build locally |
| `npm run check` | Run TypeScript type checking only |

## Usage

1. Type a Korean word in the input field — it will be automatically classified
2. Press **Add** (or `Cmd/Ctrl + Enter`) to save it to your bank
3. Add at least one noun and one verb
4. Click **Generate sentence** to get a Korean practice sentence
5. Read the Korean, then click the eye icon to reveal the English translation

## Notes

- AI classification and sentence generation require API access (BYOK supported)
- All data is stored locally in your browser — no accounts or sync
- Korean learner path only (no other languages in v1)
