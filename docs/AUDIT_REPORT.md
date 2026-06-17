# Psychiatry.Ink — Full-Project Code Audit

**Date:** 2026-06-17
**Scope:** Whole repository — React + TypeScript + Vite frontend, Express 5 backend (`server/`), Supabase, vault/E2EE encryption, AI features.
**Mandate:** "Correct errors without affecting workflow and functionality — improve, don't crash." Only safe, behavior-preserving fixes were applied; everything risky or ambiguous is recorded as a recommendation. All changes are left **uncommitted** for review.

---

## 1. Executive summary

Overall health: **Good and shippable for a pre-production build.** The codebase is large (≈697 frontend `.ts/.tsx` + 108 server `.ts` files), strongly typed (`strict: true`), and already passes typecheck, 228 tests, and a production build. Architecture is clean: a privacy-tier model, an encrypted vault/E2EE layer, server-side de-identification for several AI paths, and an AI usage/credit metering subsystem.

The most material risks are **not crashes** — they are **policy/architecture gaps** clustered in three areas:

1. **Authentication consistency on PHI/credit routes.** A set of routes (`patients`, `credits`, `generationLog`, `account/plan`, `crypto`, `workspaceVault`) fall back to a shared `'default'` account when no valid Bearer token is present. Safe to harden but the change is behavior-affecting, so it is **recommended, not applied**.
2. **PHI egress to external LLMs.** Several AI paths (generate, inline-edit, transcription, lab-med correlation, combination-check, discuss-case question) send clinical free-text to providers without (or with incomplete) de-identification. Mostly intentional/architectural — **recommended, not applied**.
3. **Plaintext PHI in `localStorage`.** Many feature modules use local write-through caches that store clinical text unencrypted at rest. Compliance-relevant but an architectural decision — **recommended, not applied**.

What **was** fixed this pass: a React setState-during-render loop, several missing-`.catch` / stuck-state bugs, a crash guard, a date-sort `NaN` guard, crash-safe storage writes, a timezone edge case, an async race guard, and a forward-compatible crypto decrypt fix — plus a new test for the previously-untested account-backup crypto path.

### Issue counts (deduplicated across the audit)

| Severity | Found | Fixed this pass | Recommended (not applied) |
|----------|------:|----------------:|--------------------------:|
| Critical | 9     | 1               | 8 |
| High     | 26    | 5               | 21 |
| Medium   | 30    | 5               | 25 |
| Low      | 14    | 1               | 13 |
| **Total**| **79**| **12**          | **67** |

> One reported "Critical" finding (AI budget threshold math, `recordAiUsageLog.ts:119`) was **investigated and found to be a false positive** — see §6.

### Final verification

| Check | Before | After |
|-------|--------|-------|
| `npm run typecheck` (app + server) | pass | **pass** |
| `npm run test` | 228 passed | **232 passed** (+4 new crypto tests) |
| `npm run build` | pass | **pass** (only pre-existing chunk-size/dynamic-import warnings) |

---

## 2. Fixed in this pass (safe, behavior-preserving)

All fixes below preserve existing behavior on the happy path; they only harden failure/edge paths or fix latent correctness bugs.

