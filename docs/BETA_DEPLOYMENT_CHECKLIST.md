# Psychiatry.Ink — Beta Deployment Checklist

**Audience:** the engineer or operator preparing a Beta deploy.
**Goal:** ship Beta without copying any developer-machine secrets, debug
flags, or admin surfaces. Every item below MUST be checked before tagging
the Beta build.

> **Hard rule — do not deploy or copy `.env.local`.**
> `.env.local` is a developer-machine file. It contains real, live developer
> credentials (OpenAI, DeepSeek, Supabase service role, LiveKit, WHO ICD) and
> dev-only feature flags. Treat `.env.local` as PHI-adjacent: it never leaves
> the developer machine, never enters CI, never enters the Beta deploy image,
> and never gets pasted into a managed-secrets dashboard.
> **Build the Beta image from the Beta env, not `.env.local`.**

> **Hard rule — every LLM-bound prompt MUST go through the server PHI guard.**
> All routes that ultimately call an LLM provider (OpenAI / DeepSeek / Google)
> use the central `callLlmSafely` wrapper from
> `server/services/safeLlmEgress.ts`. The wrapper sanitizes every prompt-bound
> field server-side and asserts no high-confidence PHI residue remains before
> the network call. Client-side pseudonymization is **not sufficient**: a
> clinician can disable it, and the server NEVER trusts a client-asserted
> `deidentifiedText` field — every such field is re-scrubbed authoritatively
> on the server. New routes that wire an LLM call MUST use `callLlmSafely`;
> the egress audit test (`server/__tests__/safeLlmEgressAudit.test.ts`) fails
> the build if a direct provider call slips outside the documented allowlist.

---

## 1. Mint fresh Beta secrets (NEVER reuse dev secrets)

For the Beta environment, generate **new** keys for every secret below. Do
not reuse the values stored in any developer's `.env.local`.

| Secret | Source | Notes |
|--------|--------|-------|
| `OPENAI_API_KEY` | OpenAI dashboard → new project key with prod quota | Dev keys are budget-bound to the dev account; do not reuse. |
| `DEEPSEEK_API_KEY` | DeepSeek dashboard → new key | Same as OpenAI — fresh key only. |
| `SUPABASE_URL` / `VITE_SUPABASE_URL` | Beta Supabase project | NOT the dev Supabase project. |
| `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY` | Beta Supabase project | Browser-safe (RLS-bound). |
| `SUPABASE_SERVICE_ROLE_KEY` | Beta Supabase project, **server-only** | All-RLS-bypass — never ship to the browser, never expose via `VITE_*`. |
| `LIVEKIT_URL` / `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | LiveKit Cloud → new EU-region project | EU region required for residency. |
| `WHO_ICD_CLIENT_ID` / `WHO_ICD_CLIENT_SECRET` | WHO ICD developer portal | Optional — only if KB ingestion runs in Beta. |
| `DEMO_PUBLISHER_EMAIL` | The actual Beta publisher's email | Override — do not ship the project-author default. |

**Rotate immediately** if any of the above were ever exchanged over Slack,
email, screen-share, clipboard from a dev machine, or copied via deploy
scripts that scoop up `.env.local`.

---

## 2. Required environment variables (must be SET on Beta)

```env
NODE_ENV=production

# Public Supabase (browser)
VITE_SUPABASE_URL=https://<beta-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<beta-anon-key>

# Server-only Supabase
SUPABASE_URL=https://<beta-project>.supabase.co
SUPABASE_ANON_KEY=<beta-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<beta-service-role-key>      # NEVER to client

# LLM providers (production budget)
OPENAI_API_KEY=<beta-openai-key>
DEEPSEEK_API_KEY=<beta-deepseek-key>

# LiveKit (EU region)
LIVEKIT_URL=wss://<beta-livekit>.livekit.cloud
LIVEKIT_API_KEY=<beta-livekit-key>
LIVEKIT_API_SECRET=<beta-livekit-secret>

