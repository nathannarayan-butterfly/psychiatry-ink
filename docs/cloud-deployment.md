# Psychiatry.Ink — Cloud Deployment Reference (v1)

Operational guide for launching Psychiatry.Ink v1 to a cloud host serving EN+DE
customers with EU clinical data. Covers the backend/infra hardening shipped in
this workstream and the manual steps an operator must still perform.

> Privacy posture is unchanged: all LLM-bound text is de-identified server-side
> (`server/services/safeLlmEgress.ts`); zero-knowledge snapshots remain
> ciphertext-only; this document only changes infrastructure, not data handling.

---

## 1. Topology

**Default — single service (recommended for v1).** One container builds the Vite
client and runs the Express/Prisma API. Express serves `dist/` with SPA history
fallback, so the browser uses **same-origin** `/api/*`. No CORS config needed.

**Split deploy (optional).** Host the frontend separately (CDN/static host) and
run the API on its own origin:

- Build the client with `VITE_API_BASE_URL=https://api.<domain>` (build-time).
- Set `CORS_ALLOWED_ORIGINS=https://app.<domain>` on the API.

---

## 2. Environment variables

See `.env.example` for the annotated, exhaustive list. Cloud-critical values:

| Variable | Purpose | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Pooled Postgres (PgBouncer, **:6543**) for the running API | Must include `?pgbouncer=true` |
| `DIRECT_URL` | Direct Postgres (**:5432**) for migrations | Used only by `prisma migrate deploy` |
| `VITE_API_BASE_URL` | API origin for the browser (split deploy only) | Build-time; unset = same-origin |
| `CORS_ALLOWED_ORIGINS` | Cross-origin browser allowlist | Required for split deploy |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Server-side token validation | anon/publishable only — never service_role |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Browser auth | |
| `SUPABASE_SERVICE_ROLE_KEY` | KB write-through (bypasses RLS) | server-only |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Credit checkout + webhook | |
| `OPENAI_API_KEY` / `DEEPSEEK_API_KEY` / `GOOGLE_API_KEY` / `MISTRAL_API_KEY` | LLM providers (`MISTRAL_API_KEY` = EU residency) | at least one |
| `KB_ADMIN_USER_IDS` | Platform Knowledge Base admin allowlist (sole elevated role over the KB: publish/approve/archive/review). Deprecated alias `SYSTEM_ADMIN_USER_IDS` still read as a fallback | **required in prod**; server-only |
| `CREDIT_ADMIN_USER_IDS` | Manual credit-grant operators | required in prod for `/grant` |
| `LLM_RESIDENCY` / `LLM_BLOCKED_PROVIDERS` | EU residency gating | see §6 |
| `TRUST_PROXY` | Proxy hops to trust (rate limiting, client IP) | default `1` |

### Stripe URLs

- Webhook endpoint: `https://app.<domain>/api/stripe/webhook`
  (subscribe to `checkout.session.completed`).
- Success/cancel URLs are derived from the request origin:
  `…/dashboard/credits?checkout=success|cancelled`. Ensure the browser calls the
  API from the canonical domain so users return there.

### Supabase Auth → URL Configuration

- **Site URL:** `https://app.<domain>`
- **Redirect URLs:** `https://app.<domain>/**` (add every served domain, incl. `www`).

---

## 3. Database migration (manual step)

The schema is now PostgreSQL. A fresh Postgres baseline migration lives at
`prisma/migrations/20260101000000_init_postgres/` (the old SQLite migrations were
removed — they are not Postgres-compatible).

Apply migrations against the **direct** connection:

```bash
# Locally / CI, with DIRECT_URL pointed at the target DB:
npx prisma migrate deploy
```

Or set `RUN_DB_MIGRATIONS=true` to have the container entrypoint run it on boot
(single-instance only — do not race `migrate deploy` across replicas).

If the target Supabase database already contains tables created out-of-band,
baseline instead of applying:

```bash
npx prisma migrate resolve --applied 20260101000000_init_postgres
```

After migrating, seed reference data as needed (`npm run db:import-diagnoses`,
`npm run db:import-catalogue`, KB seeds).

---

## 4. Build & run (Docker)