| # | File | Change | Why it is behavior-preserving |
|---|------|--------|-------------------------------|
| F1 | `src/components/settings/WorkspaceVaultSection.tsx:43-62` | Moved `getPassphraseBackup().then(setHasBackup)` out of the render body into a `useEffect([])` with cancellation + `.catch`. | Previously fired a fetch **and a `setState` on every render** → re-render loop / wasted fetches. The effect runs once on mount with the same end state (`hasBackup` reflects stored backup). |
| F2 | `src/components/timeline/TimelineViewer.tsx:50-53` | Added `if (!entry) return` guard in the `ResizeObserver` callback. | Pure crash guard for the rare empty-entries callback; normal resize behavior unchanged. |
| F3 | `src/context/AuthContext.tsx:80-91` | Added `.catch` to `supabase.auth.getSession()` that clears `loading`. | On success, identical. On a rejected init, previously `loading` stuck `true` forever (blank app) and an unhandled rejection fired; now it resolves to the unauthenticated state. |
| F4 | `src/components/notion/DiagnosenWidget.tsx:168-181` | Added `.catch` to `loadDiagnosenAsync` that clears the spinner **without** setting `hydrated`. | Deliberately does **not** set `hydrated=true` on error, so the save effect can never overwrite stored diagnoses with an empty list. Fixes a permanent-spinner stuck state. |
| F5 | `src/hooks/useCaseAccessSnapshot.ts:18-46` | Added a `requestIdRef` "latest wins" guard around async `setState`. | Happy path identical; only discards stale responses when `caseId`/org changes mid-flight, preventing the wrong case's access snapshot from rendering. |
| F6 | `src/hooks/useCaseRegistry.ts` (hydrate `localStorage` guards + `safeDateMs` sort) | Wrapped the two bare `localStorage` calls in `hydrateCaseRegistry` in try/catch; added `safeDateMs()` for the two case sorts. | Storage writes there are best-effort (a migration flag); guarding them prevents a thrown `setItem` (Safari private mode/quota) from permanently rejecting the hydrate promise and wedging the patient list. `safeDateMs` returns identical values for valid dates, only stabilizing order for corrupt `lastOpened`/`lastEditedAt`. |
| F7 | `src/utils/timelinePersistence.ts:108` | `localStorage.setItem` → `safeSetItem`. | Same write on success; on storage failure it no longer throws and abort a vault restore. Already the established pattern (`safeStorage.ts`). |
| F8 | `src/utils/labPersistence.ts:94` | `localStorage.setItem` → `safeSetItem`. | Same as F7. |
| F9 | `src/utils/siteTimezone.ts:35` | `hour: partValue(parts, 'hour') % 24`. | Hours 0–23 are unchanged; only normalizes the `Intl` "24" midnight quirk on some engines to `00`. |
| F10 | `src/utils/accountBackupCrypto.ts` | `decryptJsonWithPassphrase` now derives the key using `blob.iterations` (falling back to the constant when missing/invalid); encrypt still writes the constant. | All existing blobs store `iterations = 310_000`, so decryption is byte-identical today. Fixes a latent bug where a future iteration bump would break old backups, and makes the stored field actually used. |
| F11 | `src/utils/__tests__/accountBackupCrypto.test.ts` (new) | Added 4 tests: round-trip, wrong-passphrase failure, blank-passphrase guard, and legacy-blob (missing `iterations`) decrypt. Pinned to the `node` test env. | Adds coverage to a previously-untested critical crypto module and locks in F10. (`node` env avoids a jsdom cross-realm `ArrayBuffer` limitation in WebCrypto — not a product bug.) |

**Files touched (12):** the 10 source files above + 1 new test file. The pre-existing uncommitted work in `VerlaufFeedPage.tsx` and `notion-preview.css` was **not** modified.

---

## 3. Findings by area & severity

Legend: **SAFE** = a behavior-preserving fix exists; **RISKY** = fixing changes product/security/UX behavior and needs a decision.

### 3.1 Backend routes (`server/routes/**`, middleware, utils)

#### Critical
- **Auth fallback to `'default'` on PHI/credit routes.** `patients.ts:49-164`, `credits.ts:8-35`, `account.ts:8-17`, `generationLog.ts:36-118`, `workspaceVault.ts:25-199`, `crypto.ts:19-81` use `resolveAccountId(req)` / device-id fallback with no auth guard; missing/invalid Bearer resolves to a shared `'default'` account. Impact: cross-user data mixing and credit-pool abuse in any deployment where clients can reach the API unauthenticated. **RISKY** (hardening breaks local-only/legacy clients) — see §5.
- **Invalid/expired Bearer is silently ignored** (`middleware/auth.ts:113-129`): the request continues unauthenticated and writes to `'default'`, so a client that believes it is logged in mis-attributes data. **RISKY** globally; **SAFE** if PHI routes reject instead of falling back.

