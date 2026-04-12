## Deploy Configuration (configured by /setup-deploy)
- Platform: Vercel
- Production URL: https://language-helper-tawny.vercel.app
- Deploy workflow: auto-deploy on push to main
- Deploy status command: vercel ls --prod
- Merge method: merge
- Project type: web app (Vite + React static site)
- Post-deploy health check: https://language-helper-tawny.vercel.app

### Custom deploy hooks
- Pre-merge: npm run build
- Deploy trigger: automatic on push to main
- Deploy status: poll production URL
- Health check: https://language-helper-tawny.vercel.app

## Testing

- Framework: Vitest + jsdom
- Run: `npm test` (single pass) or `npm run test:watch` (watch mode)
- Test files: `src/**/*.test.ts`
- Coverage: see `docs/test-plan.md` for full coverage map
- Run tests before every commit touching `src/lib/` or `src/llm/`

## Design System

Always read `DESIGN.md` before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match `DESIGN.md`.