```bash
# Single-service image
docker build -t psychiatry-ink:v1 .

# Split deploy: bake the API origin into the client bundle
docker build --build-arg VITE_API_BASE_URL=https://api.example.com -t psychiatry-ink:v1 .

docker run -p 3001:3001 --env-file .env.production psychiatry-ink:v1
```

- Health: `GET /api/health` (liveness, cheap) and `GET /api/health/ready`
  (readiness, pings the DB). Wire the readiness probe to your orchestrator.
- The image runs the server via `tsx` (TypeScript at runtime); `node` user, not root.

---

## 5. Robustness & security summary

- **Error handling:** global JSON error handler with a request id (`X-Request-Id`),
  no stack traces leaked. `unhandledRejection`/`uncaughtException` guards.
- **Graceful shutdown:** SIGTERM/SIGINT drain in-flight requests then
  `prisma.$disconnect()`.
- **Headers/CSP:** Helmet with a CSP tuned for the SPA + pdf.js workers.
- **Rate limiting:** global limiter on `/api` + a tighter limiter on AI /
  transcription / credit routes. **Per-instance, in-memory** — add
  `rate-limit-redis` before running >1 instance.
- **Outbound timeouts:** every provider call (LLM, transcription, WHO ICD,
  Stripe, Supabase admin, token validation) is time-bounded; idempotent reads
  retry once; timeouts surface as HTTP 504.
- **Auth:** bearer tokens verified via GoTrue with a short-TTL cache + local
  expiry pre-check; service_role/secret keys are rejected as bearers.
- **Credit integrity:** Stripe idempotency marker + credit grant commit
  atomically in one Serializable transaction (no double-grant on retries).

---

## 6. EU data residency

`LLM_RESIDENCY=eu` (or `LLM_BLOCKED_PROVIDERS=deepseek`) excludes providers
outside the EU-approved set. **DeepSeek processes requests in China** and is the
default for the fast/standard tiers, so EU deployments handling patient-derived
data should set `LLM_RESIDENCY=eu` and configure an OpenAI/Google/Mistral key.
With gating on and no compliant provider configured, AI calls fail closed (HTTP
451) rather than egressing to a disallowed jurisdiction.

**Mistral AI** (`MISTRAL_API_KEY`) is a French/EU provider on the la Plateforme
OpenAI-compatible API (`https://api.mistral.ai/v1`). It is classified as an
EU-residency provider, so it is permitted as-is under `LLM_RESIDENCY=eu` and is
used as a residency-compliant fallback when non-EU providers are blocked.
Defaults: `mistral-small-latest` (fast/standard), `mistral-large-latest`
(thorough); override via `MISTRAL_SMALL_MODEL` / `MISTRAL_LARGE_MODEL`. Users can
also select Mistral explicitly in Settings → KI.

Region privacy tiers (`server/privacyRegions.ts`): DE/AT/CH and the EU default
are `local_only`; only US/GB/AU/CA are `full`.

---

## 6a. Supabase hosting region (EU residency)

The managed Postgres, Auth (GoTrue), and Storage all live in the **project's
single Supabase/AWS region**. That region is fixed at project creation and
**cannot be changed in place** — an EU move means a *new* EU-region project plus
a data migration (see the runbook below).

### Current state (verified)

The live project `dxngbuinxutzirowbjgb` is hosted in **AWS `eu-west-1`
(Europe, Ireland)** — an EU region. Database, Auth, and Storage (bucket
`dc-voice-messages`) are all co-located there, so **no region migration is
required** for EU/GDPR data residency. Storage objects and the S3-protocol
endpoint inherit the project region (`eu-west-1`).

> Residency caveats that are *not* solved by the DB region:
> - **LLMs** still egress to provider regions. DeepSeek processes in China; set
>   `LLM_RESIDENCY=eu` (see §6) so AI fails closed unless an EU-eligible
>   provider (OpenAI/Google EU processing) is configured.
> - **Transcription / WHO ICD / Stripe** are third-party processors — covered by
>   their own DPAs, not by the Supabase region.
> - `eu-west-1` is Ireland. If a contract requires **data in Germany
>   specifically**, migrate to `eu-central-1` (Frankfurt) using the runbook.

### How to verify the region (read-only)