#### High
- **GenerationLog has no owner & PATCH has no ownership check** (`generationLog.ts:36-118`, `prisma/schema.prisma:14-32`): credits are deducted from the *caller's* account on completion of any log id; concurrent "started" logs can each pass `canAfford` then each deduct (double-spend). **RISKY** (needs `userId` column + atomic reserve).
- **Raw `error.message` returned to clients** across `discussCase.ts` (many handlers), `consultation.ts:192,211`, `org.ts`, `enterprise.ts:38-88`: leaks internal/DB details. **SAFE** to map to generic messages, but touches many handlers and a few tests assert on bodies — see §5 rationale.
- **`audit.ts:75-77` returns `200 {ok:true, skipped:true}` when audit write fails** — silently drops compliance events. **RISKY-ish** (clients may rely on 200).
- **`audit.ts:28-32,98-101` grants audit-log view to all users when `NODE_ENV !== 'production'`** — broad read in staging. **SAFE** to enforce permission in all envs (behavior change in non-prod).
- **discuss-case `ask-ai` skips org budget hard limit** (`discussCase.ts:586` vs `caseAiAccessGuard.ts:93-103`): calls `assertAiQuota` only, not `assertAiGenerationAllowed`. Could exceed org budget where other routes are blocked. **RISKY** (would start blocking requests that currently pass).
- **KB contribution POST is unauthenticated and trusts client-supplied submitter identity** (`kbContributions.ts:28-121`). **RISKY** if anonymous submission is intentional.
- **Auth placed after early returns** in `labMedicationCorrelation.ts:202-220`: empty-meds/labs paths respond before `assertLabMedAccess`. **SAFE** to move the guard up.
- **No try/catch on async accept/reject/AI handlers** in `combinationCheck.ts:321-392` and `labMedicationCorrelation.ts:462-652`: unhandled rejections. **SAFE** (add try/catch + generic 500).

#### Medium (selected)
- Unvalidated numeric/date inputs: `generationLog.ts:41-50` (`Number.isFinite`), `patients.ts:86-87,147-148` (`new Date(...)` validity). **SAFE**.
- Unbounded `limit`/`offset` on `audit.ts:106-113`; unbounded base64 audio decode on `transcribe.ts:34-38` and `inlineEdit.ts:124-128` (DoS). **SAFE** (add caps).
- `crypto.ts:74` `JSON.parse(record.publicKeyJwk)` without try/catch (corrupt row → 500). **SAFE**.
- `clinicalMetadata.ts:75-87` accepts optional `patientName` toward the LLM pipeline. **SAFE** to strip at boundary.
- Billing inconsistency: `/api/transcribe` charges credits; `/api/inline-edit/transcribe` uses quota only (free transcription path). **RISKY** (billing semantics).
- `aiUsage.ts:276-303` `GET /ai-budget/config` requires auth but not admin/billing permission (POST does). **RISKY** if transparency is intended.

### 3.2 Backend services / AI / crypto (`server/services/**`, `server/ai/**`)

#### Critical / High — PHI de-identification before external LLM
- **Generate / inline-edit / transcription send clinical text or audio to providers without server-side de-id** (`generate.ts:59-63`, `inlineEditService.ts:132-146`, `transcriptionProvider.ts:49-64`). Largely intentional/architectural. **RISKY**.
- **`clinicalNotes` / `labNotes` embedded in prompts without de-id** (`labMedicationCorrelationAi.ts:217,311`, `combinationCheckAi.ts:58,100`). **RISKY** — should reuse the shared redactor before prompt assembly.
- **discuss-case stores client-asserted `deidentifiedContent` and uses it for `ask-ai` without re-running de-id; the user's `question` is sent un-redacted** (`discussCaseStore.ts:262-272,828-835`, `discussCase.ts:591-612`). Butterfly/CMEA re-deidentify server-side; discuss-case does not. **RISKY** (trust-model change).
- **`discussCaseDeidentify.ts` is regex + optional `patientName` only** — misses addresses, MRClike IDs, names when `patientName` is absent. **RISKY** (tuning required to avoid over-redaction).

#### High — credit/quota metering attribution & atomicity
- **Several AI services omit `userId`/`organisationId` in `usageContext`**, so usage logs insert with null org/user and **org budget enforcement undercounts**: `priorTherapiesAi.ts:240-244`, `priorTherapyFailureAnalysisAi.ts:159-163`, `combinationCheckAi.ts:181-184`, `prepAiCheckAi.ts:118-121`, `labMedicationCorrelationAi.ts:408,476`. **SAFE in principle** (thread `resolveUsageContextFromRequest` from the route, as butterfly/CMEA already do) — **not applied** because it requires coordinated route+service plumbing across 5 features and is best done with per-feature tests; deferred to avoid a wide, behavior-adjacent change in this conservative pass.
- **Quota check & increment are non-atomic** (`aiQuota.ts:93-131`) and **budget hard-limit is checked before the LLM call while usage is inserted after** (`recordAiUsageLog.ts:210-243`): concurrent requests can both pass. **RISKY** (needs atomic SQL update / reservation).
- **Unknown models price to `null`** and budget sums treat null as 0 (`estimateCost.ts:17-26`, `modelPricing.ts` vs env overrides in `modelTierMapping.ts`): env-overridden model ids have no pricing row → undercounted spend. **SAFE** (add pricing rows / fallback).

