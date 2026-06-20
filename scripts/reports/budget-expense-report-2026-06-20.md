# Psychiatry.Ink — AI Expense Report

**Report date:** 2026-06-20  
**Data through:** 2026-06-20 16:29 UTC (last `ai_usage_logs` entry)  
**Currency:** Estimated costs from provider pricing (`server/ai/pricing/modelPricing.ts`, version `2026-06-14`)

---

## Executive summary

| Metric | Value |
|--------|------:|
| **Total estimated spend (EUR)** | **€0.8602** |
| Total estimated spend (USD) | $0.9350 |
| API calls logged | 3,069 |
| Total tokens | 6,598,411 |
| Input / output tokens | 3,809,279 / 2,789,132 |
| Successful calls | 3,069 (100%) |
| Failed calls | 0 |
| Transcription (audio) | 0.0334 min (~2 s) |
| Cost data source | 100% `provider_reported` |
| Tracking period | 2026-06-16 → 2026-06-20 (5 days) |

**Budget limits configured:** None (`ai_budget_configs` is empty). No threshold warnings recorded.

---

## Where budget data lives

### Primary system (production)

| Layer | Location |
|-------|----------|
| **Database** | Supabase tables `ai_usage_logs`, `ai_budget_configs`, `ai_budget_warnings` (migration `supabase/migrations/20260630120000_ai_usage_budget_tracking.sql`) |
| **Recording** | `server/ai/usage/recordAiUsageLog.ts` — called on every LLM/transcription request via `callLlm` |
| **Cost estimation** | `server/ai/usage/estimateCost.ts` + `server/ai/pricing/modelPricing.ts` |
| **Aggregation** | `server/ai/usage/aggregateUsage.ts`, `server/ai/usage/getCurrentUsageForQuota.ts` |
| **API** | `GET /api/ai-usage/summary`, `/breakdown`, `/recent`, `/export` · `GET/POST /api/ai-budget/config`, `/warnings` (`server/routes/aiUsage.ts`) |
| **UI** | `src/components/settings/BudgetManagerPage.tsx` (full dashboard) · `src/components/settings/AiUsageTrackerPanel.tsx` (recent 20 calls in team settings) |
| **Client API** | `src/services/aiUsageApi.ts` |

Data is **not** stored in localStorage. When Supabase is not configured, usage is console-logged only and not persisted.

### Secondary systems (related, not EUR spend)

| System | Purpose |
|--------|---------|
| **Credits / quota** | `server/services/credits.ts`, `server/services/aiQuota.ts` — user credit balance for generation gating (not monetary cost tracking) |
| **Generation log** | `server/routes/generationLog.ts` — document generation lifecycle + credit reservation (no EUR totals) |
| **Script run reports** | `scripts/reports/kb-*-report-*.json` — operational counts for KB seed/translation/PK batch jobs; most runs predate usage logging and do **not** include EUR totals |

### Documentation

- `docs/PRODUCT_OVERVIEW.md` §3 — AI budget / usage tracking overview
- `docs/AUDIT_REPORT.md` §6 — notes on budget enforcement edge cases

---

## Total spend to date

All logged usage falls within **June 2026** and spans **five calendar days** (logging began 2026-06-16).

```
First log:  2026-06-16 17:12 UTC
Last log:   2026-06-20 16:29 UTC
Total EUR:  €0.86017234
Total USD:  $0.93497000
```

---

## Breakdown by feature

Costs are grouped by `feature_key` (see `src/types/aiUsage.ts`).

| Feature key | Human label | Calls | Tokens | Cost (EUR) | % of total |
|-------------|-------------|------:|-------:|-----------:|-----------:|
| `prior_therapies` | Prior therapies AI | 2,766 | 5,901,458 | €0.6704 | 78.0% |
| `kb_pharmacokinetics` | KB pharmacokinetics (batch) | 152 | 246,399 | €0.0483 | 5.6% |
| `criteria_draft_generate` | Diagnostic criteria drafts | 60 | 231,764 | €0.0442 | 5.1% |
| `clinical_intelligence_dimensional` | Clinical Intelligence — dimensional | 2 | 9,889 | €0.0399 | 4.6% |
| `clinical_intelligence_mechanism` | Clinical Intelligence — mechanism | 2 | 9,226 | €0.0322 | 3.7% |
| `butterfly` | Butterfly document extract | 64 | 155,392 | €0.0183 | 2.1% |
| `lab_medication_correlation` | Lab ↔ medication correlation | 3 | 19,043 | €0.0030 | 0.3% |
| `document_generation` | Template document generation | 3 | 9,080 | €0.0012 | 0.1% |
| `medication_combination_check` | Medication combination check | 7 | 6,533 | €0.0011 | 0.1% |
| `ask_butterfly` | Ask Butterfly chat | 4 | 3,160 | €0.0006 | 0.1% |
| `discuss_case_ai` | Discuss-case AI | 2 | 5,409 | €0.0005 | 0.1% |
| `transcription` | Speech transcription | 2 | 0 | €0.0002 | 0.0% |
| `inline_text_edit` | Inline text edit | 2 | 1,058 | €0.0002 | 0.0% |

**Features with zero logged spend in this period:** `anamnesis_generation`, `verlauf_generation`, `arztbrief_generation`, `psychopathologischer_befund`, `kb_seed`, `kb_translation_de`, `prep_ai_check`, `test_generation`, `pharma_generate`, `pharma_ask`, `clinical_metadata_extraction`, `clinical_intelligence_discuss`, and others defined in `AiFeatureKey`.

**Note:** KB seed and German translation batch jobs ran on **2026-06-13–14** (see script reports below) but predate the `ai_usage_logs` table population (first log **2026-06-16**). Their EUR cost is **not** included in the totals above unless duplicated in Supabase under another feature key.

