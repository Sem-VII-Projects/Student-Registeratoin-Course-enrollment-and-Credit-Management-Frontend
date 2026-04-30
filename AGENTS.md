# Quick Reference — OpenCode Agent Working Notes

## Core Setup
- **Node required** (no lockfile — `npm install` before first run)
- **Dev server**: `npm run dev` → Vite on port 3000 (`strictPort: true`)
- **Build**: `npm run build` / `npm run preview`
- **Lint only**: `npm run lint` (no typecheck/test scripts; uses eslint with typescript-eslint)

## Project Structure
- **Entry point**: React app via `vite.config.ts` — routes managed with `react-router-dom`
- **Pages**: `pages/*.tsx` (EnrollmentBlank, LoginPage, AdminLogin, etc.)
- **Components**: `components/` (shared UI, e.g. CustomSelect)
- **API layer**: `lib/api.ts` is the primary client; proxied in dev via `vite.config.ts`
  - `/api/v1` → FastAPI on 8000
  - `/api` and `/v1` → Spring Boot on 8090
- **i18n**: `react-i18next` with `public/locales/{en,my}/translation.json`
  - Keys are case-sensitive and must match exactly (no fallback to similar keys)
- **Auth storage**: `src/utils/studentStorage.js` (localStorage keys: `studentData`, `authToken`, `role`)

## Dev Server & Environment
- **Port 3000 is fixed** (`strictPort: true` in vite.config)
- **No .env committed** — copy `.env.example`, but dev proxy is preconfigured (API proxies work without env vars)
- **Gemini key**: `GEMINI_API_KEY` in `.env.local` only if using Gemini-backed features
- **Path alias**: `@/` resolves to repo root in TypeScript/Vite

## Testing / Quality
- **Linting**: `eslint .` (TypeScript + React rules; no auto-fix CI in repo)
- **No typecheck/test scripts** defined in package.json — add `tsc --noEmit` or vitest if needed
- Lint errors in existing files are pre-existing; keep changes focused to the task scope

## Common Gotchas
- **i18n key mismatches cause silent fallbacks to raw key strings** — always verify keys exist in `public/locales/en/translation.json` before using `t('...')`
- **`useId()` in React produces `:`-delimited IDs** — strip or replace if IDs are used in HTML `id`/`for` attributes or CSS selectors (CustomSelect strips colons)
- **`any` types and unused vars** are common pre-existing lint errors — suppress or fix only when touching code
- **No Tailwind config committed** — Tailwind classes work but config is implicit/vite-managed

## Local Conventions
- Prefer direct locale strings when a key doesn’t exist (rather than adding incomplete locale entries)
- Use `alert(...)` for user-facing errors in simple flows; structured error handling elsewhere
- Modal/overlay patterns: `animate-in`, `fade-in`, `slide-in-from-*` classes from Tailwind animate
- Form fields typically pair `<label htmlFor>` with explicit `id` (don’t rely on nesting)

## Debugging Tips
- Inspect `localStorage` for `studentData`/`authToken` when auth flows misbehave
- Check browser network for 502s against `/api/` or `/v1/` — backends are external (8000/8090)
- If port 3000 is busy, either free it or change `vite.config.ts` (strictPort will crash otherwise)

## References
- Source of truth for config: `vite.config.ts`, `eslint.config.js`, `package.json`
- i18n source of truth: `public/locales/en/translation.json`
- No CI/commit hooks configured in this repo