#### Medium / Low (selected)
- `void incrementAiQuotaUsage / recordAiUsageLog / checkBudgetThresholds` (`caseAiAccessGuard.ts:123`, `llmProvider.ts:127,246`): swallow failures → metric drift. **SAFE** (await or log).
- `transcriptionProvider.ts:49` hardcodes `api.openai.com`, ignoring `OPENAI_BASE_URL`. **SAFE**.
- `kbSeedLlm.ts:253-264` `parseSeedJson` uses bare `JSON.parse`. **Investigated; not applied** — it is offline KB-seed tooling and callers depend on the throwing/`unknown` contract; changing it to return `null` risks the seed scripts. `parseStructuredJson.ts` is the safe variant for live paths.
- `combinationCheck.ts:270-279` increments quota once per drug pair (N LLM calls = N increments) — possibly intentional. **RISKY**.
- `privacyRegions.ts` defaults DACH to `local_only`, but no LLM route consults `resolvePrivacyTier` — privacy tier only gates crypto/vault. **RISKY** (enforcing blocks cloud AI for DACH).
- `loadEnv.ts:11-12` loads `.env` then `.env.local` with `override:true` — **precedence is correct** (local wins). Not a bug.

### 3.3 Frontend components (`src/components/**`)

#### Fixed: WorkspaceVaultSection (F1), TimelineViewer (F2), DiagnosenWidget (F4).

#### High / Medium (not applied)
- **`GeneratedDocumentEditor.tsx:298-535`**: multiple async loads (`buildTemplateRenderContext`, loader, regenerate) lack cancellation and `.catch`; a deleted/missing template yields a permanent blank screen. **SAFE** but multi-site; deferred (needs added error UI to be a real fix).
- **`CalendarItemModal.tsx:336-340`** reschedule promise lacks `.catch`; `:115-116` builds ISO from unvalidated `datetime-local`. **SAFE**.
- **`DiagnosenWidget.tsx:228-256`** other async paths (`createDiagnoseFreeText`, `syncDerivedCodingsAsync`) lack `.catch`. **SAFE**.
- **`useEffect` dependency omissions** behind `eslint-disable` (`KbSectionNav.tsx:51-85`, `KnowledgeBaseReadingPanel.tsx:100-116`, `WorkspaceContextMenu.tsx:315`, `PasteDetectionChip.tsx:46-52`): stale-closure risk. **RISKY** — adding deps can change effect re-run cadence; needs per-case verification.
- **`NotificationBell.tsx:14,49-56`** module-level `_lowCreditNotified` fires once per page load globally. **RISKY** (notification semantics).
- **`IntegrationsPage.tsx:139-142`** snaps case selection back to `cases[0]`, preventing intentional clearing. **RISKY** (UX).
- **`VerlaufFeedPage.tsx:1424`** `new Date('YYYY-MM-DD').toISOString()` → UTC-midnight off-by-one in non-UTC zones. **RISKY** (date semantics).
- **`LaborPage.tsx:2887`** partial-object cast `{label,date} as LaborBefund`. **RISKY**.
- Accessibility bugs: `TemplateFieldSettings.tsx:95-105` (inputs without labels), `KnowledgeBaseHighlightedText.tsx:85-89` (`<mark onClick>` not keyboard-accessible). **SAFE** (additive a11y).
- Several "initialize state from props once" dialogs (`NewPatientDialog`, `KnowledgeBase` CollectionDialog, `BefundPopup`, `AiUsageTrackerPanel`) don't resync on prop change — mostly mitigated by remount-on-`key`. **SAFE/low**.

### 3.4 Frontend utils / hooks / contexts (`src/utils/**`, `src/hooks/**`, contexts)

#### Fixed: useCaseAccessSnapshot race (F5), useCaseRegistry hydrate/sort (F6), timeline/lab persistence (F7/F8), siteTimezone (F9), accountBackupCrypto (F10/F11), AuthContext (F3).

