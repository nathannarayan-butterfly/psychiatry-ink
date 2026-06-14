# Butterfly.ink Audit v2 (Supplemental)

| Field | Value |
|-------|-------|
| **Date** | 2026-06-14 |
| **Version** | 0.1.0 |
| **Auditor** | AI-assisted (Cursor Agent) |
| **Workspace** | `/home/nathan-narayan/Projects/psychiatry-ink` |
| **Supersedes** | No — **extends** `butterfly-ink-audit-2026-06-14.md` (v1) |
| **Focus** | Data-layer language consistency + fine-grained tag/space polish (the gaps v1 missed) |

> This is a **supplemental** report. All v1 P0/P1 findings remain valid. v2 adds findings v1 overlooked, primarily **language mixing in the database/data layer** and **tag/badge space efficiency**.

---

## What v1 missed (focus)

v1 graded "UX / design polish" and "AI API (language)" as essentially **pass**, and never inspected the **actual database rows**. Two whole classes of problems were therefore invisible:

1. **Language mixing in data, not just UI strings.** v1 verified `clinicalApiFetch` sends `Accept-Language` and that *new* code paths enforce German. It did **not** check what language the *stored knowledge base content* is in. It turns out the bulk KB (150 substances + ~3,400 child rows) is **entirely English**, served inside a **German-first** product. English side-effect names and frequencies render **raw** in the German medication UI.
2. **Fine-grained tag/badge space efficiency.** v1 applied 3 layout fixes to demo chips/banners but never audited the ~20 independent badge/chip/pill classes, which use inconsistent padding (0.05–0.32rem vertical, mixed `em`/`rem`) with no shared compact primitive.

Method this round: queried the live Supabase project via MCP (`list_tables`, `execute_sql`), scanned local seed/fixture/i18n files, and grepped every `*.css` badge rule.

---

## Language Consistency Findings

Evidence gathered from live Supabase rows (English-marker regex over German-first content fields) and local data files.

| # | Location | Mixed langs | Evidence / example | Severity | Fixed? |
|---|----------|-------------|--------------------|----------|--------|
| **L-001** | `kb_substances` clinical prose (150 rows) | EN content in DE product | `mechanism_summary` 146/150, `clinical_pearls` 150/150, `pharmacodynamic_profile` 150/150 match English markers. e.g. Clozapine: *"Clozapine is a multi-receptor antagonist…"*, pearls *"In Germany, mandatory blood monitoring…"* (English written **for** a German audience) | **Critical** | No (documented) |
| **L-002** | `kb_side_effects` (1,536), `kb_monitoring_recommendations` (559), `kb_interaction_notes` (574), `kb_dosage_guidance` (233) | EN content in DE product | `side_effects.effect` 396 EN (e.g. "Dry mouth", "Dizziness", "Seizures") rendered **raw** in `SideEffectHeatmap.tsx:95`; `frequency` is free-text EN ("very common", "common at high doses"); `monitoring.rationale` 440/559 EN; `interaction.clinical_management` 414/574 EN; `dosage.titration_notes` 210/232 EN ("Use lower target range; monitor renal function…") | **Critical** | No (documented) |
| **L-003** | Substance naming across 3 KB stores | EN vs DE drug names | `kb_substances` uses English INN ("Clozapine", "Olanzapine", "Lithium carbonate"); legacy `knowledge_base_drugs` holds **both** "Clozapin" (status=active, 7 rows) **and** "Clozapine" (status=null, 150 rows) → duplicate-language rows (Aripiprazol/Aripiprazole, Clozapin/Clozapine). Local `psychiatric-drug-seed-list.ts` = English; `medicationLabCorrelationSeed.ts` = German (`substanceId: 'clozapin'`). Cross-store `substanceId` mismatch risk. | **Major** | No (documented) |
| **L-004** | `src/data/uiTranslations.ts` | DE label left in EN | `timelineCreator` ("Timeline Creator"), `labVisualisation` ("Lab Visualisation"), `integrationsFhirEndpoint` ("Endpoint URL") had `de === en` | **Minor** | **Yes** |

