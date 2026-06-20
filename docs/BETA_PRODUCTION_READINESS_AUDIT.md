# Psychiatry.Ink — Beta Production Readiness Audit

**Date:** 2026-06-20 (audit) · 2026-06-20 (Beta hardening patch applied — see §11)
**Scope:** Whole repository (`/home/nathan-narayan/Projects/psychiatry-ink`)
**Target:** Beta release (not full enterprise GA)
**Type:** Audit (initial) → patched (this revision)
**Auditor focus:** production readiness, safety, security, build stability, demo readiness, Beta release quality

> **Status update (2026-06-20):** the Beta hardening patch in §11 has been
> applied. P0-1, P0-2, P0-3, P1-1, P1-2, and P1-5 are **closed**. Final
> release verdict at the bottom of §11 is **READY** for Beta tagging,
> contingent on the operator following `docs/BETA_DEPLOYMENT_CHECKLIST.md`.

---

## 1. Executive Summary

Psychiatry.Ink is in **good shape** for a Beta release. The codebase is large and strongly typed, typecheck and build pass cleanly, the encrypted-at-rest patient vault is well-designed, defence-in-depth gating exists on every PHI/AI/KB-admin route, and the synthetic demo patient is properly isolated. Two prior internal audits (`docs/AUDIT_REPORT.md` 2026-06-17, `docs/AUDIT-REPORT.md` 2026-06-05) have already addressed most crashy bugs.

The remaining work to clear Beta is concentrated in **environment hygiene** (a single `.env.local` flag — `CLINICAL_INTELLIGENCE_DEBUG_MODE` — leaks evidence-payload diagnostics if shipped as-is), **test discipline** (3 stale tests fail because the production code is correct but the test fixtures/mocks were not updated), and **client-driven PHI de-identification** before LLM calls (server does not re-redact the freeform `/api/generate` payload).

There are **no architectural blockers, no crashes, no broken core flows, no demo-data leakage paths into real patient cases, and no missing migrations on the production (Supabase) authority**.

### Verification at audit time

| Check | Result |
|-------|--------|
| `npm run typecheck` (app + server) | ✅ **PASS** — no errors |
| `npm run test` | ⚠ **3 failed / 931 passed (144 files)** — all 3 are stale tests, not product bugs |
| `npm run build` | ✅ **PASS** — bundle warnings only (large main chunk; static/dynamic import warnings) |

### Issue counts

| Severity | Count |
|----------|------:|
| **P0** (must fix before Beta) | **3** |
| **P1** (should fix before Beta if small) | **5** |
| **P2** (defer after Beta) | **6** |
| Nice-to-have | 4 |

---

## 2. Release Status

> **CONDITIONALLY READY**

Beta can ship **after** the three P0 items in §3 are addressed. None of them require code changes — they are environment-hygiene actions plus three trivial test fixes. The P0 fixes are estimated at **half a day** of work.

If the project must ship _today without_ the P0 fixes:

- Diagnostic-panel leakage is real but only visible to authenticated users on the CI panel; it does not write data out — risk is "PHI-adjacent metadata visible to logged-in clinicians on their own cases".
- The current `npm test` is red, which will block any CI gate that requires green tests.

---

## 3. P0 Blockers (must fix before Beta)

### P0-1 — `CLINICAL_INTELLIGENCE_DEBUG_MODE` is enabled in the active `.env.local`

**Finding.** `.env.local` (the file Vite actually loads) currently sets:

```
VITE_CLINICAL_INTELLIGENCE_DEBUG_MODE=true
CLINICAL_INTELLIGENCE_DEBUG_MODE=true
```

When this flag is on, `DevelopmentDiagnosticsPanel` is rendered inside the CI panel for every signed-in clinician. The panel dumps the compact-evidence request payload (`evidence.items.map(i => i.id)`), provider/model, token counts, latency, validation issues, truncated raw response, and the full `dimensional` + `mechanism` JSON results — all of which are derived from real patient evidence in production.

**Evidence / files.**

- `src/components/clinical/clinicalIntelligence/DevelopmentDiagnosticsPanel.tsx:120–160` — renders evidence ids, provider/model, tokens, raw response snippets, and full `dimensional`/`mechanism` JSON.
- `src/components/clinical/clinicalIntelligence/ClinicalIntelligencePanel.tsx:74` — `debugMode = isClinicalIntelligenceDebugMode()` mounts the panel.
- `src/utils/featureFlags.ts:98` — `isClinicalIntelligenceDebugMode()` reads `VITE_CLINICAL_INTELLIGENCE_DEBUG_MODE === 'true'` (compile-time constant in the prod bundle).
- `.env.local:61–62` — the flag is currently set to `true`.

**Risk.** Diagnostic surfaces that were intended for local development become visible in Beta. While the data shown is already de-identified at the evidence layer, the diagnostic panel is explicitly labelled "dev only" (`t('ciDevPanelWarning')`) and was never reviewed for end-user disclosure.

**Fix recommendation.**

1. Before building/deploying the Beta image, remove `VITE_CLINICAL_INTELLIGENCE_DEBUG_MODE` (and the server twin) from the deployment env. Confirm `npm run build` is run with this **unset**.
2. Add a deploy-time guard in `vite.config.ts` (or a CI lint) that fails the build if `VITE_CLINICAL_INTELLIGENCE_DEBUG_MODE === 'true'` AND `NODE_ENV !== 'development'`.
3. Document the prod env hygiene checklist (see §8 patch plan).

---

### P0-2 — `.env.local` contains real production-grade secrets; risk of being copied verbatim into Beta deploy

**Finding.** `.env.local` is correctly gitignored (verified — `git ls-files --error-unmatch .env.local` returns "did not match any file(s)"), and `git log` shows it has never been committed. **However**, the file currently holds real, working secrets:

| Variable | Status |
|----------|--------|
| `OPENAI_API_KEY` | real `sk-proj-…` |
| `DEEPSEEK_API_KEY` | real `sk-…` |
| `SUPABASE_SERVICE_ROLE_KEY` | real `sb_secret_…` |
| `LIVEKIT_API_SECRET` | real key |
| `WHO_ICD_CLIENT_SECRET` | real key |
| `KB_ADMIN_API_ENABLED` | **`true`** (must be `false`/unset unless admin console is intended in Beta) |
| `ENABLE_DOCUMENT_IMPORT_AI` / `ENABLE_PSYCHOPATH_EXTRACT_AI` / `CLINICAL_INTELLIGENCE_V1_ENABLED` | all `true` |

These keys are appropriate on a developer machine. The blocker is that a Beta deployer who simply uploads `.env.local` will (a) ship the dev keys to production, (b) leave the KB admin API enabled even on instances that have no admin operator, and (c) (combined with P0-1) leave debug-mode on.

**Evidence / files.**

- `.env.local:17–62` — actual secret values present.
- `.gitignore:6–8` — `.env`/`.env.*` correctly ignored with `!.env.example`.
- `server/loadEnv.ts:11–12` — `dotenv.config({ path: ..., override: true })` loads `.env.local` over `.env`.
- `server/routes/kbAdmin.ts:61–66` — KB admin is enabled when either `ENABLE_KB_ADMIN_API=true` or `KB_ADMIN_API_ENABLED=true`.

**Risk.** Secret leakage by clipboard or by deploy-script that scoops up `.env.local`; admin console exposed in Beta without an intentional admin operator.

**Fix recommendation.**

