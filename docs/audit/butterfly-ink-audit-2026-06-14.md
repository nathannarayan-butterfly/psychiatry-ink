# Psychiatry.ink / Butterfly.ink — Complete Audit Report

| Field | Value |
|-------|-------|
| **Date** | 2026-06-14 |
| **Version** | 0.1.0 |
| **Auditor** | AI-assisted (Cursor Agent) |
| **Workspace** | `/home/nathan-narayan/Projects/psychiatry-ink` |

---

## Executive Summary

The project **builds cleanly** (`tsc -b && vite build`) and **all 17 tests pass**. Core clinical workflows (anamnese, verlauf, diagnostik, medikation, demo patient) are functional with a rich synthetic demo fixture suitable for most sales walkthroughs.

**Three P0 issues** require attention before production: unauthenticated AI access in legacy/dev auth mode, KB Admin API enabled by default outside production, and **dual migration systems** (Prisma + Supabase) that can cause deployment drift.

**Twelve P1 issues** cover test gaps, bundle size, incomplete enterprise/integration modules, demo seed v2 vs canonical v3 readiness, and server-side stubs.

**Eight minor fixes** were applied during this audit: German-first demo i18n, translated archive action, and targeted CSS layout polish for demo chips and banners.

**Export:** Structured JSON at `docs/audit/butterfly-ink-audit-2026-06-14.json`  
**Script:** `npx tsx scripts/export-audit-report.ts`

---

## Audit Parameters Checklist

| Area | Status | Notes |
|------|--------|-------|
| Build (`npm run build`) | **pass** | Clean; 4.38 MB main chunk warning |
| Tests (`npm test`) | **pass** | 17/17; demo module only |
| Workflow audit | **pass** | 9/9 (`npm run audit:workflows`) |
| TypeScript | **pass** | `tsc -b` succeeds |
| ESLint | **warn** | Not configured |
| Auth / org / permissions | **warn** | Legacy `default` account bypass when unconfigured |
| Patient / case workspace | **pass** | E2EE vault, case access, org headers |
| Demo patient (canonical sync) | **warn** | Bundled v2; canonical API ready |
| Anamnese / Verlauf / Diagnostik | **pass** | Rich fixture; workflow matrix OK |
| Therapie / Medikation AI | **warn** | Language enforced on new routes; `/api/generate` gap |
| Calendar / day schedule | **warn** | Needs Supabase migration apply |
| Documents / Vorlagen | **pass** | Template workspace functional |
| Konsil / DiscussCase | **warn** | DB-backed; voice needs LiveKit; demo placeholders |
| Integrations hub | **warn** | FHIR mapper stub |
| Audit logs | **warn** | Dev permission bypass |
| Clinical Imprint | **pass** | ISDM integrated |
| AI API (language / org / Quelle) | **warn** | `clinicalApiFetch` OK; legacy generate gap |
| Security / PHI | **warn** | Demo markers OK; prod auth must be enforced |
| Secrets not committed | **pass** | `.env*` gitignored |
| Demo read-only enforcement | **pass** | `isDemoCaseReadOnly` gates edits |
| UX / design polish | **pass** | Fixes applied this audit |

---

## Critical Issues (P0)

### P0-001 — Unauthenticated AI access in dev/legacy mode

When Supabase auth and org store are not configured, `optionalAuth` allows requests as account `default`, and `allowLegacyDevAccount()` permits AI generation without login.

- **Files:** `server/middleware/auth.ts`, `server/utils/requireRouteAuth.ts`, `server/utils/caseAiAccessGuard.ts`
- **Action:** Require auth on all AI routes in staging/production; configure `SUPABASE_URL` + `SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY`.

### P0-002 — KB Admin API enabled by default outside production

`kbAdminEnabled()` returns `true` when `NODE_ENV !== 'production'` unless `KB_ADMIN_API_ENABLED=false`.

- **File:** `server/routes/kbAdmin.ts`
- **Action:** Default `KB_ADMIN_API_ENABLED=false`; explicit opt-in per environment.

### P0-003 — Dual migration systems — deployment drift risk

Prisma migrations cover credits/patient-registry/SQLite. Org, konsil, discuss-case, calendar, integration, and demo canonical tables live in **20+ Supabase SQL migrations** not tracked by Prisma.

- **Dirs:** `prisma/migrations/`, `supabase/migrations/`
- **Action:** Automate Supabase migration apply in CI/CD; add server preflight for required tables.

---

## Major Issues (P1)

| ID | Issue | Module |
|----|-------|--------|
| P1-001 | Only 17 tests (demo-only); no server/UI coverage | testing |
| P1-002 | 4.38 MB main bundle; no code splitting | build |
| P1-003 | `/api/generate` missing `requireClinicalLanguage` | AI routes |
| P1-004 | Audit log view bypasses `audit.view` in non-production | audit |
| P1-005 | Demo seed still **v2**; canonical v3+ not published | demo |
| P1-006 | Enterprise module largely stubbed (SSO, departments) | enterprise |
| P1-007 | DiscussCase voice needs LiveKit env vars | discuss-case |
| P1-008 | Combination check `pendingRuns` in-memory only | combination-check |
| P1-009 | FHIR integration adapter is stub | integration |
| P1-010 | Konsil/DiscussCase not in demo fixture | demo |
| P1-011 | No ESLint / lint CI gate | tooling |
| P1-012 | Workspace vault deviceId fallback without auth | workspace-vault |

---

## Minor Issues Fixed