# Demo publisher
DEMO_PUBLISHER_EMAIL=<beta-publisher@your-domain>
```

---

## 3. Required FALSE / UNSET (security gates)

The following flags MUST be **unset or `false`** on every Beta instance.
Defence in depth: the server gates also fail closed when these are unset,
but ship them explicit-false to make the intent visible to operators.

| Variable | Required Beta value | Why |
|----------|--------------------:|-----|
| `VITE_CLINICAL_INTELLIGENCE_DEBUG_MODE` | `false` / unset | Renders raw prompt/response/JSON in the CI panel. Off in prod. |
| `CLINICAL_INTELLIGENCE_DEBUG_MODE` | `false` / unset | Server twin of the above — also fails closed when `NODE_ENV=production`. |
| `KB_ADMIN_API_ENABLED` | `false` / unset | Admin API for KB curation. Keep unset unless a real admin operator is on call. |
| `ENABLE_KB_ADMIN_API` | `false` / unset | Newer alias of the above; same rule. |
| `ENABLE_DEV_AUTH_BYPASS` | `false` / unset | Dev auth shortcut. MUST never be true outside `NODE_ENV=development`. |
| `ENABLE_DOCUMENT_IMPORT_AI` | `false` / unset | AI-assisted document import mapping. Only enable AFTER confirming the server PHI guard is active end-to-end. |
| `VITE_ENABLE_DOCUMENT_IMPORT_AI` | `false` / unset | Browser-side flag that surfaces the import-AI UI; must mirror the server flag. |
| `ENABLE_PSYCHOPATH_EXTRACT_AI` | `false` / unset | Psychopathology structured extraction. Only enable AFTER confirming the server PHI guard is active. |
| `VITE_ENABLE_PSYCHOPATH_EXTRACT_AI` | `false` / unset | Browser-side flag that surfaces the PPB extract UI; must mirror the server flag. |

If KB Admin API is needed in Beta (rare), set `ENABLE_KB_ADMIN_API=true`
**and** appoint an admin operator (`KB_ADMIN_USER_IDS`) before flipping the
flag. Disable again the moment the admin operator stands down.

---

## 4. Use production Supabase keys correctly

- Browser-side (`VITE_*` vars): **anon key only**. The browser must NEVER
  see `SUPABASE_SERVICE_ROLE_KEY`.
- Server-side: anon key for unprivileged reads + service role key for
  admin/RLS-bypass operations. The service role key MUST NOT appear in any
  `VITE_*` var, in any `dist/` bundle, or in any client-visible response.
- Verify with `grep -r "SUPABASE_SERVICE_ROLE_KEY" dist/` after `npm run
  build` — must return zero matches.
- The Beta Supabase project must be DIFFERENT from the dev project.
  Confirm by comparing `VITE_SUPABASE_URL` against the developer machine
  value.

---

## 4.1 Pass the public Supabase config as Docker BUILD ARGS (critical)

Vite **inlines** every `VITE_*` variable into the client bundle at `vite build`
time. The Dockerfile runs `npm run build` in the `builder` stage, so the
`VITE_SUPABASE_*` values MUST be present **as build args at image-build time** —
setting them only as Cloud Run runtime env vars is too late and leaves the
shipped bundle with an unconfigured Supabase client.

The Dockerfile declares these builder-stage `ARG`s:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (or the alias `VITE_SUPABASE_PUBLISHABLE_KEY`)
- `VITE_API_BASE_URL` (optional; same-origin `/api` if empty)

Build the image passing the **public** Supabase URL + anon/publishable key
(never the service role / secret key):

```bash
docker build \
  --build-arg VITE_SUPABASE_URL="https://<beta-project>.supabase.co" \
  --build-arg VITE_SUPABASE_ANON_KEY="<beta-anon-or-publishable-key>" \
  -t <region>-docker.pkg.dev/<project>/<repo>/psychiatry-ink:latest \
  .
```

With Cloud Build, pass the same values via `--substitutions` mapped to
`--build-arg` in the build step, e.g.:

```bash
gcloud builds submit \
  --substitutions=_VITE_SUPABASE_URL="https://<beta-project>.supabase.co",_VITE_SUPABASE_ANON_KEY="<beta-anon-key>" \
  --config=cloudbuild.yaml .
