# Psychiatry.Ink — Product & Feature Overview

> Status: Living product report, grounded in the codebase as of this writing. Where behavior could not be fully confirmed from code, the text says "appears to" or omits the claim. Feature maturity (production / behind feature flag / prototype) is noted per area where evident.

---

## 1. What is Psychiatry.Ink

Psychiatry.Ink is a **distraction-free clinical writing workspace for psychiatric documentation**. The README describes it as a "Distraction-free clinical writing workspace for psychiatric documentation," and the landing page positions it with the tagline *"Ruhig schreiben. Klinisch präzise bleiben."* ("Write calmly. Stay clinically precise.") under the eyebrow **"Psychiatrische Dokumentation."**

- **Clinical domain:** psychiatry / mental health — admission histories (Aufnahme), course/progress notes (Verlauf), psychopathology findings (AMDP/ISDM), diagnoses (ICD-10/11), medication plans (Psychopharmaka), labs (Labor), and psychotherapy/complementary therapies.
- **Primary users:** psychiatrists and psychiatric clinicians, with clinic/team structures (organisations, team settings, role-based case access, and an optional enterprise hierarchy) layered on top.
- **Core value proposition:** a minimal, Notion-style editor for psychiatric notes, augmented by **optional AI** (drafting, dictation/transcription, inline voice editing, clinical-intelligence extraction) and **region-aware privacy** (client-side vault encryption of patient identifiers, server-side de-identification before any LLM call). The landing copy emphasizes: minimal workspace, optional AI assistance, dictation, and "lokaler Datenschutz nach Region" (local/region-specific data protection).

The default UI language is **German** (the product targets the DACH region first), with full translations for **en / fr / es**.

---

## 2. Tech & Architecture Overview

### Stack
- **Frontend:** React 19 + TypeScript, built with **Vite 6**, styled with **Tailwind CSS v4** plus a large set of hand-authored CSS design-token stylesheets in `src/styles/`. Charts use **Recharts**; PDF export uses **jspdf / pdf-lib / pdfjs-dist / html2canvas**; icons via **lucide-react**.
- **Backend:** an **Express 5** API server (`server/index.ts`) run with `tsx` in dev, concurrently with Vite (`npm run dev` → `api` + `web`). All routes are namespaced under `/api/*`.
- **Persistence (hybrid):**
  - **Supabase** (`@supabase/supabase-js`) is the primary cloud store for auth, the knowledge base, discuss-case/consultation, calendar, org/enterprise, audit logs, AI-usage logs, and more. SQL migrations live in `supabase/migrations/`.
  - **Prisma/SQLite has been removed.** Credit balances/plans now live entirely in Supabase — `server/services/credits.ts` delegates to `ai_credit_accounts` (via RPC in `server/ai/creditGuard.ts`), with the legacy `credit_balances` table kept only for plan metadata and a local-dev `'default'` singleton. There is no Prisma dependency in `package.json` and no local relational store.
- **Realtime / voice:** **LiveKit** client + server SDK (`livekit-client`, `livekit-server-sdk`) for voice panels (e.g., discuss-case voice); a `/api/health/voice` endpoint reports LiveKit env configuration in non-production.
- **Validation:** **Zod** schemas (`src/schemas`, `src/data/aiCallSchemas.ts`).

### How frontend / backend / DB fit together
- The React app talks to the Express API via a thin client layer in `src/services/*` (e.g., `apiClient.ts`, `clinicalApiFetch.ts`, `authHeaders.ts`). Auth is Supabase-based; the server uses `optionalAuth` middleware and resolves an account id per request.
- **Sensitive patient identifiers never go to the cloud in the clear.** Two complementary mechanisms:
  1. **Client-side vault encryption** (`src/utils/cryptoVault.ts`): patient `{ name, geburtsdatum }` is encrypted in-browser via the Web Crypto API (AES-GCM-256 content key, wrapped with an RSA-OAEP-2048 key pair whose private key stays in IndexedDB). Exportable vault blobs carry only `{ version, ciphertext, iv, wrappedKey }`. The server only ever receives the **public key JWK** (and only when the privacy tier permits).
  2. **Server-side de-identification** (`server/services/discussCaseDeidentify.ts`): before any clinical text reaches an LLM, identifiers (names, dates, case/insurance numbers, phone, email) are redacted. Butterfly and CMEA both de-identify *authoritatively server-side* right before prompt assembly.