The Supabase project ref does not encode the region and the project-scoped MCP
has no region field, so confirm via either:

1. **Dashboard:** Project Settings → General → *Region*; or Settings → Database
   → connection string host `aws-0-<region>.pooler.supabase.com`.
2. **DNS / AWS IP ranges** (what was used here): resolve
   `db.<ref>.supabase.co`, then match the IP against
   `https://ip-ranges.amazonaws.com/ip-ranges.json`. The live DB IPv6
   (`2a05:d018:…`) falls in AWS prefix `2a05:d018::/35` = `eu-west-1`.

### EU region migration runbook (only if a move is needed)

Region is immutable, so a move = new project + migration + cutover. Treat as a
**maintenance window with brief write downtime**. Owner-only steps are marked
**[OWNER]**; the rest can be scripted/automated.

1. **[OWNER]** Create a new project in the target EU region (e.g.
   `eu-central-1` Frankfurt) in the same org. *(Destructive/irreversible —
   requires explicit owner action; not done by tooling.)*
2. Apply schema to the new project from the source of truth
   `supabase/migrations/*` (`supabase db push` / `prisma migrate deploy`
   against the new `DIRECT_URL`). Re-seed reference data
   (`db:import-diagnoses`, `db:import-catalogue`, KB seeds).
3. Freeze writes on the old project (maintenance mode / scale API to 0) to get a
   consistent snapshot.
4. Migrate data: `pg_dump --data-only` from old → restore into new (exclude
   Supabase-managed schemas you re-create; keep `auth.users`,
   `auth.identities`, `storage.objects` rows aligned with their objects).
5. **[OWNER]** Migrate Auth users incl. password hashes, SSO providers, and
   `auth.identities` (Supabase user migration / `auth.users` copy). Verify MFA
   factors and external identities carry over.
6. Migrate Storage buckets (`dc-voice-messages`): recreate bucket config
   (private, mime/size limits) and copy objects via the S3 API / `supabase
   storage cp`. Re-point any RLS/object ownership.
7. **[OWNER]** Regenerate keys on the new project: anon/publishable, service
   role/secret. Old keys do **not** transfer.
8. Update env vars everywhere (host, CI, `.env.local`): `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, and `DATABASE_URL`/`DIRECT_URL`
   (new `aws-0-<region>.pooler.supabase.com` host + new password).
9. **[OWNER]** Auth → URL Configuration on the new project: set Site URL and
   Redirect URLs (`https://app.psychiatry.ink`, `…/**`, incl. `www`). Re-add
   SSO/SAML/OAuth provider client secrets and callback URLs.
10. **[OWNER]** Stripe: no region coupling, but the webhook secret is
    per-endpoint — if the endpoint URL/instance changes, re-create the webhook
    and update `STRIPE_WEBHOOK_SECRET`. Customer/price IDs are unaffected.
11. Cutover: deploy the app pointed at the new project, smoke-test auth, RLS,
    storage upload/playback, AI, and Stripe checkout + webhook.
12. **Rollback:** keep the old project read-only and un-deleted until the new
    one is validated; rollback = repoint env vars back to the old project. Only
    **[OWNER]** deletes the old project after a successful validation window.

**Downtime:** steps 3–11 incur a short write-freeze (reads can stay up if you
keep the old project live read-only). Plan a low-traffic window.

---

## 7. Notes / known follow-ups (operator)

- **LiveKit:** not used. Voice chat is implemented via async voice messages
  stored in Supabase (see `supabase/migrations/…_discuss_case_voice_messages.sql`).
  No `LIVEKIT_*` env is required; older audit docs mentioning it are historical.
- **Duplicate Supabase migration timestamps:** a few files under
  `supabase/migrations/` share a timestamp prefix (e.g. two `20260616000000_*`,
  two `20260621000000_*`, two `20260622000000_*`). These were **not** renamed:
  if already applied to the live project, renaming changes the recorded version
  and corrupts migration history. Renumber only on a project where they have not
  yet been applied.
- **Rate-limit store:** move to Redis before horizontal scaling.
- **DPA / legal:** sign provider DPAs (OpenAI/Google) and complete the EU DPA /
  records-of-processing — out of scope for this code workstream.