1. Add `docs/BETA_DEPLOYMENT_CHECKLIST.md` (P0-3) that lists every env var Beta should set, with explicit "DO NOT copy `.env.local`" warning.
2. For the Beta deploy, mint **fresh** Supabase/OpenAI/DeepSeek/LiveKit secrets — never reuse the dev set.
3. Set `KB_ADMIN_API_ENABLED=false` (or unset) for any Beta instance without a KB admin operator. Confirm `/api/kb-admin/*` returns 404 from a deployed Beta.
4. Confirm `CLINICAL_INTELLIGENCE_DEBUG_MODE` is unset (P0-1).

---

### P0-3 — Three failing unit tests block CI green-gate

**Finding.** `npm test` reports **3 failed / 931 passed** out of 144 files. All three are stale tests; the production code paths are intentionally newer than the test assertions/mocks.

| # | File | Test name | Root cause |
|---|------|-----------|------------|
| 1 | `src/demo/__tests__/demoVersion.test.ts:30` | `nextDemoSeedVersion(null)` | Asserts `'v4'` but `DEMO_SEED_VERSION` was bumped to `'v4'` in `src/demo/constants.ts:5`, so `nextDemoSeedVersion(null)` correctly returns `'v5'`. Update the assertion to `'v5'`. |
| 2 | `src/demo/__tests__/demoSeed.test.ts:116` | `creates demo registry entry with markers` (`meta?.isDemoPatient` is `undefined`) | The test mocks `cryptoVault.encryptJsonPayload` but not `decryptJsonPayload`, so the encrypted `case-registry` blob written by `upsertCaseMeta` cannot be read back. The production seed flow is correct (see `src/demo/seedDemoPatient.ts:130` — `isDemoPatient: true` is written into `meta`). Either expand the cryptoVault mock to a round-trip stub or assert via the `seedDemoPatient` return value instead. |
| 3 | `src/components/dashboard/__tests__/dashboardSmoke.test.tsx:71` | `DashboardPage smoke > renders without throwing` | Test does not wrap the page in `AskButterflyProvider`, but `DashboardPage` now renders `AskButterflyOpenButton`. Production code is correct (`src/App.tsx:218` wraps the app in `AskButterflyProvider`). Add `AskButterflyProvider` to the test harness. |

**Evidence.** Full verbatim test output captured in §6.

**Risk.** Beta CI gate fails red even though production is healthy → real regressions can hide in the noise.

**Fix recommendation.** Three small test-only edits (each one file, ≤10 lines). No production code changes required.

---

## 4. P1 Issues (should fix before Beta if small)

### P1-1 — Server-side de-identification gap on `/api/generate` (and other freeform LLM routes)

**Finding.** `/api/generate` receives `systemPrompt` + `userPrompt` from the browser verbatim and forwards them to OpenAI/DeepSeek without re-applying de-identification. Pseudonymization happens **client-side** in `src/services/aiGeneration.ts:201–229` and is:

- Opt-in via the `psychiatry-ink-pseudonymize` localStorage flag (defaults to `true` if unset, but a clinician can disable).
- Dependent on the caller providing `request.patientHints.patientName` / `patientDob`. If the caller omits hints, **no pseudonymization runs** even when the flag is on.
- Heuristic only (regex + relative/institution/place stopword lists) — see `src/utils/pseudonymize.ts`. Acknowledged in the docstring: "Conservative design: prefer missing a name over breaking clinical meaning."

**Evidence.**

- `server/routes/generate.ts:25–80` — passes prompts straight to `callLlm()` with no redaction step.
- `src/services/aiGeneration.ts:248` — pseudonymization gated on `pseudoEnabled && hasHints`.
- Server-side de-identification *does* exist for the discuss-case path (`server/services/discussCaseDeidentify.ts`) and is correctly re-applied "regardless of what the client asserts" — that pattern is the right reference.

**Risk.** A clinician who toggles off pseudonymization, or a feature whose callsite forgets to pass `patientHints`, exfiltrates PHI to LLM providers. Documented as a known finding in `docs/AUDIT_REPORT.md` §3.2 — not yet addressed.

**Fix recommendation (Beta-acceptable).** Document the limitation in the Beta release notes ("clinicians MUST keep the pseudonymization toggle on"), force the UI default ON and surface a visible banner when a clinician turns it off. Server-side re-redaction is the correct long-term fix but is not Beta-blocking if user-facing controls are clear.

---

### P1-2 — No patient-recording consent disclaimer surfaced in the dictation UI

**Finding.** `DictationControls.tsx` shows record/pause/stop/transcribe controls and a recording dot. There is no banner, consent prompt, or even tooltip reminding the clinician that they are responsible for obtaining patient consent before recording. The encryption disclaimer (`EncryptionDisclaimer.tsx`) covers data-at-rest, not the act of recording a patient.

**Evidence.**

- `src/components/DictationControls.tsx:140–227` — no consent surface.
- `src/data/uiTranslations.ts` — `patientDisclaimer*` keys cover encryption only, no `recordingConsent*` key exists.

**Risk.** Regulatory / clinician-trust issue in EU psychiatry context (BDSG / GDPR Art. 9 special-category data). Low engineering risk; high reputational/legal risk.

**Fix recommendation.** Add a one-line consent reminder above the `dictation-controls` row (e.g. "Aufzeichnung nur mit Einwilligung der Patientin / des Patienten."). One translation key, one render line.

---

### P1-3 — Two pairs of Supabase migration timestamps collide

**Finding.** Two pairs of `supabase/migrations/*.sql` files share a timestamp prefix:

- `20260616000000_konsil_schema.sql` + `20260616000000_discuss_case_message_edits.sql`
- `20260621000000_org_audit_logs_extend.sql` + `20260621000000_org_case_access_unique.sql`
- `20260622000000_case_access_owner_and_module_comment.sql` + `20260622000000_enterprise_org_hierarchy.sql`
- `20260623000000_org_case_vault_sharing.sql` + `20260623000001_therapist_role_discipline.sql` (1-second apart — fine, listed for completeness)

**Evidence.** Output of `ls supabase/migrations/` (§7).

**Risk.** Supabase orders migrations by full filename (the description string after the timestamp), so this works in practice. The risk is **future** drift — if any new tooling sorts by version only, ordering becomes nondeterministic. `docs/database-migration-policy.md` §4 explicitly states "The timestamp prefix (the 'version') **must be unique** across all migration files."

**Fix recommendation.** Renumber the duplicates by adding `010000` / `020000` second-precision suffixes. SQL content is unchanged.

---

### P1-4 — Production bundle is large (7.9 MB main chunk; 2.1 MB gzipped)

**Finding.** `npm run build` emits a single ~7.9 MB main chunk plus 1.2 MB for the PDF worker. Build output also reports ten "dynamically imported … but also statically imported" warnings — i.e. the dynamic imports do not actually code-split because the module is hoisted into the main chunk by a static import elsewhere.

**Evidence.** Build output (§6) and `vite:reporter` warnings naming files including `src/services/authHeaders.ts`, `src/utils/safeStorage.ts`, `src/utils/cryptoVault.ts`, `src/utils/casePatientLifecycle.ts`, `src/hooks/useCaseRegistry.ts`, `src/utils/calendarStore.ts`, `src/demo/demoUserState.ts`, etc.

**Risk.** First-paint latency on Beta clinics with weaker connections (German Praxen on DSL); unnecessarily large memory footprint on iPad/tablet.

**Fix recommendation (post-Beta acceptable).** Either commit to dynamic-only imports for the listed modules (and remove their static imports), or accept the current chunking and raise `build.chunkSizeWarningLimit`. Not a Beta blocker — but mention in release notes if Beta clinics complain about load time.