- **LLM gateway** (`server/services/llmProvider.ts`): a single `callLlm({ tier, systemPrompt, userPrompt, ... })` entry point calls an OpenAI-compatible Chat Completions endpoint (OpenAI or DeepSeek). It handles provider fallback, max-token clamping, truncation detection, an empty-JSON retry, and **AI-usage logging** on every call. If no provider key is set, it returns deterministic **mock** completions so the app degrades gracefully.
- **Model tiers** (`server/modelTierMapping.ts`): `fast` / `standard` / `thorough`, plus an explicit opt-in **"Maximum"** override. By default `fast` → **DeepSeek** (`deepseek-v4-flash`), `standard` → **Google Gemini** (`gemini-2.5-flash`, env-reroutable via `STANDARD_PROVIDER`/`STANDARD_MODEL`), `thorough` → **OpenAI** (`gpt-5.4`, a GPT-5-series reasoning model), and **Maximum** → **OpenAI** (`gpt-5.5`, applied as an explicit per-generation model override, never a tier default). Each tier has a cross-vendor fallback — **Mistral AI** (EU-residency) is the fallback for `fast`/`standard` under `LLM_RESIDENCY=eu` (see `server/ai/providerResidency.ts`), and `thorough` falls back to DeepSeek. Transcription defaults to `gpt-4o-transcribe`.
- **Credits / quota:** AI generation and dictation consume **credits** (`server/services/credits.ts`, `server/services/aiQuota.ts`, `server/routes/credits.ts`). New accounts get a free credit grant; when credits are exhausted, editing and export remain usable (per landing copy). A separate **AI budget/usage** subsystem tracks token usage and cost (see §3).