# where the docker build step passes:
#   --build-arg VITE_SUPABASE_URL=$_VITE_SUPABASE_URL
#   --build-arg VITE_SUPABASE_ANON_KEY=$_VITE_SUPABASE_ANON_KEY
```

Defence in depth: even if these args are omitted, the production bundle now
shows the login page (the dev no-auth entry is compile-time disabled in a
`vite build`) — it will NEVER drop a visitor into an authenticated account.
But auth cannot function without them, so a correct deploy must pass them.

> Verify after build: `grep -ro "<beta-project>.supabase.co" dist/` returns
> matches (Supabase config inlined). The dev no-auth entry is compile-time
> disabled — confirm the homepage passes no enter-app handler in prod:
> `grep -o "onEnterApp:void 0" dist/assets/*.js` returns a match (the
> `import.meta.env.DEV` branch was tree-shaken, so the "enter without sign-in"
> button can never render). Note: the German label string itself stays in the
> bundle as inert homepage copy — grepping for it is NOT a valid check.

---

## 5. Pre-deploy verification (run from a clean checkout)

```bash
# 5.1 Type-check both app + server
npm run typecheck

# 5.2 Tests must be green (P0-3 stale tests are fixed in this patch)
npm run test

# 5.3 Build with production env
NODE_ENV=production npm run build

# 5.4 Migration filename validation (Supabase authority)
npm run db:check

# 5.5 Sanity-grep the prod bundle for service-role leakage
grep -r "service_role" dist/ || echo "OK: service role key not in client bundle"
grep -r "SUPABASE_SERVICE_ROLE_KEY" dist/ || echo "OK: service role var name not in client bundle"

# 5.6 Sanity-grep the prod bundle for the debug-panel string —
#     should be tree-shaken when DEV=false.
grep -r "ciDevPanelTitle" dist/ && echo "WARNING: dev panel labels found in bundle"
```

---

## 6. Post-deploy HTTP verification

After the Beta image is live, verify with curl from outside the cluster:

```bash
BASE=https://<beta-host>

# 6.1 KB admin must 404 when disabled (no leaked existence).
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/api/kb-admin/status"
# Expected: 404

curl -s -o /dev/null -w "%{http_code}\n" "$BASE/api/kb-admin/substances"
# Expected: 404

# Note: /api/kb-admin/drugs and /api/kb-admin/preparations both return 401
# (Anmeldung erforderlich) by design — the admin gate runs the auth check
# BEFORE the flag check on those routes. This is expected and correct: the
# routes still do not leak existence (an unauthenticated probe sees the same
# "Anmeldung erforderlich" payload regardless of flag state).

# 6.2 Dev auth bypass must not exist in prod.
#     /api/* requests without an Authorization header must NOT return 200
#     with content from a "dev fallback" user. Spot-check a protected route.
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/api/patients"
# Expected: 401 (or 403). NEVER 200 with dev bypass content.

# 6.3 /api/generate must reject requests without a server-side PHI guard
#     pre-flight. Any request that includes obviously identifying content
#     (DOB, case codes, emails, phone) must come back de-identified
#     before reaching the LLM provider — see P1-1.

# 6.4 LLM endpoints must enforce auth.
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$BASE/api/generate" \
  -H 'content-type: application/json' \
  -d '{"tier":"fast","systemPrompt":"hi","userPrompt":"hi"}'
# Expected: 401 (unauthenticated).
```

---

## 7. Demo-patient verification

Confirm the synthetic demo patient is reachable and isolated:

1. Sign in as a fresh user.
2. Confirm `DEMO-CASE-0001` appears in the dashboard, labelled
   "Synthetischer Demo-Fall" / "Synthetic demo case".
3. Confirm the demo case is read-only (banner present; edits blocked).
4. Confirm reset/seed tooling targets ONLY `DEMO-CASE-0001`. Run
   `npm run dev:clear-patients` MUST NOT be invokable from the deployed
   image (the script has its own `assertDevSafe` guard, but defence in
   depth: do not ship the script's runner in Beta).
5. Confirm the demo patient's birth date / case ID never appears in
   real-patient cases (search the registry for `DEMO-` markers).

---

## 8. Migrations (Supabase authority)

- Apply migrations only via Supabase tooling (CLI / dashboard).
  `prisma migrate deploy` MUST NOT be invoked anywhere in the deploy
  pipeline — see `docs/database-migration-policy.md` §3.
- Run `npm run db:check` to verify timestamp uniqueness before deploy.

### 8.1 AI credit migration (Beta release blocker)

The AI credit system requires the following Prisma migration to be applied
to the API server's SQLite DB **before any LLM traffic is served**:

- `prisma/migrations/20260702000000_ai_credit_system/migration.sql`

This creates `AiCreditAccount`, `AiCreditLedger`, and `AiUsageLog`. If
this migration is **not** applied, `runAiFeature` will fail closed in
production (returns 503, no LLM call is made) — protecting against
unbounded uncharged usage but blocking ALL AI features for users. So
this is BOTH a security gate AND a functional gate for Beta.

- [ ] AI credit migration applied to API DB. Verify by running
      `npx prisma db execute --stdin <<< "SELECT count(*) FROM AiCreditAccount;"`
      against the server DB — it must return 0 (or N) without an error.
- [ ] `/api/ai-credits` returns 200 with a real balance for a test user
      (proves end-to-end credit infra is healthy in production).

---

## 9. Final checklist

- [ ] Fresh Beta secrets minted (§1). Dev secrets NOT reused.
- [ ] `.env.local` NOT copied or rsync'd to the Beta image. Confirmed.
- [ ] Required env vars set (§2).
- [ ] Required-false flags unset / explicit `false` (§3).
- [ ] `VITE_*` vars contain ONLY the public Supabase URL + anon key
      (no service role) (§4).
- [ ] `npm run typecheck` exits 0 (§5.1).
- [ ] `npm run test` exits 0, all tests green (§5.2).
- [ ] `npm run build` exits 0 (§5.3).
- [ ] `npm run db:check` exits 0 (§5.4).
- [ ] Bundle does NOT contain service-role key strings (§5.5).
- [ ] `/api/kb-admin/*` returns 404 (§6.1).
- [ ] Protected `/api/*` returns 401 unauthenticated (§6.2, §6.4).
- [ ] Demo patient reachable, read-only, isolated (§7).
- [ ] Migrations validated, no Prisma deploy in pipeline (§8).
- [ ] AI credit migration applied + `/api/ai-credits` returns 200 (§8.1).

When all boxes are ticked, tag the Beta build and deploy.