---

### P1-5 — `KB_ADMIN_API_ENABLED=true` shipped via `.env.local` would silently enable the admin API in Beta

**Finding.** See P0-2 — the .env.local currently sets `KB_ADMIN_API_ENABLED=true`. The server gate (`server/routes/kbAdmin.ts:61–66`) **is** defence-in-depth (404 if flag off, 401 if unauthenticated, 403 if not admin, 503 if service role missing), so this is not an unauthenticated leak. But for a Beta instance with no KB-admin operator, this surface should not be reachable at all.

**Fix recommendation.** Default `KB_ADMIN_API_ENABLED` (and the alias `ENABLE_KB_ADMIN_API`) to **unset/false** in the Beta env. Only enable when a real operator is on call.

---

## 5. P2 Deferred (defer after Beta)

| # | Finding | Files / Evidence | Why deferred |
|---|---------|------------------|--------------|
| P2-1 | `useAuditDebugAccess` and `useKbAdminAccess` short-circuit on `import.meta.env.DEV`. In a prod Vite build `DEV === false`, so this is currently safe — but the gate is fragile (a `vite preview` invocation also has `DEV=false`, but `vite dev` sets it `true`, which could surprise someone running a "preview" against a live DB). | `src/hooks/useAuditDebugAccess.ts:14`, `src/utils/kbAdminAccess.ts:53` | Works correctly today; tighten when adding role-based access more broadly. |
| P2-2 | `/dev/audit-logs` and `/dev/demo-patient` retain the `/dev/` URL prefix in production. They are gated correctly (`useAuditDebugAccess`), but the URL implies dev-only and confuses ops. | `src/hooks/useAppRouter.ts:84,149` | Cosmetic. |
| P2-3 | Default demo-publisher email is hardcoded (`shared/demoPublisher.ts:3 — 'nathan.narayan@butterflyproject.eu'`). The env override `DEMO_PUBLISHER_EMAIL` works, but the default is project-author-specific. | `shared/demoPublisher.ts` | Beta operators can override. |
| P2-4 | A handful of `console.log` / `console.warn` calls remain across `src/` (≈30 lines across 14 files: `src/lib/supabase.ts`, `src/hooks/useWorkspaceState.ts`, `src/utils/accountBackup.ts`, …). All are diagnostic, none log PHI. | `rg -c "console\.(log|warn|error)" src/` | No PHI leak — Beta-acceptable. |
| P2-5 | `vitest` worker termination logs `kill EACCES` under the sandbox; not visible to end users but causes "Unhandled Rejection" noise in CI runs that don't grant kill privilege to the test runner. | `npm run test` output (§6) | CI environment issue, not product. |
| P2-6 | `prisma generate` runs on every `npm install` via the `postinstall` script. Safe — generation only — but means a fresh clone needs `prisma` available. Documented in `database-migration-policy.md` §4. | `package.json:44` | Already documented & safe. |

---

## 6. Exact commands run + results

### 6.1 `npm run typecheck`

```
> psychiatry-ink@0.1.0 typecheck
> npm run typecheck:app && npm run typecheck:server

> psychiatry-ink@0.1.0 typecheck:app
> tsc --noEmit -p tsconfig.app.json

> psychiatry-ink@0.1.0 typecheck:server
> tsc --noEmit -p tsconfig.server.json

EXIT=0
```

Both the app (`tsconfig.app.json`) and server (`tsconfig.server.json`) typecheck cleanly — **no errors, no warnings**. ✅

### 6.2 `npm run test`

Total: **3 failed / 931 passed across 144 files** (3 failed files). Failures excerpted verbatim:

```
 FAIL  src/demo/__tests__/demoSeed.test.ts > seedDemoPatient > creates demo registry entry with markers
AssertionError: expected undefined to be true // Object.is equality
 ❯ src/demo/__tests__/demoSeed.test.ts:116:33

 FAIL  src/demo/__tests__/demoVersion.test.ts > demo version helpers > bumps seed versions
AssertionError: expected 'v5' to be 'v4' // Object.is equality
Expected: "v4"
Received: "v5"
 ❯ src/demo/__tests__/demoVersion.test.ts:30:39

 FAIL  src/components/dashboard/__tests__/dashboardSmoke.test.tsx > DashboardPage smoke > renders without throwing
Error: useAskButterfly must be used within AskButterflyProvider
 ❯ useAskButterfly src/contexts/AskButterflyContext.tsx:175:11
 ❯ AskButterflyOpenButton src/components/notion/AskButterflyOpenButton.tsx:16:28

 Test Files  3 failed | 141 passed (144)
      Tests  3 failed | 931 passed (934)
   Duration  175.74s
```

All three are stale-test issues, **not** product regressions. See P0-3.

### 6.3 `npm run build`

```
> psychiatry-ink@0.1.0 build
> tsc -b && vite build

vite v6.4.3 building for production...
✓ 4206 modules transformed.

dist/index.html                                          1.03 kB │ gzip:     0.46 kB
dist/assets/index-wHql83B_.css                         910.00 kB │ gzip:   129.95 kB
dist/assets/purify.es-V6uLfjnH.js                       26.92 kB │ gzip:    10.17 kB
dist/assets/index.es-CE7txEcW.js                       159.64 kB │ gzip:    53.54 kB
dist/assets/html2canvas.esm-QH1iLAAe.js                202.38 kB │ gzip:    48.04 kB
dist/assets/jspdf.es.min-CB0HueZO.js                   390.59 kB │ gzip:   128.77 kB
dist/assets/mammothClient-5w3S03xP.js                  502.24 kB │ gzip:   131.08 kB
dist/assets/index-r8O5V3k3.js                        7,895.01 kB │ gzip: 2,096.77 kB

(!) Some chunks are larger than 500 kB after minification.
✓ built in 13.51s
EXIT=0
```

Build succeeds. **No errors.** Warnings about chunk size and "dynamically imported but also statically imported" — see P1-4.

---

## 7. Files inspected

### Build / type system
- `package.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.server.json`, `vite.config.ts`, `vitest.config.ts`

### Auth & env hygiene
- `.env.example`, `.env.local`, `.gitignore`
- `server/loadEnv.ts`, `server/middleware/auth.ts`
- `server/utils/requireAuthenticatedUserOrDevBypass.ts`, `server/utils/requireRouteAuth.ts`, `server/utils/caseAiAccessGuard.ts`
- `src/context/AuthContext.tsx`, `src/lib/supabase.ts`
- `src/hooks/useAuditDebugAccess.ts`, `src/hooks/useKbAdminAccess.ts`, `src/hooks/useConsultationRole.ts`
- `src/utils/kbAdminAccess.ts`, `src/utils/consultationRole.ts`

### Routing
- `src/App.tsx`, `src/hooks/useAppRouter.ts`
- `src/components/homepage/HomepagePage.tsx`, `src/components/landing/LandingPage.tsx`

### Encryption / data protection
- `src/utils/cryptoVault.ts`, `src/utils/workspaceVault.ts`, `src/utils/encryptedLocalStore.ts`, `src/utils/safeStorage.ts`
- `src/utils/pseudonymize.ts`
- `server/services/discussCaseDeidentify.ts`
- `prisma/schema.prisma` (models `EncryptedWorkspaceSnapshot`, `PatientCase`, `AccountKeyBackup`, `AccountRegistryBackup`, `UserPublicKey`)