| ID | Fix | Files |
|----|-----|-------|
| FIX-001 | Demo labels German-first + i18n keys | `src/data/uiTranslations.ts`, `src/demo/demoReadOnly.ts` |
| FIX-002 | Read-only banner uses `t('demoReadOnlyBanner')` | `src/components/notion/NotionApp.tsx` |
| FIX-003 | Dashboard demo chip i18n | `DashboardPage.tsx`, `PatientCaseCard.tsx` |
| FIX-004 | "Archive demo" → `t('demoArchiveAction')` | `PatientCaseCard.tsx` |
| FIX-005 | Patient nav demo name i18n | `PatientDashboardView.tsx` |
| FIX-006 | Banner wrap + center on narrow screens | `src/styles/demo-patient-dev.css` |
| FIX-007 | Patient card title `min-width:0; flex:1` | `src/styles/globals.css` |
| FIX-008 | Dashboard list name flex-wrap for chip | `src/styles/globals.css` |

---

## Design Polish Applied

- Demo read-only banner: centered, wraps on mobile
- Dashboard patient list: demo chip no longer overflows title
- Patient case card: long names + chip layout stable

---

## Module-by-Module Findings

### Auth / org / permissions
- Supabase JWT validation via direct GoTrue fetch (avoids Realtime WebSocket crash on Node 20).
- Org context via `X-Organisation-Id` header + `buildOrganisationContext`.
- **Risk:** `default` account when auth unconfigured.

### Patient / case workspace
- Client-side E2EE (`cryptoVault`, `workspaceVault`).
- `CaseAccessPanel` + `useCanAccessCase` for module-level ACL.
- Audit events on case open.

### Demo patient (canonical sync)
- IDs: `DEMO-CASE-0001`, `DEMO-0001`, seed **v2** bundled.
- Canonical sync: `fetchAndApplyCanonicalDemoFixture()` → `GET /api/demo-patient/canonical`.
- Publisher writes via `POST` (demo publisher email allowlist).
- Read-only for all users except publisher (`isDemoCaseReadOnly`).
- Dev QA page: `/demo-patient-dev` (internal).

### Anamnese, Verlauf, Diagnostik
- Demo fixture includes Aufnahme (full anamnese), Verlauf feed (12+ entries), Diagnostik befunde schemas (ECG/EEG).
- Workflow audit: 9/9 clinical tool routing cases pass.

### Therapie / Medikamentöse Therapie
- Combination check, lab-med correlation, prep AI check — server routes with KB + AI layers.
- `clinicalApiFetch` injects language + org header.
- Cached findings in demo fixture for offline sales demo.

### Calendar / day schedule
- Encrypted calendar payloads (`calendarEncryption`).
- Supabase tables via `20260627000000_calendar_module.sql`, `20260628000000_calendar_encrypted_payload.sql`.

### Documents / Vorlagen
- Template picker, rich text editor, placeholder bindings (patient/case/clinician/org).
- PDF export via jspdf/html2canvas.

### Konsil / DiscussCase
- Full Supabase stores (`consultationStore`, `discussCaseStore`).
- E2EE for identified discuss-case packages.
- LiveKit voice optional; env-gated.
- **Not seeded in demo fixture.**

### Integrations hub
- Canonical case builder, adapter pattern.
- FHIR mapper explicitly stubbed.

### Audit logs
- Client `recordAuditEvent` + server `POST /api/audit`.
- Debug page in dev; permission check relaxed in non-production.

### Clinical Imprint
- ISDM engine wired; orchestrator uses dynamic imports.

### AI API calls
- New clinical routes: `Accept-Language` + body `language` via `requireClinicalLanguage`.
- Org header: `X-Organisation-Id` from `clinicalApiFetch`.
- Quelle/provenance shown in combination check and lab-med panels (German UI).
- Legacy `/api/generate` uses direct `getAuthHeaders()` without language requirement.

---

## Demo Patient Status

| Item | Status |
|------|--------|
| Synthetic markers (`isDemoPatient`, DEMO-* IDs) | OK |
| Read-only enforcement | OK (publisher bypass) |
| Fixture completeness (anamnese, dx, meds, labs, verlauf) | OK |
| Kombi-check / lab-med / prep AI cached | OK |
| Konsil / DiscussCase in fixture | Missing (placeholders) |
| Canonical sync infrastructure | Ready (Supabase migration applied) |
| Bundled seed version | **v2** (recommend publish **v3** before sales) |
| Sales readiness | **Good** for core clinical demo; partial for collaboration modules |

---

## Test & Build Results

```
npm run build     → exit 0 (warnings: chunk size, import mixing)
npm test          → exit 0 (3 files, 17 tests)
npm run audit:workflows → exit 0 (9/9)
```

No ESLint configured. TypeScript strict build passes.

---

## Recommendations / Next Steps

1. **Apply Supabase migrations** to production before enabling org/konsil/calendar.
2. **Publish demo canonical v3** via publisher API for field sales sync.
3. **Require authentication** on all AI routes in non-local environments.
4. **Add route-based code splitting** to reduce 4.38 MB initial bundle.
5. **Expand test suite** — org permissions, API auth, demo read-only.
6. **Add ESLint** CI gate.
7. **Set `KB_ADMIN_API_ENABLED=false`** by default.
8. **Document LiveKit env** for DiscussCase voice demos.

---

## Appendix: Commands Run

```bash
cd /home/nathan-narayan/Projects/psychiatry-ink
npm run build
npm test
npm run audit:workflows
npx tsx scripts/export-audit-report.ts
```

### Export paths

- Markdown: `docs/audit/butterfly-ink-audit-2026-06-14.md`
- JSON: `docs/audit/butterfly-ink-audit-2026-06-14.json`
- Script: `scripts/export-audit-report.ts`

```bash
# Print markdown report
npx tsx scripts/export-audit-report.ts --md

# Export JSON to stdout
npx tsx scripts/export-audit-report.ts --json
```
