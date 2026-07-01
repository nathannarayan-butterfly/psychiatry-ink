# CLAUDE.md — Psychiatry.ink / Psychiatrie.ink

Privacy-first clinical writing workspace for psychiatric documentation (DACH-first,
German default). React 19 SPA + Express 5 API, one Cloud Run container. Supabase is
the only cloud datastore. Production clinical tool — data must be real & complete.

## Stack
- Frontend: React 19 + TS, Vite 6, Tailwind v4 + CSS design tokens (`src/styles/*`),
  TipTap editor, Recharts, lucide-react. Custom router (`useAppRouter`), NOT React Router.
- Backend: Express 5 (`server/index.ts`), run with `tsx`. Routes under `/api/*`.
- Data: Supabase (Postgres/Auth/RLS). Migrations in `supabase/migrations/` (append-only,
  timestamped). Credits live in `ai_credit_accounts` (RPC). NOTE: Prisma/SQLite is gone.
- Deploy: `Dockerfile` → Cloud Run (europe-west1, project psychiatry-ink-beta) via
  `cloudbuild.yaml`. VITE_* are inlined at BUILD time; server secrets are runtime-only.

## Commands
- Dev: `npm run dev` (api+web) · `dev:web` · `dev:server` · stop: `npm run dev:stop`
- Build: `npm run build`  ·  Start: `npm run start`
- Typecheck: `npm run typecheck`  ·  Test: `npm run test` / `test:watch`
- No ESLint/Prettier configured — typecheck + vitest are the CI gate.
- DB/KB seed: `npm run db:import-diagnoses`, `db:import-catalogue`, `kb:*`
- Node >=20.11 <23.

## Architecture essentials
- Two-layer PHI protection:
  1. Client vault `src/utils/cryptoVault.ts`: AES-GCM-256 wrapped by RSA-OAEP-2048;
     private key in IndexedDB. Server gets the public key JWK only (tier permitting).
  2. Server de-id `server/services/discussCaseDeidentify.ts` +
     `server/services/safeLlmEgress.ts` (`callLlmSafely`) = SOLE LLM egress path.
- AI flow: `server/ai/runAiFeature.ts` → credit check (fail-closed in prod) →
  `callLlmSafely` (PHI guard) → `callLlm` (`server/services/llmProvider.ts`) →
  atomic credit deduct → usage log (metadata only, no PHI).
- Model tiers (`server/modelTierMapping.ts`): fast=DeepSeek v4-flash,
  standard=Gemini 2.5-flash (env-reroutable), thorough=OpenAI gpt-5.4,
  "Maximum" opt-in=gpt-5.5; EU fallback=Mistral under LLM_RESIDENCY=eu. Mock mode
  when no key set.
- Clinical AI is advisory: Butterfly (deterministic-first ICD criteria, LLM-on-doubt)
  & CMEA never auto-accept or assert a diagnosis — clinician attestation promotes to truth.
- Locale by domain: psychiatry.ink=en, psychiatrie.ink=de (`src/config/domainConfig.ts`),
  decoupled from the authenticated UI-language pin. Translations: de/en/fr/es in
  `src/data/uiTranslations.ts`.

## Do NOT break
1. Never send LLM text outside `callLlmSafely` / `runAiFeature` (audit-tested).
2. Never send patient name/DOB/case-id to the server in cleartext (client vault only).
3. Keep fail-closed: app route w/o auth → /login (prod); PHI residue → block (422);
   prod credit-infra error → refuse call.
4. Butterfly/CMEA stay advisory — no auto-accept, no auto diagnosis, no auto chart writes.
5. No copyrighted ICD/DSM text; original paraphrases only. Ship complete real data —
   no placeholders/TODOs/`...` (`.cursor/rules/complete-data-no-samples.mdc`).
6. Style via design tokens in `src/styles/globals.css` + shared UI primitives; no
   hardcoded colors/fonts. Keep the calm, minimal, single-accent (#8A5A2B) aesthetic.
7. Feature flags stay default-off/opt-out as documented; VITE_* are public — secrets
   server-only, never VITE_-prefixed.
8. Migrations append-only; AI-usage logs must stay PHI-free.

## Key paths
- Shell: `src/App.tsx`, `src/components/CaseWorkspacePage.tsx`, `server/index.ts`
- Editor: `src/components/notion/`  · Clinical: arztbrief/dischargeSummary/diagnosis/
  medication/lab/therapy/discuss-case dirs
- Flags: `src/utils/featureFlags.ts` + `server/utils/featureFlags.ts`
- Docs: `docs/PRODUCT_OVERVIEW.md`, `docs/AI-WORKFLOWS.md`, `docs/DATABASE.md`