#### Critical / High — crypto & storage (not applied)
- **Plaintext PHI in `localStorage`** (largest cluster): `verlaufFeed.ts`, `notionDocumentActions.ts`, `caseRegistryStorage.ts`/`useCaseRegistry`, `laborArchive.ts`, `savedDocs.ts`, `medication/storage.ts`, `dokumenteArchive.ts`, `therapieArchive.ts`, `psychotherapy/storage.ts`, `diagnosenArchive.ts`, `sozialtherapie/complementaryTherapy/weitereTherapie` stores. The vault encrypts the *sync* payload, but these local write-through caches persist clinical text/identifiers unencrypted at rest. **RISKY** (compliance/architecture migration). Note `verlaufFeed.ts:3-7` carries a comment asserting "no patient-identifying data" that does not match `content`.
- **Org calendar key regeneration** (`calendarEncryption.ts:324-338`): when an org calendar exists but the owner has no wrapped key/local backup, a *new* AES key is generated and uploaded, making prior ciphertext undecryptable (data loss). **RISKY** (needs a key-recovery flow).
- **E2EE fragment key overwrite** (`e2ee.ts:140-144`): a URL `#key=…` always overrides any stored key without validating it against the envelope — a wrong fragment corrupts decryption. **RISKY**.
- **`accountBackupCrypto`/`passphraseRecovery` ignored `iterations` on decrypt** — **FIXED for accountBackupCrypto (F10)**; the analogous spot in `passphraseRecovery.ts:128-143` remains and is recommended.
- `hydrateCaseRegistry` permanent-failed-promise — **mitigated (F6)** by guarding the throwing storage calls.

#### Medium / Low (not applied)
- `useCalendar.ts:49-89` mutations propagate errors with no try/catch (callers using `void create(...)` get unhandled rejections). **SAFE**.
- `workspaceVault.ts:513-537` backup-reminder uses a global key while exports record per-case keys → false reminders. **SAFE**.
- `usePatientMetadata.ts:157-161` debounced vault save not flushed on unmount → edits within 400ms of leaving can be lost. **SAFE** (mirror `useWorkspaceVault` flush).
- `timelineDates.ts:62-76` accepts impossible calendar dates (e.g. 31.02). **SAFE** (reuse `isValidCalendarDate`).
- `notionPageDate.ts:105-116` formats in browser-local TZ while the app standardizes on `Europe/Berlin`. **RISKY** (display semantics).
- `usePatientMetadata.ts:181-183` `stripPatientMetadataFromText` is a no-op (currently unused). **SAFE** (remove or implement).
- `useWorkspaceState.ts:1020-1022` `console.error('[generation] failed', error)` may log clinical context. **SAFE** (log generic + code).
- `usePomodoroTimer.ts:48-53` never sets `isFinished` on reaching zero. **RISKY** (behavior).
- `.buffer` serialization footgun for IV/salt (`cryptoVault.ts:311-312`, `accountBackupCrypto.ts:62-63`, `passphraseRecovery.ts:114-115`): latent if a TypedArray ever becomes a subarray. **SAFE** (slice / pass the view).

### 3.5 Config / build / types / tests

- **tsconfig drift** (`tsconfig.app.json` does not `extends` the root; root declares unused `@/*` paths/`baseUrl`). **SAFE** to unify; **not applied** to avoid touching the build/typecheck contract during a conservative pass.
- **`build` runs `tsc -b` against root tsconfig (src only)** — the server is not typechecked at build time (only via separate `typecheck:server`). **SAFE** improvement; deferred.
- **`vitest.config.ts` uses jsdom for all tests**, including `server/**` integration tests, and does not extend `vite.config.ts`. Works today; a node/jsdom workspace split is recommended. (This pass works around it locally with `// @vitest-environment node` on the new crypto test.)
- **`.env.example` drift**: `KB_ADMIN_API_ENABLED=true` in the template (code prefers `ENABLE_KB_ADMIN_API`, secure-by-default); `DEEPSEEK_FAST_MODEL=deepseek-chat` vs runtime default `deepseek-v4-flash`; many used env vars undocumented (`ENABLE_DEV_AUTH_BYPASS`, `ENABLE_ENTERPRISE_ORG_HIERARCHY`, CMEA/inline-edit flags, `LIVEKIT_*`, `OPENAI_BASE_URL`, etc.). `src/vite-env.d.ts` documents only 4 of the many `VITE_*` vars. **SAFE** (docs only) — deferred to avoid implying config behavior changes.
- **`noUncheckedIndexedAccess` is off** in all tsconfigs (`strict` otherwise on). **RISKY** to enable (large cascade).
- **`.gitignore`** correctly ignores `.env*` and keeps `!.env.example`; `.env.local` is **not** git-tracked (verified). `*.local` glob is slightly broad. **Low**.