**Mixed-language locations found: 4 classes** spanning **~3,400+ English DB rows** in a German UI, plus 3 untranslated UI keys (fixed).

### What is *consistent* (verified clean)
- **Demo fixture** (`src/demo/demoPatient.fixture.json`): consistently German. Only English tokens are JSON keys/enums (`status`, `source`, `changeType:"increased"`). `status:"vidert"` is an intentional `BefundStatus` enum (`src/types/befund.ts`), not a typo.
- **`uiTranslations.ts`**: 1,214 keys, **0 missing German**, only 3 untranslated multiword labels (now fixed).
- **`medicationUiTranslations.ts`**: 134 keys, fully translated.
- **`receptorProfile.ts`**, **`medicationLabCorrelationSeed.ts`**: clean German content (LocaleMap-based).
- **Org/config data** (`org_organisations.name` = "Persönlicher Arbeitsbereich"): German.

### Why this is the main finding
The product UI, demo data, and curated seeds are German-first and correct. The **bulk knowledge base that backs the medication intelligence features is English**, AI-seeded, and surfaces untranslated into the German UI (side-effect heatmap, monitoring, interactions). This is exactly the "German + English mixed in seed data / KB entries" the user reported and v1 missed. It is **not** a small fix: re-translating 150 substances of clinical content requires clinical review and must not be machine-translated silently.

---

## Tag / Space Efficiency Findings + fixes

**Audit:** ~20 distinct badge/chip/pill/tag classes exist with **no shared primitive**. Padding is inconsistent and mixes units:

- Established compact baseline (good): `patient-case-card__chip` `0.125rem 0.4375rem`, `kb-entry__tag` `0.125rem 0.375rem`, `medication-interaction__badge` `0.05rem 0.45rem`.
- Over-padded outliers (wasting space) vs that baseline: `consultation-badge` `0.125rem 0.5rem`, `befund-status-pill` `0.15rem 0.5rem`, `dokumente-badge` `0.15em 0.55em`, `labor-ki-reanalysis__saved-badge` `0.25rem 0.5rem`, `demo-dev-badge` `0.2rem 0.5rem` (internal dev page).
- Interactive tap-target chips intentionally larger and **left unchanged**: `therapy-chip` `0.3rem 0.75rem`, `verlauf-filter__chip` `0.32em 0.7em`.

**Fixes applied** (tightened to the compact baseline, no structural redesign):

| File | Class | Before | After |
|------|-------|--------|-------|
| `src/styles/consultation.css` | `.consultation-badge` | `0.125rem 0.5rem` | `0.125rem 0.4rem` |
| `src/styles/diagnostik-befunde.css` | `.befund-status-pill` | `0.15rem 0.5rem` | `0.125rem 0.4rem` |
| `src/styles/notion-preview.css` | `.dokumente-badge` | `0.15em 0.55em` | `0.125em 0.45em` |
| `src/styles/notion-preview.css` | `.labor-ki-reanalysis__saved-badge` | `0.25rem 0.5rem` | `0.15rem 0.4rem` |

**Recommendation (not auto-applied — needs markup touch):** introduce a shared `.tag` / `.badge--compact` utility (e.g. `padding: 0.125rem 0.4rem; font-size: 0.68rem; border-radius: 4px;`) in `clinical-ui.css` and migrate the one-off badge classes to it for consistency.

---

## New Critical / Major Issues

| ID | Severity | Issue | Refs |
|----|----------|-------|------|
| **V2-C1** | **Critical** | German-first product serves an **English** knowledge base (L-001 + L-002). English side-effect names, frequencies, monitoring rationales, interactions, dosage notes render in the German clinical UI. Affects medication intelligence credibility for German clinicians/sales. | `kb_substances`, `kb_side_effects`, `kb_monitoring_recommendations`, `kb_interaction_notes`, `kb_dosage_guidance`, `SideEffectHeatmap.tsx` |
| **V2-M1** | **Major** | KB substance **naming + duplication** inconsistency across three stores (English INN vs German names; legacy table holds both-language duplicate rows). Risk of duplicate display and `substanceId` join mismatches between Supabase KB and the German local correlation seed. | `kb_substances`, `knowledge_base_drugs`, `psychiatric-drug-seed-list.ts`, `medicationLabCorrelationSeed.ts` |
| **V2-m1** | Minor | No shared compact tag/badge primitive; ~20 one-off badge classes with inconsistent padding/units. | `src/styles/*.css` |