### Env / config
- Client config uses `VITE_`-prefixed vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, plus feature flags). LLM provider keys are **server-only** (`OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, never `VITE_`-prefixed). `SUPABASE_SERVICE_ROLE_KEY` is used server-side for KB seed/admin (bypassing RLS for AI drafts). Model overrides (`OPENAI_THOROUGH_MODEL`, etc.) are configurable.

### i18n
- Translations live primarily in `src/data/uiTranslations.ts` (7,000+ lines) plus domain-specific translation files (medication, psychotherapy, sozialtherapie, weitereTherapie, hints, components). Languages: **de / en / fr / es**, with an English-variant distinction. A `TranslationProvider` + `useTranslation()` hook drives the UI; `hintTranslationAgent.ts` suggests there is an AI-assisted translation path for hints.

### Theming / design tokens
- Global design tokens live in `src/styles/globals.css`, with per-feature stylesheets (e.g., `overview-dashboard.css`, `butterfly.css`, `case-sidebar.css`, `notion-preview.css`). An **appearance settings** system (`useAppearanceSettings.ts`, `src/data/appearancePresets.ts`, `AppearanceSection.tsx`) supports user theme preferences, and `chartTheme.ts` centralizes chart styling.

---

## 3. Implemented Functionalities — Detailed Inventory

### Dashboard / patient registry — "Meine Patienten" (production)
- `DashboardPage` is the post-login home. It shows a **patient registry** ("Meine Patienten") of case cards, with patient privacy handled per region (local-only identifiers in DACH).
- Case registry state is managed via `useCaseRegistry.ts` / `caseRegistryStorage.ts`; dashboard stats via `dashboardCaseStats.ts`. A patient-creation dialog and a workflow picker exist (per git history: "patient creation dialog, dashboard redesign").
- The dashboard is the launch point for **Templates, Team settings, Integrations, Budget manager, Calendar**, and (flag-gated) **Enterprise**.

### Case workspace shell (production)
- `CaseWorkspacePage` is the per-case shell. It includes:
  - a **global left sidebar** (`CaseSidebarPanel` + content/quick-nav/back/next links/user footer),
  - **"Klinische Bereiche"** primary navigation (`CaseClinicalAreasNav` / `CaseTopNav`) across tabs: **Übersicht (overview), Fall/Workspace, Verlauf, Diagnose, Labor, Medikation, Therapie, Dokumente, Discuss**,
  - a **patient header** (`CasePatientHeader`) with prev/next patient navigation and a jump back to "Meine Patienten,"
  - **calendar/clock widgets** (`AnalogClock`, `PomodoroWidget`, documentation timers, day-schedule/active-appointment bar) and a documentation-session timer.
- Tabs are **patient-gated** (most areas require a patient; without one, only the workspace is shown).

### Notion-style editor workspace (production)
- The core editor lives under `src/components/notion/`. `NotionApp` / `NotionEditor` / `NotionMultiSectionEditor` provide a **pages + sections** model (`notionPages.ts`, `NotionPageSwitcher`), with slash commands (`SlashCommandMenu`), a floating selection toolbar, page date/time fields, breadcrumbs, dictation strip, paste assistant/detection, and generation review UI.
- **Verlauf (course) feed** (`VerlaufFeedPage`, `src/utils/verlauf*`): a chronological feed of progress entries. Manual entries are editable plain-text cards (write-back via `updateVerlaufEntry`); derived/Aufnahme cards are read-only history.
- **Übersicht (overview dashboard)** (`src/components/notion/overview/`, **recently redesigned** per git "leaner Übersicht"): a patient overview with `OverviewHero`, `OverviewCard`s, **symptom trajectory/snapshot** charts + sparklines, **medication overview**, **prior-therapies overview**, **labs-due** and **safety-alerts** cards. Users can hide graphs (`useOverviewHiddenGraphs.ts`). Patient dashboard / overview appears gated to the **Pro** plan (per landing copy).
- **Medikation** (`MedikationPage`, `src/utils/medication`, `useMedicationPlan.ts`): a **medication plan** with insights, **prior therapies** (`medicationPriorTherapies` route + `useCasePriorTherapies`), prior-therapy failure analysis (AI), market/availability and preparation options (country-specific), and Spiegelwerte (drug levels) section.
- **Therapien** (`TherapiePage`, plus psychotherapy / complementary / weitere / sozialtherapie modules and `therapy/` components): structured psychotherapy and complementary-therapy planning, therapy adherence (`TherapieAdherenceSection`, `therapyAdherence.ts`), and a receptor-affinity **radar** tied to the medication knowledge base.
- **Diagnostik / Labor** (`LaborPage`, `NotionLabCanvas`, `src/utils/laborParser.ts`, `lab/` components): lab value parsing from pasted text, inline preview tables, **trend graphs**, drug-relevant lab graphs, a sidebar widget, and a **lab–medication correlation** feature (`labMedicationCorrelation` route/service, AI + KB-backed).
- **Diagnose** (`DiagnosePage`, `DiagnosenWidget`, `diagnosenArchive.ts`, `diagnosenCodingSystem.ts`): diagnosis capture with a coding system (ICD-10/11), backed by a diagnosis catalog/crosswalk (`scripts/build-diagnosis-crosswalk.ts`, `seed-diagnosis-codes.ts`, `/api/diagnosis-codes`).

### Butterfly — clinical-intelligence (production core, AI assist on-demand)
- **Criteria evaluation** (`src/data/diagnosisCriteria/`, `src/utils/diagnosisCriteria/`): a versioned, **licensing-safe** operationalized criteria pack for ICD-10/11 disorders. Five disorders ship today: **depressive episode, generalized anxiety, alcohol dependence, panic disorder, schizophrenia** (`DIAGNOSIS_CRITERIA_VERSION = 1`, `BUTTERFLY_PROFILE_ID = 'butterfly_criteria_support'`). Criteria are evaluated **deterministic-first**; only criteria still `unknown` after structured evaluation reach the LLM.
- **LLM-on-doubt extraction** (`server/services/butterflyExtract.ts`, `/api/butterfly`): for one disorder, all unresolved criteria are batched into a **single** de-identified LLM call. Output is strictly advisory `{met | not_met | unclear}` + optional evidence quote + confidence; it **never auto-accepts and never asserts a diagnosis**. The product is careful to send only its own original criterion paraphrases — **never copyrighted ICD/DSM text** — and DSM is kept as a code/label crosswalk only.
- **Suggested questions loop — "Vorgeschlagene Fragen"** (`src/utils/clinicalQuestions/`, `IsdmAnalysisPanel.tsx`): questions are derived strictly from the still-`unknown` criteria of clinician-entered diagnoses (not generic prompts). The clinician resolves each as **present / absent / unclear** (the German Ja / Nein / Unklar UX). Resolution maps onto a clinician **attestation** (`resolutionToAttestation`: present→met, absent→not_met, unclear→clears the attestation and re-opens the criterion), which the deterministic evaluator then reads.
- **Attestations & citations** (`butterfly/attestationStorage.ts`, ICD citations per git "ICD citations"): clinician attestations are the source of truth; criteria carry `sourceRef` citations for provenance.

### CMEA — Clinical Metadata Extraction Agent (behind default-off flags)
- `server/services/clinicalMetadataExtract.ts` + `/api/clinical-metadata` + `src/utils/clinicalMetadata/`. Goal: **"compute once, reuse many."** Instead of each feature de-identifying and calling the LLM over the same Aufnahme/Verlauf, CMEA runs a **single batched, de-identified** call across changed sections and returns flat, **provenance-tagged `ClinicalFact[]`** keyed by source.
- **Hybrid extraction:** Pass A is a deterministic **regex extractor** (`regexFacts.ts`) that **always runs** client-side and writes cheap provenance-tagged facts onto every imprint record; Pass B is the **cost-bearing LLM enrichment** that only runs when enabled.
- Facts are **advisory** (carry evidence quote + confidence + `extractor: 'llm'`); deterministic/ISDM data stays source of truth, and promotion to truth happens only via clinician accept. Mock/parse failure → empty facts, so Pass A always stands.
- Consumers read facts through **one read-only accessor** (`src/utils/clinicalMetadata/accessor.ts`) — never calling the LLM themselves — but only when consumer-reads are flag-enabled.
- **Maturity:** the deterministic regex path is live; the LLM enrichment and consumer reads are **off by default** behind `VITE_ENABLE_CMEA_LLM` and `VITE_ENABLE_CMEA_CONSUMER_READS`.

### Inline voice AI editing (production, default-on; needs live-mic QA)
- "Ask AI to edit selection" via **⌘⌥B**, with spoken or typed instructions. Flow: select text → record/transcribe instruction → LLM rewrite → **accept / reject / rerun** (`server/routes/inlineEdit.ts`, `inlineEditService.ts`, `src/utils/inlineAiEdit/`, `src/services/inlineEditApi.ts`, `styles/inline-ai-edit.css`).
- The `/api/inline-edit` route accepts a larger JSON limit because the transcription sub-route carries base64 audio; transcription reuses the OpenAI transcription provider. Editing is AI-quota gated.
- **Availability:** the Notion editors (`NotionEditor`, `NotionMultiSectionEditor`) via the floating toolbar, and **Verlauf manual entries** via a dedicated bubble toolbar wiring (`verlaufInlineEdit.ts`) — restricted to *editable* manual entries (read-only/derived cards do not expose the trigger).
- **Flag:** enabled by default; disable with `VITE_DISABLE_INLINE_AI_EDIT=true`.

### Discuss-case (Fallbesprechung), Konsil, Consultation (production)
- **Discuss-case** (`src/components/discuss-case/`, `/api/discuss-case`, migrations `2026061x_discuss_case_*`): build a **de-identified case package**, invite participants (token-based invite page), chat (with **message edit/delete** — migration `discuss_case_message_edits`), a document viewer, participant management/revocation, and a **voice panel** (LiveKit). TTL auto-expiry/purge and participant revocation are in the schema.
- **Konsil** (`konsil_schema` migration, `konsilId`/`konsilMode` routing) and **Consultation** (`/api/consultation`, `ConsultantDashboard`, request builder, report review) provide external consultant workflows with their own permissions and de-identification.

### Knowledge Base / Psychopharmacology (production)
- A normalized **Wissensdatenbank** of psychiatric drugs and country-specific preparations, Supabase-backed (`kbNormalizedStore`, migrations `2026061x_kb_*`). Includes: **releases + provenance + contributions** (community wiki edits, discussions/votes), **admin review/publish** (`KbAdminPage`, `kbAdmin` route, `KB_ADMIN_API_ENABLED`/`VITE_KB_ADMIN_ENABLED`), an **LLM seed pipeline** (`seed-psychiatric-drug-kb.ts`, `kbSeedLlm.ts`), **German localization** scripts, percentage-based **receptor affinity (v2)**, and a reading rail. Pharma Q&A and generation routes exist (`/api/pharma-ask`, `/api/pharma-generate`, `prepAiCheck`, `combinationCheck`).

### Settings / Team / Org / Enterprise
- **Settings** (`SettingsPage` + sections): appearance, language, assessment-standard, lab import, patient privacy, KI instructions, workspace, workspace vault, KB admin, AI manager.
- **Team** (`TeamSettingsPage`, `/api/org`, org migrations): organisations, members, role/discipline (therapist role), per-member AI quota, invitations (token-hash), and **org-level case access / vault sharing** with audit logs.
- **Enterprise** (`/api/enterprise`, `EnterpriseDashboard` + sites/compliance/integrations/SSO pages): a multi-site org hierarchy. **Gated behind `VITE_ENABLE_ENTERPRISE_ORG_HIERARCHY`** (default off, both client routes and the server router). The SSO page is an explicit placeholder.

### AI budget / usage tracking (production)
- **Usage logging**: every `callLlm` records to `ai_usage_logs` (migration `ai_usage_budget_tracking`) — token counts, cached/cache-miss split, audio minutes, **estimated cost (USD/EUR)**, provider/model, feature key, latency, success/error. **No PHI** is stored (token counts + feature keys only). Cost estimation lives in `server/ai/usage/` and `server/ai/pricing/modelPricing.ts`.
- **Budget manager UI** (`BudgetManagerPage`, `AiUsageTrackerPanel`, `/api/ai-budget`, `/api/ai-usage`): budget configuration and threshold warnings; per-org/per-member quotas.
- **Credits** (`useCredits.ts`, `CreditsPurchaseDialog`, `creditPricing.ts`, `estimateCredits.ts`): a free signup grant, plan tiers (free/pro, `subscriptionPlans.ts`), and credit estimation/deduction per AI action.

### Notifications
- `NotificationBell` + `useNotifications.ts` provide an in-app notification surface (e.g., for clinical feed events / collaboration). Implementation details beyond the hook were not deeply traced.

### Calendar module (production)
- `CalendarPage`, `DaySchedulePanel`, `CalendarItemModal`, `ActiveAppointmentBar`, `/api/calendar`, `useCalendar*` hooks. Appointments are **encrypted** (migrations `calendar_module` + `calendar_encrypted_payload`; `calendarEncryption.ts`, `calendarKeyStore.ts`). Appointments link back into cases (deep-linking with `?appointment=`), and a documentation timer ties session time to appointments.

### Other notable areas
- **Demo patient system** (`src/demo/`, `demoPatient` route, `demo_patient_canonical` migration, fixture scripts): a canonical pre-Butterfly demo patient is auto-provisioned per user for onboarding/testing (dev-gated dev page).
- **Account backup / zero-knowledge registry** (`accountBackup*`, `passphrase*`, clinical imprint): exportable encrypted backups and passphrase recovery, consistent with the zero-knowledge design.
- **Integrations hub** (`/api/integration`, `IntegrationsPage`, `integration_hub` migration): a scaffold for external system integrations with a case picker.
- **Audit** (`/api/audit`, `AuditDebugPage`, `auditLog.ts`, org audit-log migrations): audit logging with a dev-gated debug viewer.
- **Document templates & export** (`templates/`, `DokumentePage`, `pdfDocument.ts`, `portablePdf.ts`): a documents archive and PDF generation/printing.

---

## 4. Feature Flags & AI Providers

### Feature flags (`src/utils/featureFlags.ts` + others)
- `VITE_ENABLE_CMEA_LLM` — run CMEA Pass B (LLM enrichment) on save. **Default off.**
- `VITE_ENABLE_CMEA_CONSUMER_READS` — let consumers read CMEA facts via the accessor instead of their bespoke LLM routes. **Default off.**
- `VITE_DISABLE_INLINE_AI_EDIT` — disables inline voice AI editing. **Default: enabled** (flag is opt-out).
- `VITE_ENABLE_ENTERPRISE_ORG_HIERARCHY` — enables enterprise routes (client) and `/api/enterprise` (server). **Default off.**
- `VITE_KB_ADMIN_ENABLED` / `KB_ADMIN_API_ENABLED` — KB admin UI/API (dev auto-enables; set explicitly for production admin).
- Plan gating (`planGating.ts`, `subscriptionPlans.ts`): the patient dashboard/overview and full cloud sync are gated to **Pro** and/or permitted privacy regions.

### AI providers & model config
- **DeepSeek** — fast tier (default `deepseek-v4-flash`; legacy `deepseek-chat`/`deepseek-reasoner` aliases retire 2026-07-24); `DEEPSEEK_API_KEY`.
- **Google Gemini** — standard tier (default `gemini-2.5-flash`), called via the OpenAI-compatible endpoint; `GOOGLE_API_KEY`. Env-reroutable to another provider via `STANDARD_PROVIDER`/`STANDARD_MODEL` without a code change.
- **OpenAI** — thorough tier (default `gpt-5.4`) and **transcription** (`gpt-4o-transcribe`) and inline edits; `OPENAI_API_KEY`. An explicit **"Maximum"** opt-in (default `gpt-5.5`) is available per-generation as a model override, not a tier default.
- **Mistral AI** — EU-residency fallback for the fast/standard tiers (`mistral-small-latest`) and available for the thorough tier (`mistral-large-latest`); `MISTRAL_API_KEY`. Used automatically under `LLM_RESIDENCY=eu` when the primary provider is non-EU.
- **Auto-fallback** between vendors when only one key is set (residency-aware — see `server/ai/providerResidency.ts`); **mock mode** when no key is set (deterministic placeholder text + usage logged as `mock: true`).
- Overridable model envs: `OPENAI_THOROUGH_MODEL`, `OPENAI_MAXIMUM_MODEL`, `GOOGLE_STANDARD_MODEL`, `DEEPSEEK_FAST_MODEL`, `MISTRAL_SMALL_MODEL`, `MISTRAL_LARGE_MODEL`, `OPENAI_TRANSCRIBE_MODEL`, plus `*_BASE_URL` overrides.
- **LiveKit** — voice features; reports configured/missing via `/api/health/voice` (non-prod).

---

## 5. Known Caveats / Not-Yet-Done

- **CMEA LLM enrichment & consumer reads are off by default.** Only the deterministic regex pass (Pass A) is live in normal operation; the cost-bearing LLM enrichment (Pass B) and consumer reads require the two `VITE_ENABLE_CMEA_*` flags. Downstream features still use their bespoke LLM routes unless consumer reads are enabled.
- **Inline voice AI editing needs live-mic QA.** The accept/reject/rerun wiring and the transcription path are implemented and unit-tested for the pure helpers, but end-to-end microphone capture → transcription → rewrite warrants manual verification on real audio/devices.
- **Enterprise org hierarchy is a default-off, partially-stubbed area.** Routes are flag-gated, and the **SSO page is an explicit placeholder** (`EnterpriseSsoPlaceholder`).
- **Butterfly criteria coverage is intentionally small (5 disorders) and ships as `status: 'draft'`.** Criteria records are versioned and clinician-reviewable; the registry notes records "ship as draft until reviewed." Output is always advisory and never a diagnosis.
- **De-identification is regex/name-based, not a guarantee.** `discussCaseDeidentify.ts` redacts common identifier patterns + the known patient name; it is a strong safety layer but pattern-based, so unusual identifiers could slip through. The architecture mitigates this by also keeping identifiers in the client-side encrypted vault.
- **Mock mode masks provider behavior.** With no API keys configured, AI features return placeholder text. This is good for offline/dev but means AI quality/cost cannot be assessed without real keys.
- **Integrations hub appears to be a scaffold** — present as routes/UI/migration, but the depth of any specific external integration was not fully traced.
- **Notifications** — surfaced via `NotificationBell`/`useNotifications`, but the full event catalog/backing was not exhaustively traced.

---

### Appendix — Source signals used
- `package.json`, `README.md`, `.env.example`, `git log` (recent features), `supabase/migrations/`.
- Key code: `server/index.ts`, `server/modelTierMapping.ts`, `server/services/llmProvider.ts`, `server/services/butterflyExtract.ts`, `server/services/clinicalMetadataExtract.ts`, `server/services/discussCaseDeidentify.ts`, `server/services/credits.ts`.
- Frontend: `src/App.tsx`, `src/utils/featureFlags.ts`, `src/utils/cryptoVault.ts`, `src/utils/clinicalQuestions/resolution.ts`, `src/utils/clinicalMetadata/accessor.ts`, `src/utils/inlineAiEdit/verlaufInlineEdit.ts`, `src/components/notion/*` (incl. `overview/`), `src/components/landing/LandingPage.tsx`, `src/data/uiTranslations.ts`, `src/data/diagnosisCriteria/index.ts`.
