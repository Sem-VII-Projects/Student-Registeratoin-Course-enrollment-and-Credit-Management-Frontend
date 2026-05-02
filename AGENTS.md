# OpenCode Agent Reference

## Essential Commands
- `npm install` → required (no lockfile committed)
- `npm run dev` → Vite on port 3000 (`strictPort: true`)
- `npm run build` / `npm run preview`
- `npm run lint` → ESLint (TypeScript + React)

## Architecture
- **Entry**: `App.tsx` → `HashRouter` (URLs use `#` fragment)
- **Pages**: `pages/*.tsx` route components
- **API**: `lib/api.ts` with Vite proxies: `/api/v1`→8000 (FastAPI), `/api`, `/v1`→8090 (Spring)
- **i18n**: `react-i18next` — keys must match exactly in `public/locales/{en,my}/translation.json`

## Auth Storage (localStorage)
- `studentData`, `authToken`, `role` (student session)
- `adminAuthToken`, `adminData` (admin session)

## Critical Gotchas
- **No `.env` needed in dev** — proxies work without env vars. `GEMINI_API_KEY` only for AI features.
- **i18n keys are case-sensitive** — mismatches silently show raw keys.
- **`useId()` produces `:`-delimited IDs** — strip colons for HTML id/for attributes.