---

## 4. Security section

### Application-layer (from this audit)
- **Unauthenticated PHI/credit routes & silent invalid-token fallback** (§3.1 Critical) — top application security item. Harden PHI routes to require valid auth (reject, don't fall back to `'default'`) when Supabase/org store is configured.
- **PHI egress to external LLM providers** without complete server-side de-identification (§3.2) — re-run `deidentifyPackageContent` server-side on discuss-case packages and questions; de-identify `clinicalNotes`/`labNotes` before prompt assembly.
- **Raw error messages to clients** (discuss-case, consultation, org, enterprise) — map to generic strings.
- **Audit write failure masked as success** and **non-prod audit-view-for-all** — close the compliance blind spots.
- **DoS surface**: uncapped base64 audio decode and uncapped audit `limit/offset`.

### Database-side (Supabase advisories — pre-production, surfaced separately; **no DB changes attempted here**)
- **Auth: leaked-password protection is OFF.** Enable HaveIBeenPwned breach checks in Supabase Auth.
- **Knowledge-base tables with `USING (true)` write RLS** — two KB tables have write policies open to `anon`/`authenticated`. Tighten to authenticated + role/ownership predicates.
- **`SECURITY DEFINER` functions publicly executable** — review `GRANT EXECUTE` and `search_path` pinning; restrict to intended roles.
- **Unindexed foreign keys / unused indexes** — add covering indexes on hot FKs; drop or justify unused indexes after load review.

These are infrastructure/migration items for the DB owner; they are listed here for completeness and tracking.

---

## 5. Recommended (not applied — needs decision / risk)

The following were intentionally **not** changed because a fix would alter behavior, contracts, or architecture, or because it could not be verified safe within this conservative pass. Suggested approaches included.

1. **Require auth on PHI/credit routes** (`patients`, `credits`, `generationLog`, `account/plan`, `crypto`, `workspaceVault`) and **reject invalid Bearer** on PHI routes instead of falling back to `'default'`. *Approach:* add `requireRouteAuth`/`requireAuthenticatedUserOrDevBypass`; gate the `'default'` fallback behind an explicit local-only/dev flag. *Risk:* breaks anonymous local-only clients — needs a product decision on local-only mode.
2. **GenerationLog ownership + atomic credit reservation.** *Approach:* add `userId` to `GenerationLog`, bind logs to the creator, reserve credits on create in a transaction (mirror `services/credits.ts`). *Risk:* schema migration + behavior change.
3. **De-identify all LLM-bound clinical text** and **re-deidentify discuss-case packages/questions server-side**. *Approach:* reuse the shared redactor at every route→provider boundary; treat the client `is_deidentified` flag as untrusted. *Risk:* over-redaction; needs tuning + tests. Also extract the duplicated client/server de-id into `shared/`.
4. **Thread `userId`/`organisationId` into `usageContext`** for prior-therapies, prior-therapy-failure, combination-check, prep-ai-check, lab-med-correlation. *Approach:* pass `resolveUsageContextFromRequest(req)` from each route (as butterfly/CMEA do). *Risk:* low individually, but it is wide route+service plumbing best landed with per-feature tests.
5. **Atomic quota/budget enforcement.** *Approach:* single SQL `UPDATE ... WHERE used < limit` or row lock; reserve budget before the LLM call. *Risk:* may change the current "slight overrun allowed" behavior.
6. **Add `assertAiGenerationAllowed` (org budget) to discuss-case `ask-ai`.** *Risk:* will start blocking requests that currently pass — confirm intended.
7. **Genericize client-facing error messages** in discuss-case/consultation/org/enterprise. *Risk:* low, but a few tests/clients may assert on message text; do with a sweep + test update.
8. **Add input caps/validation**: base64 audio size on transcribe paths; audit `limit/offset`; `Number.isFinite` on generationLog numerics; `new Date(...)` validity on patients. *Risk:* rejects previously-accepted malformed input (intended), so verify no client sends such payloads.
9. **Encrypt PHI at rest in `localStorage`** (or route all clinical caches through the vault). *Risk:* data-migration + architecture.
10. **Crypto hardening**: validate E2EE `#key` against the envelope before overwriting (`e2ee.ts`); replace silent org-calendar key regeneration with a recovery flow (`calendarEncryption.ts`); apply the `iterations`-on-decrypt fix to `passphraseRecovery.ts` too; pass exact byte views (not `.buffer`) for IV/salt. *Risk:* security-sensitive — needs careful review/tests.
11. **GeneratedDocumentEditor / CalendarItemModal / remaining DiagnosenWidget async paths**: add cancellation + `.catch` with real error UI. *Risk:* needs UX for error states to be a complete fix.
12. **useEffect dependency corrections** behind `eslint-disable`. *Risk:* changes effect re-run cadence; verify each.
13. **Config hygiene**: unify tsconfigs via `extends`; fix `build` to typecheck the server; vitest node/jsdom workspace; bring `.env.example` + `vite-env.d.ts` in sync with code. *Risk:* low but touches build contract.

---

## 6. Investigated but NOT a bug (false positives)

- **`server/ai/usage/recordAiUsageLog.ts:119` (`void addedCostEur`).** Flagged as a budget-threshold math bug. **It is correct:** `checkBudgetThresholds` is invoked *after* the usage row is inserted (line 204), and it recomputes `currentUsage` by **querying `ai_usage_logs` for the current period (≥ periodStart)**, which already includes the just-inserted row. Adding `addedCostEur` would **double-count** the current request. Left unchanged.

---

## 7. Performance notes

- **Single large JS bundle** (`dist/assets/index-*.js ≈ 4.6 MB / 1.31 MB gzip`) with a build warning. Heavy libs (`jspdf`, `html2canvas`, `pdfjs`) are already split. Consider route-level `manualChunks`/lazy loading for the editor and PDF paths. (Pre-existing; not a regression.)
- **`accountBackup.ts` is both statically and dynamically imported** (`useCaseRegistry` dynamic vs settings static), so the dynamic import can't move it to its own chunk — pick one import style to actually code-split it.
- **Budget/quota read paths** (`recordAiUsageLog`, `isBudgetHardLimitExceeded`) fetch all period logs and sum in JS on every AI call; at scale prefer a materialized monthly aggregate or a DB-side `sum()`.

---

## 8. Test-coverage gaps on critical paths

Existing suite (now 232) covers clinical-metadata regex/merge, butterfly AI parse + context de-id, prior-therapy server de-id, inline-edit route auth/validation, KB-admin env gating, auth-bypass guard, AI-usage normalization/pricing, and the medication/diagnosis/demo utilities. Newly added: account-backup crypto round-trip (this pass).

Notable remaining gaps (recommended targeted tests; do not rewrite the suite):
- **De-identification:** `src/utils/discussCase/deidentify.ts`, `server/services/discussCaseDeidentify.ts`, `src/utils/pseudonymize.ts`, `src/utils/clinicalImprint/redactEvidence.ts` — none have tests. Highest-value addition given PHI risk.
- **Credit metering:** `server/services/credits.ts` (`deductCredits`/`canAfford` atomicity), `routes/credits.ts`, `routes/generationLog.ts`, `routes/transcribe.ts` deduction, `src/utils/estimateCredits.ts`, `src/utils/planGating.ts`.
- **Encryption/vault:** `cryptoVault.ts`, `e2ee.ts`, `workspaceVault.ts`, `orgCaseVault.ts`, `routes/crypto.ts` (the new test covers `accountBackupCrypto.ts` only).
- **Auth guards:** `server/utils/requireRouteAuth.ts`, `caseAiAccessGuard.ts`, `middleware/auth.ts` (`optionalAuth`/token validation), `middleware/requireEnterprise.ts`.
- **AI output parsing:** `server/utils/parseStructuredJson.ts` (shared salvage parser used by 5+ services).
- **Permissions / feature flags:** `server/services/orgPermissions.ts`, `src/services/permissionService.ts`, client/server `featureFlags.ts` (note the dev/prod default divergence).

---

## 9. Final verification (commands run)

```
npm run typecheck   # app + server — PASS
npm run test        # 232 passed (was 228; +4 new crypto tests) — PASS
npm run build       # PASS (pre-existing chunk-size & dynamic-import warnings only)
```

> `vitest` was run outside the sandbox (it hits `kill EACCES` under sandboxing — an environment limitation, not a test failure).

All applied fixes keep the suite green; no fix was left in that broke typecheck, tests, or the build. Everything risky was recorded above rather than applied.