---

## Breakdown by provider / model

| Provider | Model | Calls | Tokens | Cost (EUR) |
|----------|-------|------:|-------:|-----------:|
| deepseek | deepseek-v4-flash | 3,063 | 6,579,296 | €0.7878 |
| openai | gpt-4.1 | 4 | 19,115 | €0.0722 |
| openai | gpt-4o-transcribe | 2 | 0 | €0.0002 |

---

## Breakdown by time period

### Monthly

| Month | Calls | Tokens | Cost (EUR) |
|-------|------:|-------:|-----------:|
| 2026-06 | 3,069 | 6,598,411 | €0.8602 |

*(Only one month with data.)*

### Weekly (ISO week, UTC)

| Week starting | Calls | Tokens | Cost (EUR) |
|---------------|------:|-------:|-----------:|
| 2026-06-15 | 3,069 | 6,598,411 | €0.8602 |

### Daily

| Date | Calls | Tokens | Cost (EUR) |
|------|------:|-------:|-----------:|
| 2026-06-16 | 41 | 105,357 | €0.0137 |
| 2026-06-17 | 1,926 | 3,486,256 | €0.4183 |
| 2026-06-18 | 199 | 445,382 | €0.0565 |
| 2026-06-19 | 783 | 2,167,541 | €0.2372 |
| 2026-06-20 | 120 | 393,875 | €0.1345 |

Peak day: **2026-06-17** (€0.42, driven mainly by `prior_therapies`).

---

## Organisation attribution

| Organisation ID | Calls | Cost (EUR) | Notes |
|-----------------|------:|-----------:|-------|
| `9ee3eb84-f573-49f5-a9ba-d4660ad83b16` | 2,779 | €0.6696 | Primary org-attributed usage |
| *(null)* | 290 | €0.1906 | Batch/script calls without org context |

Null-org calls by feature: `kb_pharmacokinetics` (152), `criteria_draft_generate` (60), `clinical_intelligence_*` (4), `prior_therapies` (74). See `docs/AUDIT_REPORT.md` for known under-attribution in some AI services.

---

## Budget limits vs actual spend

| Setting | Value |
|---------|-------|
| Monthly budget (EUR) | **Not configured** |
| Monthly budget (USD) | **Not configured** |
| Hard limit | **Disabled** |
| Warnings (50% / 80% / 100%) | No rows in `ai_budget_warnings` |
| June 2026 spend vs budget | N/A — no budget set |

Configure limits in **Settings → KI-Budget & Token-Nutzung** (`BudgetManagerPage`) or via `POST /api/ai-budget/config`.

---

## Script run reports (`scripts/reports/`)

These JSON files track **operational outcomes**, not EUR. They supplement the Supabase ledger for batch-job history.

### KB seed (`kb-seed-report-*.json`)

| Run (UTC) | Total | Success | Skipped | Failed |
|-----------|------:|--------:|--------:|-------:|
| 2026-06-13 20:13 | 1 | 0 | 1 | 0 |
| 2026-06-13 20:35 | 1 | 1 | 0 | 0 |
| 2026-06-13 20:40 | 10 | 8 | 2 | 0 |
| 2026-06-13 20:40 | 1 | 1 | 0 | 0 |
| 2026-06-13 20:41 | 10 | 0 | 10 | 0 |
| 2026-06-13 21:45 | 150 | 48 | 102 | 0 |

### KB pharmacokinetics (`kb-pk-report-*.json`)

| Run (UTC) | Total | Success | Skipped | Failed |
|-----------|------:|--------:|--------:|-------:|
| 2026-06-19 07:38 | 150 | 0 | 150 | 0 |
| 2026-06-19 07:38 | 1 | 1 | 0 | 0 |
| 2026-06-19 08:19 | 150 | 149 | 1 | 0 |

The 2026-06-19 PK batch aligns with **152** `kb_pharmacokinetics` rows in `ai_usage_logs` (€0.0483).

### KB German translation (`kb-translation-report-*.json`)

| Report | Substances | Translated | Fields translated | Failed |
|--------|----------:|-----------:|------------------:|-------:|
| 1781444494259 | — | — | — | — |
| 1781444561188 | — | — | — | — |
| 1781445962646 | — | — | — | — |
| 1781446605489 | 150 | 150 | 1,280 | 0 |

Translation runs on **2026-06-14**; no `kb_translation_de` feature rows in `ai_usage_logs` (logging not active yet).

---

## How to refresh this report

1. **UI:** Open Budget Manager → export CSV/JSON (`/api/ai-usage/export?format=csv|json`).
2. **API:** `GET /api/ai-usage/summary?month=YYYY-MM` and `/breakdown?dimension=feature|provider|model|user`.
3. **Database:** Query `ai_usage_logs` (same schema as migration above).
4. **Re-run this report:** Aggregate Supabase `ai_usage_logs` through the desired end date; do not extrapolate costs from script JSON unless `usageSummary` with token counts is present (newer translation script versions write this, but committed reports do not include EUR).

---

## Data quality notes

- All costs are **estimates** derived from provider token/minute pricing, stored at log time.
- **100%** of rows used `provider_reported` token counts (not character-based estimates).
- Usage logging started **2026-06-16**; earlier KB batch work is visible in script reports only.
- **290 calls (9.5%)** lack `organisation_id` and may be excluded from org budget rollups until services pass `resolveUsageContextFromRequest`.
- Credits consumed (`creditBalance` in app DB) are a separate quota mechanism and are **not** converted to EUR in this report.

---

*Generated from live Supabase `ai_usage_logs` query on 2026-06-20 and committed files under `scripts/reports/`.*
