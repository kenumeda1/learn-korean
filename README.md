# Munjang — Korean Vocabulary & Sentence Practice

A personal web app for English speakers learning Korean. Add words you're studying, let AI classify them, generate real Korean practice sentences from your own vocabulary bank, and check your translations with structured feedback.

**Live app:** [language-helper-tawny.vercel.app](https://language-helper-tawny.vercel.app)  
**Source:** [github.com/kenumeda1/learn-korean](https://github.com/kenumeda1/learn-korean)

---

## What it does

**The problem:** Word lists and flashcards leave a usage gap — you learn what words mean, but not how to use them.

**The solution:** Add Korean words → the app stores them with part-of-speech and English gloss → generate a sentence from your library → try translating it into Korean → get AI feedback on your answer.

---

## Features

- **Word classification** — Type a Korean word and get an AI-powered gloss, part-of-speech, and confidence score
- **Personal word bank** — Cards display Korean, English gloss, and POS tag; filter by Nouns / Verbs / Adjectives
- **Sentence generation** — Builds a real Korean sentence from your library (requires at least one noun + one verb)
- **Translation checking** — Write your Korean translation attempt and get structured AI feedback
- **Study-first design** — English translation is hidden by default; reveal it with the eye toggle when you're ready
- **Sentence tone** — Adjust the register (formal, casual, etc.) of generated sentences
- **Libraries** — Create, rename, and switch between multiple word libraries to organize by topic or lesson
- **Snapshots & archive** — Back up and restore your libraries locally
- **Session history** — Review past sentences and feedback from the current session

---

## Tech stack

- **React 18** + **TypeScript**
- **Vite** for bundling
- **Zod** for schema validation
- **Anthropic Claude** for AI features (word classification, sentence generation, translation feedback)
- Local persistence via `localStorage` — no account required

---

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser — that address only works **on your computer** while the dev server is running; it is not the deployed site. For the hosted app, use the **Live app** link at the top of this README.

### API key setup

AI features (word classification, sentence generation, translation checking) require an API key. There are two ways to provide one:

**Option A — In the browser (BYOK)**  
Open the settings panel in the app and paste your key. It is saved to `localStorage` and never sent to our servers.

**Option B — Environment variable**  
Copy `.env.example` to `.env` and fill in your key:

```bash
cp .env.example .env
```

```env
# Anthropic
VITE_ANTHROPIC_API_KEY=sk-ant-...

# or OpenAI / OpenAI-compatible
VITE_OPENAI_API_KEY=sk-...
```

Keys starting with `sk-ant-` are automatically routed to Anthropic's API. All other keys use the OpenAI-compatible client. You can override this with `VITE_LLM_PROVIDER=anthropic` or `VITE_LLM_PROVIDER=openai`.

**Option C — Proxy (production)**  
Set `VITE_LLM_PROXY_PATH=/api/chat` and implement a same-origin server route. The browser key is ignored when a proxy path is set. This is how the [live app](https://language-helper-tawny.vercel.app) works.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build locally |
| `npm run check` | Run TypeScript type checking only |

---

## Usage

1. Type a Korean word in the input field — it will be automatically classified
2. Press **Add** (or `Cmd/Ctrl + Enter`) to save it to your bank
3. Add at least one noun and one verb
4. Click **Generate sentence** to get a Korean practice sentence
5. Read the Korean, then click the eye icon to reveal the English translation
6. Try translating the sentence yourself and submit it for AI feedback

---

## Privacy

All vocabulary, libraries, and practice history are stored in your browser only — nothing is sent to our servers. AI requests (classification, generation, translation checks) are routed through a server-side proxy to Anthropic's API. See the [Privacy page](https://language-helper-tawny.vercel.app/#/privacy) for full details.

---

## Notes

- Korean learner path only (no other languages in v1)
- Clearing browser data will permanently delete your word banks and history
- AI output may be incorrect — use it as a practice aid, not a certified reference