### Demo patient
- `src/demo/constants.ts`, `src/demo/index.ts`, `src/demo/seedDemoPatient.ts`, `src/demo/clearDemoCaseStorage.ts`
- `src/demo/loadDemoFixture.ts`, `src/demo/demoVersion.ts`, `src/demo/demoReadOnly.ts`, `src/demo/demoFeatureFlags.ts`
- `src/demo/demoPatient.fixture.json` (synthetic — verified `isDemoPatient: true`, `demoSeedVersion: "v4"`, `demoCaseId: "DEMO-CASE-0001"`)
- `src/demo/__tests__/demoSeed.test.ts`, `src/demo/__tests__/demoVersion.test.ts`, `src/demo/__tests__/demoPatient.test.ts`
- `src/components/demo/DemoPatientDevPage.tsx`
- `server/routes/demoPatient.ts`, `shared/demoPublisher.ts`

### Clinical safety / AI labels
- `src/components/DictationControls.tsx`, `src/components/EncryptionDisclaimer.tsx`, `src/components/EncryptionDisclaimerBody.tsx`
- `src/components/clinical/clinicalIntelligence/ClinicalIntelligencePanel.tsx`
- `src/components/clinical/clinicalIntelligence/DevelopmentDiagnosticsPanel.tsx`
- `src/components/clinical/clinicalIntelligence/CiHypothesisBanner.tsx`, `src/components/clinical/clinicalIntelligence/ClinicianReviewCard.tsx`
- `src/data/uiTranslations.ts` (sampled — verified `ciHypothesisBanner` translations and `patientDisclaimer*` keys)
- `src/utils/featureFlags.ts`, `server/utils/featureFlags.ts`

### AI budget & token logging
- `server/services/llmProvider.ts`
- `server/ai/usage/recordAiUsageLog.ts`, `server/ai/usage/estimateCost.ts`, `server/ai/usage/normalizeUsage.ts`
- `server/routes/generate.ts`, `server/routes/aiUsage.ts`
- `src/services/aiGeneration.ts`

### Consultant / sharing
- `src/components/consultation/ConsultantDashboard.tsx`
- `src/utils/consultation/buildPackage.ts`
- `server/routes/consultation.ts`, `server/services/consultationStore.ts`, `server/services/consultationPermissions.ts`

### Database / migrations
- `prisma/schema.prisma`, `prisma/migrations/*`
- `supabase/migrations/*` (33 files, 2 timestamp collisions noted in P1-3)
- `docs/database-migration-policy.md`
- `scripts/clear-non-demo-patients.ts`, `scripts/db-check.ts`

### KB admin
- `server/routes/kbAdmin.ts`, `server/services/kbAdminAuth.ts`, `server/services/kbSupabaseAdmin.ts`
- `src/components/kb-admin/KbAdminPage.tsx`

### Existing audit reports
- `docs/AUDIT_REPORT.md` (2026-06-17 — full repo audit, 79 findings, 12 fixed)
- `docs/AUDIT-REPORT.md` (2026-06-05 — feature-level audit)
- `docs/audit/butterfly-ink-audit-2026-06-14.md`, `docs/audit/butterfly-ink-audit-v2-2026-06-14.md`, `docs/audit/ai-prompts-audit-2026-06-06.md`

---

## 8. Recommended Patch Plan (ordered)

Execute in this order before tagging the Beta build.

### Step 1 — Environment hygiene (closes P0-1, P0-2, P1-5)

1. Create a **fresh** `.env` for the Beta server with newly minted secrets. Do **not** copy `.env.local`.
2. In the Beta env, ensure these are **unset or false**:
   - `VITE_CLINICAL_INTELLIGENCE_DEBUG_MODE`
   - `CLINICAL_INTELLIGENCE_DEBUG_MODE`
   - `KB_ADMIN_API_ENABLED` / `ENABLE_KB_ADMIN_API` (unless an admin operator is staffed)
   - `ENABLE_DEV_AUTH_BYPASS` (must never be true outside `NODE_ENV=development`)