All **v1 P0-001…P0-003 and P1-001…P1-012 remain open and valid.**

---

## Small Fixes Applied (file refs)

| ID | Fix | File |
|----|-----|------|
| V2-FIX-001 | `timelineCreator` German label `Timeline Creator` → `Zeitstrahl` (+fr/es translated) | `src/data/uiTranslations.ts:635` |
| V2-FIX-002 | `labVisualisation` `Lab Visualisation` → `Laborvisualisierung` (+fr/es) | `src/data/uiTranslations.ts:641` |
| V2-FIX-003 | `integrationsFhirEndpoint` German `Endpoint URL` → `Endpunkt-URL` | `src/data/uiTranslations.ts:7235` |
| V2-FIX-004 | `.consultation-badge` padding tightened | `src/styles/consultation.css` |
| V2-FIX-005 | `.befund-status-pill` padding tightened | `src/styles/diagnostik-befunde.css` |
| V2-FIX-006 | `.dokumente-badge` padding tightened | `src/styles/notion-preview.css` |
| V2-FIX-007 | `.labor-ki-reanalysis__saved-badge` padding tightened | `src/styles/notion-preview.css` |

---

## Build / Test Results

```
npm run build  → exit 0 (only pre-existing chunk-size + dynamic-import warnings)
npm test       → exit 0 (3 files, 17/17 tests)
```

- TypeScript `tsc -b` succeeds. No new errors from v2 edits.
- Note: under the sandbox, `vitest` worker teardown can emit a spurious `kill EACCES` unhandled rejection; running unsandboxed shows a clean 17/17 pass.

---

## Updated Recommendations

Priority additions on top of v1's list:

1. **(V2-C1) Localize the knowledge base to German**, or store **both** `*_de` and `*_en` content and select by `Accept-Language`. Do **not** machine-translate clinical content without clinical review. Track per-field translation status in `kb_field_provenance`/`review_status`.
2. **(V2-C1) Stopgap:** until KB is localized, hide or clearly flag English KB content in the German UI (e.g. an "EN-Quelle / Übersetzung ausstehend" badge) so English text isn't presented as native German clinical guidance.
3. **(V2-M1) Reconcile the KB stores:** pick one canonical substance-naming scheme (recommend German display name + stable language-neutral `substanceId`), de-duplicate the legacy `knowledge_base_drugs` German/English rows, and align `psychiatric-drug-seed-list.ts` / `medicationLabCorrelationSeed.ts` keys.
4. **(V2-C1) Translate the `frequency` enum** to a controlled vocabulary mapped to `SideEffectFrequency` (the UI already has `freqVeryCommon`…), instead of free-text English strings.
5. **(V2-m1) Add a shared compact `.tag` primitive** and migrate one-off badges to it.
6. Add an **i18n lint/CI check**: fail when `de === en` for multiword `uiTranslations` entries (excluding an allowlist of proper nouns/acronyms), and a DB content-language check in the KB seed pipeline.

---

## Appendix: Commands / Queries Run

```bash
cd /home/nathan-narayan/Projects/psychiatry-ink
npm run build
npm test
```

Supabase MCP (`user-supabase`):
```sql
-- language-marker scan over German-first KB fields
SELECT count(*) FILTER (WHERE mechanism_summary ~* '\m(the|and|with|for|patient|...)\M') ... FROM kb_substances;
-- sample rows, frequency distinct values, legacy table status split, org name
```

### Export paths
- Markdown: `docs/audit/butterfly-ink-audit-v2-2026-06-14.md`
- JSON: `docs/audit/butterfly-ink-audit-v2-2026-06-14.json`
- Script: `scripts/export-audit-report.ts --v2` (`--json` / `--md`)