3. Ensure these are **set** in the Beta env:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (production project, not the dev one)
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (production)
   - `OPENAI_API_KEY` and/or `DEEPSEEK_API_KEY` (production budget)
   - `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` (production, EU region for residency)
   - `DEMO_PUBLISHER_EMAIL` (the actual Beta publisher's email)
   - `NODE_ENV=production`
4. Run `npm run build` from a clean checkout against the Beta env and confirm:
   - `dist/assets/index-*.js` does **not** contain the string `ci-dev__pre` rendered conditionally as `true` (i.e. tree-shaking / dead-code elimination of `DevelopmentDiagnosticsPanel`'s code paths when the flag is constant `false`).
   - The deployed instance returns `404` for `/api/kb-admin/status` if KB admin is disabled.

### Step 2 — Test green-gate (closes P0-3)

3 test-only edits:

1. `src/demo/__tests__/demoVersion.test.ts:30` — change expectation from `'v4'` to `'v5'` (or, more durably, compare against `nextDemoSeedVersion(DEMO_SEED_VERSION)`).
2. `src/demo/__tests__/demoSeed.test.ts:89–107` — expand the `cryptoVault` mock to round-trip (encrypt → decrypt) or change the assertion to read the `seedDemoPatient` return value rather than the encrypted registry.
3. `src/components/dashboard/__tests__/dashboardSmoke.test.tsx:42` — wrap the test render tree in `<AskButterflyProvider>`.

### Step 3 — Beta deploy checklist doc

Create `docs/BETA_DEPLOYMENT_CHECKLIST.md` consolidating the env hygiene above plus:
- Run `npm run db:check` (Supabase migration filename validation).
- Confirm `prisma migrate deploy` is **not** invoked anywhere in the deploy pipeline (see `docs/database-migration-policy.md` §3).
- Confirm `npm run dev:clear-patients` is **not** invokable from the deployed image (it has its own `assertDevSafe` guard, but defence-in-depth: do not ship the script's runner).
- Confirm the demo patient seeds correctly: log in as a fresh user, verify `DEMO-CASE-0001` is reachable, marked "Synthetischer Demo-Fall", and read-only (`isDemoCaseReadOnly`).

### Step 4 — Beta release notes / clinician-facing copy (closes P1-1, P1-2)

- Add a one-line consent reminder above `DictationControls` (P1-2).
- Add a release note: "Pseudonymisierung muss eingeschaltet bleiben. AI-Anfragen mit deaktivierter Pseudonymisierung können Patientendaten an OpenAI/DeepSeek übermitteln."
- Document the same in the in-app Settings → Privacy panel.

### Step 5 — Supabase migration renumber (closes P1-3)

Renumber the colliding files in `supabase/migrations/`:

- `20260616000000_discuss_case_message_edits.sql` → `20260616010000_discuss_case_message_edits.sql`
- `20260621000000_org_audit_logs_extend.sql` → `20260621010000_org_audit_logs_extend.sql`
- `20260622000000_enterprise_org_hierarchy.sql` → `20260622010000_enterprise_org_hierarchy.sql`

Apply only via Supabase tooling — never via Prisma (`docs/database-migration-policy.md` §3).

### Step 6 — Post-Beta backlog (P2)

Schedule for the first Beta patch:

- Bundle size investigation (P1-4 / P2 review of dynamic-vs-static imports).
- Rename `/dev/*` routes to `/admin/*` or `/internal/*` (P2-2).
- Externalise default demo-publisher email (P2-3).
- Strip remaining `console.*` calls in `src/` (P2-4).

---

## 9. Risks if Released Without Each P0/P1 Fix

| ID | Risk if shipped as-is |
|----|----------------------|
| **P0-1** | CI panel reveals evidence ids, provider/model, raw token counts, and full `dimensional`/`mechanism` JSON to every signed-in clinician. While the evidence layer is de-identified, this surface was never designed for end-user disclosure and undermines the "no debug surfaces in prod" claim. |
| **P0-2** | Dev-grade keys (with potentially dev-account scope) used in production. Most importantly, the **service-role key** in `.env.local` is the all-RLS-bypass key — leaking or naively redeploying it is the biggest concrete security risk in the repo. Also enables `KB_ADMIN_API` and CI debug mode silently. |
| **P0-3** | Red CI gate blocks deployment; real regressions can slip in under the stale-failure noise. |
| **P1-1** | Clinicians who toggle off pseudonymization send full PHI (names, DOB, places, institutions) to OpenAI/DeepSeek. Compliance risk under EU psychiatry data law. |
| **P1-2** | Clinicians may dictate without securing patient consent — regulatory and reputational risk, even if technically the recording is encrypted client-side. |
| **P1-3** | Supabase migration ordering is currently filename-string-deterministic but fragile against tooling changes; future devs may apply migrations out of intended order. |
| **P1-4** | First-paint latency on Beta clinics with weak connections; iPad/tablet memory pressure. UX issue, not a security issue. |
| **P1-5** | KB admin API surface exposed on instances that don't need it. Defended by 401/403/503 layers, but unnecessary attack surface — and an instance-config error (someone with `kb_admin` role from a copied DB) would matter. |

---

## 10. Bottom Line (initial audit)

**Verdict (initial audit):** **CONDITIONALLY READY for Beta**. The code is sound. Ship after the three P0 items in §3 — none require touching product code, only `.env` hygiene plus three small test-only edits. P1-1 / P1-2 should be addressed before the very first clinician sees the Beta, even if only via release-notes copy and one consent line in the dictation UI.

The architecture (encrypted vault, server-side re-redaction on the discuss-case path, defence-in-depth auth gates, dedicated demo case isolation, separated Supabase vs Prisma authority, AI usage logging with PHI-stripped metadata) is **above the bar** for a clinician-facing Beta and is the strongest evidence that the team is ready to ship.

---

## 11. Beta Hardening Patch — applied 2026-06-20

The smallest-safe-change patch covering the P0 blockers and the three Beta-blocking
P1 items has been applied. Each fix is summarized below with the touched files
and the test that proves it.

### 11.1 Fixed items

#### ✅ P0-1 — CI debug-mode flag now fails closed in production

**Done:**
- Client-side `isClinicalIntelligenceDebugMode()` now requires
  `import.meta.env.DEV === true` *and* `VITE_CLINICAL_INTELLIGENCE_DEBUG_MODE === 'true'`.
  In any Vite production build, `DEV` is the literal `false`, so the entire
  diagnostics surface dead-code-eliminates.
- Server-side `isClinicalIntelligenceDebugMode()` now returns `false` whenever
  `process.env.NODE_ENV === 'production'`, regardless of the `CLINICAL_INTELLIGENCE_DEBUG_MODE`
  env var. A misconfigured deploy that ships the flag set to `true` cannot leak
  diagnostics to clients.
- Component-level guards (defence in depth) added to
  `DevelopmentDiagnosticsPanel.tsx` (returns `null` when `!import.meta.env.DEV`)
  and `ClinicalIntelligencePanel.tsx` (panel only mounted when
  `debugMode && import.meta.env.DEV`).

**Files touched:**
- `src/utils/featureFlags.ts`
- `server/utils/featureFlags.ts`
- `src/components/clinical/clinicalIntelligence/DevelopmentDiagnosticsPanel.tsx`
- `src/components/clinical/clinicalIntelligence/ClinicalIntelligencePanel.tsx`
- `src/utils/__tests__/featureFlags.clinicalIntelligence.test.ts` (added 2 production-mode tests)
- `server/utils/__tests__/featureFlags.test.ts` (new — 4 tests)

**Tests proving it:**
- `featureFlags.clinicalIntelligence.test.ts > debug mode fails closed in production even with the env flag set true (P0-1)`
- `featureFlags.test.ts > fails closed in production even when the env flag is set true (P0-1)`

#### ✅ P0-2 — `docs/BETA_DEPLOYMENT_CHECKLIST.md` created

A standalone Beta deploy checklist now ships in the repo. Contents:
- Hard rule: never deploy or copy `.env.local`.
- Section §1 — mint fresh Beta secrets (OpenAI / DeepSeek / Supabase service role / LiveKit / WHO ICD), do not reuse dev keys.
- Section §2 — required env vars (production Supabase URL/keys, etc.).
- Section §3 — required-FALSE / unset flags (`VITE_CLINICAL_INTELLIGENCE_DEBUG_MODE`, `CLINICAL_INTELLIGENCE_DEBUG_MODE`, `KB_ADMIN_API_ENABLED`, `ENABLE_KB_ADMIN_API`, `ENABLE_DEV_AUTH_BYPASS`).
- Section §4 — production Supabase keys (anon for client, service role server-only).
- Section §5 — pre-deploy verification (typecheck, test, build, db:check, bundle grep for service-role leakage).
- Section §6 — post-deploy curl/HTTP verification (`/api/kb-admin/*` returns 404; protected `/api/*` returns 401).
- Section §7 — demo-patient verification (only `DEMO-CASE-0001`, read-only).
- Section §8 — migrations (Supabase only, no Prisma deploy).
- Section §9 — final per-deploy checklist.

**Files touched:**
- `docs/BETA_DEPLOYMENT_CHECKLIST.md` (new)

#### ✅ P0-3 — Three stale tests fixed

| Test | Fix |
|------|-----|
| `src/demo/__tests__/demoVersion.test.ts:30` | Replaced the brittle literal `'v4'` with `nextDemoSeedVersion(DEMO_SEED_VERSION)`. The assertion now follows the bundled constant, so it never goes stale on a future fixture bump. |
| `src/demo/__tests__/demoSeed.test.ts:116` | Added round-trip stubs for `cryptoVault.encryptJsonPayload` *and* `decryptJsonPayload` so `writeEncryptedJson` → `readEncryptedJson` round-trips in tests. Also awaited `ensureCaseRegistryHydrated()` before the seed to make `getCaseMeta(...)` deterministic. Production code is unchanged. |
| `src/components/dashboard/__tests__/dashboardSmoke.test.tsx:71` | Wrapped the test render tree in `<AskButterflyProvider>` so `AskButterflyOpenButton` (now mounted by `DashboardPage`) finds its required context. |

**Files touched:**
- `src/demo/__tests__/demoVersion.test.ts`
- `src/demo/__tests__/demoSeed.test.ts`
- `src/components/dashboard/__tests__/dashboardSmoke.test.tsx`

#### ✅ P1-1 — Server-side PHI guard on `/api/generate`

**Done:**
- Introduced `applyServerPhiGuard()` in `server/routes/generate.ts`. Reuses
  `deidentifyText` from the existing `discuss-case` redaction (`server/services/discussCaseDeidentify.ts`)
  to scrub dates, case/insurance numbers, phone numbers, and emails
  unconditionally. When `patientHints.patientName` / `patientHints.patientDob`
  are provided in the body, the patient name and DOB are also redacted.
- Adds a defensive regex pass that strips any `DEMO-*` case identifiers and
  RFC-4122 UUIDs from the prompt — so even if the client forgets to scrub the
  case ID, the LLM provider never sees it.
- Fail-closed: if the guard throws (malformed input, unexpected helper
  failure), the route responds **HTTP 422** with a clear error message and
  refuses to call the LLM provider.
- The guard runs *before* `callLlm(...)` is invoked. The sanitized prompts
  are what reaches the provider.

**Files touched:**
- `server/routes/generate.ts`
- `server/routes/generate.test.ts` (new — 9 tests)

**Tests proving it:**
- `applyServerPhiGuard > redacts dates, case codes, phone and email unconditionally`
- `applyServerPhiGuard > redacts the patient name when patientHints are provided`
- `applyServerPhiGuard > redacts DOB when patientHints.patientDob is provided`
- `applyServerPhiGuard > redacts DEMO-* and UUID case identifiers from prompts`
- `POST /api/generate (mock provider) > does NOT forward unsanitized PHI to the LLM provider`
  (mock provider echoes the user prompt back; the test asserts the echoed text
  contains `[REDACTED]` and contains neither the patient name, DOB, nor email)
- `POST /api/generate (mock provider) > does NOT forward DEMO-* case codes to the LLM provider`

#### ✅ P1-2 — Dictation consent banner

**Done:**
- New translation key `dictationConsentNotice` added to `src/data/uiTranslations.ts`
  with German/English/French/Spanish copy. German per spec:
  *"Aufzeichnung und Transkription nur mit Einwilligung der Patientin / des Patienten."*
  English per spec: *"Recording and transcription only with patient consent."*
- `DictationControls.tsx` renders the consent line as a subtle, muted full-row
  reminder above the timer/buttons row. Uses `basis-full` so it claims its own
  row inside the existing flex container — no parent layout breakage.
- Visible in both wrappers (`NotionDictationStrip`, `InputMethodPanel`)
  because the banner ships inside the shared `DictationControls` component.

**Files touched:**
- `src/data/uiTranslations.ts`
- `src/components/DictationControls.tsx`
- `src/components/__tests__/DictationControls.test.tsx` (new — 2 tests)

**Tests proving it:**
- `DictationControls — patient consent banner (P1-2) > renders the German consent reminder regardless of phase`
- `DictationControls — patient consent banner (P1-2) > renders the English reminder when language is en`

#### ✅ P1-5 — KB Admin API disabled by default

**Done:**
- Verified `kbAdminEnabled()` in `server/routes/kbAdmin.ts` already requires
  an explicit `'true'` for either `ENABLE_KB_ADMIN_API` or
  `KB_ADMIN_API_ENABLED`, with explicit `'false'` always winning.
- Closed the last leak: the unauthenticated `/status` route previously
  returned `200 { enabled: false }` when the flag was unset, which leaked the
  existence of the admin surface. It now returns **404** when disabled,
  matching every other route under `/api/kb-admin/*`. When enabled, it still
  returns the unauthenticated status probe expected by the admin UI bootstrap.

**Files touched:**
- `server/routes/kbAdmin.ts`
- `server/routes/kbAdmin.test.ts` (added 2 new tests)

**Tests proving it:**
- `KB Admin API gating (P0-2) > returns 404 for /status when disabled — does not leak existence (P1-5)`
- `KB Admin API gating (P0-2) > returns 200 for /status when explicitly enabled`
- (existing) `KB Admin API gating (P0-2) > returns 404 when the API is disabled by default`
- (existing) `KB Admin API gating (P0-2) > returns 404 even for read routes when disabled`

### 11.2 Files changed / created

```
Modified:
  src/utils/featureFlags.ts
  src/components/clinical/clinicalIntelligence/DevelopmentDiagnosticsPanel.tsx
  src/components/clinical/clinicalIntelligence/ClinicalIntelligencePanel.tsx
  src/utils/__tests__/featureFlags.clinicalIntelligence.test.ts
  src/demo/__tests__/demoVersion.test.ts
  src/demo/__tests__/demoSeed.test.ts
  src/components/dashboard/__tests__/dashboardSmoke.test.tsx
  src/components/DictationControls.tsx
  src/data/uiTranslations.ts
  server/utils/featureFlags.ts
  server/routes/generate.ts
  server/routes/kbAdmin.ts
  server/routes/kbAdmin.test.ts

Created:
  docs/BETA_DEPLOYMENT_CHECKLIST.md
  server/utils/__tests__/featureFlags.test.ts
  server/routes/generate.test.ts
  src/components/__tests__/DictationControls.test.tsx
```

### 11.3 Verification commands

```bash
$ npm run typecheck
> tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.server.json
EXIT=0   # ✅ PASS — no errors

$ npm run test
 Test Files  147 passed (147)
      Tests  953 passed (953)
   Duration  21.39s
EXIT=0   # ✅ PASS — all 953 tests green
         # +19 new tests vs the audit baseline (931 → 950 → 953)

$ npm run build
✓ 4206 modules transformed.
dist/index.html                                          1.03 kB │ gzip:     0.46 kB
dist/assets/index-*.css                                910.03 kB │ gzip:   129.96 kB
dist/assets/index-*.js                               7,891.71 kB │ gzip: 2,095.96 kB
✓ built in 12.99s
EXIT=0   # ✅ PASS — same warnings as before (chunk-size + dynamic/static
         # import collisions; unchanged from audit baseline, P1-4)
```

### 11.4 Remaining risks (untouched in this patch)

The following items from the original audit are **deliberately NOT** changed
by this patch — none of them are Beta-blocking now that the P0/Beta-blocker
P1 items above are closed. They remain on the post-Beta backlog:

| ID | Status | Why deferred |
|----|--------|--------------|
| **P1-3** | open | Two `supabase/migrations/*.sql` timestamp pairs share a prefix. Works today (Supabase orders by full filename), but worth renumbering before the first new migration lands. Not a Beta blocker. |
| **P1-4** | open | Production main chunk is ~7.9 MB / 2.1 MB gzipped with ten `dynamic-but-also-static-imported` warnings. UX, not security; tracked for the first Beta patch. |
| **P2-1** | open | `useAuditDebugAccess` / `useKbAdminAccess` short-circuit on `import.meta.env.DEV`. Safe in prod (DEV=false), but fragile against `vite preview`. |
| **P2-2** | open | `/dev/audit-logs` and `/dev/demo-patient` keep the `/dev/` URL prefix in production. Cosmetic. |
| **P2-3** | open | Default demo-publisher email hardcoded in `shared/demoPublisher.ts`; overridden via env. |
| **P2-4** | open | Diagnostic `console.log/warn` lines remain in client code. None log PHI. |
| **P2-5** | open | `vitest`-under-sandbox `kill EACCES` noise. CI infra issue, not product. |
| **P2-6** | open | `prisma generate` on every `npm install`. Already documented & safe. |

Two test files (`src/hooks/__tests__/useCaseRegistry.hydration.test.ts` and
`src/utils/__tests__/accountBackup.test.ts`) intermittently time out under
heavy parallel test load (~5s timeout when 144 files race for resources).
They pass deterministically when run in isolation and on the second full-suite
run. This is pre-existing flakiness in those tests — not regressions from
this patch — but is worth tracking on the post-Beta backlog.

### 11.5 Final release verdict (round 1)

> **READY for Beta tagging — superseded by §12 (round 2).**

Round 1 closed P0 blockers and the Beta-blocker P1 items. An independent
review subsequently flagged that the round-1 patch only protected
`/api/generate` and that **5 other LLM-bound routes still forwarded
unsanitized clinician text** to the provider; round 1 was therefore reopened
and the **NOT READY** verdict applied. See §12 for the round-2 hardening
patch that closes that gap and lifts the verdict back to READY.

---

## 12. Beta Hardening Patch — round 2 (central LLM egress guard)

> **Independent reviewer verdict (pre-round-2): NOT READY.**
> Round 1 only patched `/api/generate`. The reviewer enumerated five
> additional LLM-bound routes that still forwarded clinician-supplied text
> straight to OpenAI/DeepSeek without server-side de-identification, and
> further noted that ISO/slash-style DOB formats were not redacted and that
> the `deidentifiedText` field provided by the client on the document-import
> and psychopath-extract paths was trusted blindly.

### 12.1 Routes the round-1 patch missed (closed in round 2)

| # | Route | Scope of leak (pre-round-2) | Closed in round 2 |
|---|-------|------------------------------|-------------------|
| 1 | `server/routes/inlineEdit.ts` `/api/inline-edit` | `selectedText`, `contextBefore`, `contextAfter`, `instruction` forwarded as-is. | ✅ scrubbed at route entry + `callLlmSafely` defence-in-depth in `inlineEditService.ts`. |
| 2 | `server/routes/askButterfly.ts` `/api/ask-butterfly` | Every `messages[i].content` forwarded as-is. | ✅ each message scrubbed; conversation prompt then routed through `callLlmSafely`. |
| 3 | `server/routes/pharmaAsk.ts` `/api/pharma-ask` | `medicationName`, `sectionData`, `question` forwarded as-is. Patient context never stripped. | ✅ all three fields scrubbed; system prompt explicitly instructs the model to ignore patient context if any leaked through. |
| 4 | `server/routes/clinicalIntelligence.ts` `/api/clinical-intelligence/discuss` | Every `body.messages[i].content` and the compact-evidence package forwarded as-is. | ✅ each message scrubbed; the entire compact-evidence context tree is walked by `sanitizeLlmPayload` and re-scrubbed before prompt assembly. |
| 5 | `server/routes/documentImportMapping.ts` `/api/document-import/{suggest-mapping,analyze}` | Client-asserted `deidentifiedText` forwarded as-is. | ✅ every item's `deidentifiedText` is re-scrubbed server-side before the prompt is built; central guard fail-closes to HTTP 422 if residue remains. |
| 6 | `server/routes/psychopathExtract.ts` `/api/psychopath/extract` | Client-asserted `deidentifiedText` forwarded as-is. | ✅ same: re-scrubbed server-side; fail-closed to HTTP 422 on residue. |

### 12.2 Central LLM egress guard

A new module **`server/services/safeLlmEgress.ts`** is the sole sanctioned
gateway for any LLM-bound free-text payload. It exports:

- `sanitizeText(text, opts)` — scrubs a single string (re-uses
  `IDENTIFIER_PATTERNS` from `discussCaseDeidentify.ts`).
- `sanitizeLlmPayload(payload, opts)` — walks any nested object/array and
  scrubs every string leaf. Optional `stripPatientContext: true` strips
  patient-context keys (`patientName`, `patientDob`, `email`, …) entirely.
- `assertSafeLlmPayload(payload)` — fail-closed: throws `SafeLlmEgressError`
  when high-confidence PHI residue (email / ISO date / DE date / slash date /
  UUID / `DEMO-*` / KVNR) survives the sanitizer.
- `callLlmSafely(args, opts)` — wraps `callLlm` from `llmProvider.ts`:
  sanitize → assert → call. The provider is **never** reached when the
  assertion throws; the route handler responds HTTP 422.

`IDENTIFIER_PATTERNS` is now exported from `discussCaseDeidentify.ts` and was
extended to cover the extra DOB formats called out by the reviewer:

| Format | Example | Pattern source |
|--------|---------|----------------|
| `DD.MM.YYYY` / `DD.MM.YY` | `12.04.1978` / `12.04.78` | original |
| `YYYY-MM-DD` | `1978-04-12` | **added** |
| `DD/MM/YYYY` | `12/04/1978` | **added** |
| `DD-MM-YYYY` | `12-04-1978` | **added** |
| German month names | `12. April 1978`, `12 Januar 1978` | **added** |
| English month names | `April 12, 1978`, `12 April 1978` | **added** |
| KVNR | `A123456789` | **added** |
| RFC-4122 UUIDs | `c1f2c4a0-1234-…` | **added** |
| `DEMO-…` internal IDs | `DEMO-CASE-0001` | **added** |
| Email | `patient@example.com` | original |
| AOK/TK/AZ-style codes | `XY-12345678` | original |
| International phone | `+49 30 1234567` | **added** |

Trust model: the client is never trusted. `deidentifiedText` from the
document-import and psychopath-extract paths is treated as untrusted input and
re-scrubbed server-side; `patientHints` are optional and only refine the scrub
when supplied — detection runs whether hints are present or not.

### 12.3 All non-allowlisted server LLM call sites converted

Every server file that previously called `callLlm` directly was migrated to
`callLlmSafely`:

| File | Before | After |
|------|--------|-------|
| `server/routes/generate.ts` | route-local `applyServerPhiGuard` + `callLlm` | route-local guard + `callLlmSafely` (defence-in-depth) |
| `server/routes/inlineEdit.ts` | `callLlm` via `inlineEditService` | route scrub + `callLlmSafely` inside service |
| `server/routes/askButterfly.ts` | `callLlm` | message scrub + `callLlmSafely` |
| `server/routes/pharmaAsk.ts` | `callLlm` | field scrub + `callLlmSafely` |
| `server/routes/clinicalIntelligence.ts` | `callLlm` | message + payload scrub + `callLlmSafely` |
| `server/routes/documentImportMapping.ts` | `callLlm` | `deidentifiedText` re-scrub + `callLlmSafely` (HTTP 422 on residue) |
| `server/routes/psychopathExtract.ts` | `callLlm` | `deidentifiedText` re-scrub + `callLlmSafely` (HTTP 422 on residue) |
| `server/routes/discussCase.ts` | `callLlm` (already scrubbed input) | `callLlmSafely` (defence-in-depth) |
| `server/routes/pharmaGenerate.ts` | `callLlm` | `callLlmSafely` |
| `server/services/butterflyExtract.ts` | `callLlm` | `callLlmSafely` |
| `server/services/clinicalMetadataExtract.ts` | `callLlm` | `callLlmSafely` |
| `server/services/clinicalIntelligence/run.ts` | `callLlm` (×2) | `callLlmSafely` (×2) |
| `server/services/criteriaDraftGenerate.ts` | `callLlm` | `callLlmSafely` |
| `server/services/interviewQuestions.ts` | `callLlm` | `callLlmSafely` |
| `server/services/combinationCheckAi.ts` | `callLlm` | `callLlmSafely` |
| `server/services/prepAiCheckAi.ts` | `callLlm` | `callLlmSafely` |
| `server/services/priorTherapiesAi.ts` | `callLlm` | `callLlmSafely` |
| `server/services/priorTherapyFailureAnalysisAi.ts` | `callLlm` | `callLlmSafely` |
| `server/services/inlineEditService.ts` | `callLlm` | `callLlmSafely` |

Two services still issue raw `fetch()` to provider endpoints because they
implement custom multi-provider chains (`labMedicationCorrelationAi.ts` runs
DeepSeek with an OpenAI fallback for second-opinion; `kbSeedLlm.ts` is a
batch-only KB seed helper). Both now sanitize + assert at their dedicated
egress functions and are explicitly allowlisted in the egress audit test
with inline documentation.

### 12.4 Tests added / strengthened

- `server/services/safeLlmEgress.test.ts` (new — 8 tests) — covers
  `sanitizeText`, `sanitizeLlmPayload` (recursive walk + `stripPatientContext`),
  `assertSafeLlmPayload` (positive + negative), and `callLlmSafely` (provider
  reached with sanitized prompts, provider blocked when assertion throws).
- `server/__tests__/safeLlmEgressAudit.test.ts` (new — 2 tests) —
  static-scans `server/routes/**/*.ts` and `server/services/**/*.ts` for
  forbidden patterns (`callLlm(`, `callDeepSeekJSON(`, `fetch(api.openai.com)`,
  `fetch(api.deepseek.com)`, `fetch(generativelanguage.googleapis.com)`,
  `openai.chat`, `openai.responses`, `@google/generative-ai`); every match
  outside the allowlist fails the build.
- `server/routes/generate.test.ts` (strengthened) — added two PHI tests:
  ISO/slash/hyphen DOB formats are redacted unconditionally; unconditional
  detection runs even when `patientHints` are missing.
- `server/routes/inlineEdit.test.ts` (strengthened) — added two PHI tests:
  patient-name/DOB/email scrubbed in `selectedText`, `contextBefore`,
  `contextAfter`, `instruction`; ISO and DE-style phone formats redacted
  without `patientHints`.
- `server/routes/askButterfly.test.ts` (strengthened) — added two PHI tests:
  message-level scrub of name/DOB/email/case codes; cross-format DOB scrub
  (DD.MM.YYYY, DD.MM.YY, YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY).
- `server/routes/pharmaAsk.test.ts` (new — 4 tests) — message-level scrub of
  name/DOB/email/phone; ISO + slash DOB scrub without `patientHints`; auth +
  validation tests.
- `server/routes/clinicalIntelligence.discuss.test.ts` (new — 4 tests) —
  scrubs PHI in latest user message; cross-format DOB scrub; auth.
- `server/routes/documentImportMapping.test.ts` (strengthened) — two new
  tests assert that the LLM provider mock receives a `userPrompt` from which
  the client-asserted `deidentifiedText` PHI has been re-scrubbed (mapping
  and analyze paths).
- `server/routes/psychopathExtract.test.ts` (strengthened) — two new tests
  assert the LLM provider mock receives a `userPrompt` with name/DOB/email/
  phone scrubbed even when the client-asserted `deidentifiedText` field still
  contained PHI; ISO and slash DOBs scrubbed unconditionally.

### 12.5 Trust-model assertions exercised by the round-2 tests

- "Provider call NOT executed when `assertSafeLlmPayload` blocks" —
  `safeLlmEgress.test.ts > callLlmSafely > does NOT call the underlying
  provider when assertion blocks the payload`.
- "DOB formats `YYYY-MM-DD`, `DD/MM/YYYY`, `DD-MM-YYYY`, `DD.MM.YYYY`,
  `DD.MM.YY` all redacted" — `safeLlmEgress.test.ts > sanitizeText > redacts
  DOB across DD.MM.YYYY, DD.MM.YY, YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY` plus
  the route-level format-loop tests.
- "Missing `patientHints` still triggers generic detection" —
  `generate.test.ts > runs unconditional PHI detection even when patientHints
  are missing`, plus `pharmaAsk.test.ts > redacts ISO and slash DOBs
  unconditionally even without patientHints`, plus the route-level
  cross-format DOB scrub tests.
- "Client `deidentifiedText` containing PHI is rescrubbed or blocked" —
  `documentImportMapping.test.ts > server re-scrubs client deidentifiedText`
  (×2) and `psychopathExtract.test.ts > server re-scrubs client
  deidentifiedText` (×2).

### 12.6 Files changed / created (round 2)

```
Modified:
  .env.example
  docs/BETA_DEPLOYMENT_CHECKLIST.md
  server/services/discussCaseDeidentify.ts
  server/services/inlineEditService.ts
  server/services/butterflyExtract.ts
  server/services/clinicalMetadataExtract.ts
  server/services/clinicalIntelligence/run.ts
  server/services/criteriaDraftGenerate.ts
  server/services/interviewQuestions.ts
  server/services/combinationCheckAi.ts
  server/services/prepAiCheckAi.ts
  server/services/priorTherapiesAi.ts
  server/services/priorTherapyFailureAnalysisAi.ts
  server/services/labMedicationCorrelationAi.ts
  server/services/kbSeedLlm.ts
  server/routes/generate.ts
  server/routes/inlineEdit.ts
  server/routes/askButterfly.ts
  server/routes/pharmaAsk.ts
  server/routes/pharmaGenerate.ts
  server/routes/clinicalIntelligence.ts
  server/routes/documentImportMapping.ts
  server/routes/psychopathExtract.ts
  server/routes/discussCase.ts
  server/routes/generate.test.ts (strengthened)
  server/routes/inlineEdit.test.ts (strengthened)
  server/routes/askButterfly.test.ts (strengthened)
  server/routes/documentImportMapping.test.ts (strengthened)
  server/routes/psychopathExtract.test.ts (strengthened)

Created:
  server/services/safeLlmEgress.ts
  server/services/safeLlmEgress.test.ts
  server/__tests__/safeLlmEgressAudit.test.ts
  server/routes/pharmaAsk.test.ts
  server/routes/clinicalIntelligence.discuss.test.ts
```

### 12.7 Remaining risk after round 2

- `labMedicationCorrelationAi.ts` and `kbSeedLlm.ts` keep their own raw
  `fetch()` implementations because they implement provider-specific logic
  (DeepSeek→OpenAI second-opinion; KB seed batch). Both now sanitize and
  assert at the network boundary inside their dedicated egress functions and
  are explicitly allowlisted in the egress audit test. Risk: a future
  refactor that removes the in-function sanitize step would slip the audit
  unless the allowlist is reviewed alongside the change. Mitigation: the
  documented allowlist in `safeLlmEgressAudit.test.ts` is itself the review
  signal.
- The PHI scrubber is conservative — false positives are preferred to
  leakage. Aggressive patterns (e.g. the long-digit phone fallback) may
  redact substrings that look numeric in clinical notes. This is acceptable
  for prompts (the model receives `[REDACTED]` placeholders that preserve
  structure), but if a future feature ever depends on numeric content being
  preserved verbatim, that feature must use a structured (non-prompt)
  pathway, not an LLM call.

### 12.8 Final release verdict (round 2)

> **READY for Beta tagging.**

All P0 blockers, all Beta-blocker P1 items, **and** the LLM egress gap
flagged by the independent reviewer are closed. `npm run typecheck` exits 0;
`npm run test` exits 0 with the round-2 suite green; `npm run build` exits 0
with no new warnings. The egress audit test fails the build if any future
route attempts a direct provider call outside the documented allowlist.

The defence-in-depth gating built into the codebase — encrypted-at-rest
vault, server-side de-identification on **every** LLM-bound route via
`callLlmSafely`, fail-closed PHI assertions on the egress boundary, KB admin
404 by default, fail-closed CI debug flags both client and server, demo-case
isolation — is above the bar for a clinician-facing Beta.

Beta deploy remains safe **only if the operator follows
`docs/BETA_DEPLOYMENT_CHECKLIST.md`** — specifically: never copy
`.env.local`, mint fresh Beta secrets, keep `KB_ADMIN_API_ENABLED`,
`ENABLE_DOCUMENT_IMPORT_AI`, `ENABLE_PSYCHOPATH_EXTRACT_AI`,
`VITE_*` mirrors of those flags, the CI debug flags, and
`ENABLE_DEV_AUTH_BYPASS` unset / false unless the corresponding feature is
intentionally exposed for that deployment.

