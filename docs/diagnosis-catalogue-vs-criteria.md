# Diagnosis catalogue vs criterion trees

Psychiatry.Ink treats **diagnosis catalogues** and **criterion trees** as separate concepts. Clinicians can search, select, and store ICD-10-GM and ICD-11 MMS codes independently. Criteria evaluation is optional and never blocks coding.

## Three concepts

| Concept | Purpose | Data location |
|---------|---------|---------------|
| **A. Diagnosis catalogue** | Search, autocomplete, selection, display, export | `diagnosis_catalogues`, `diagnosis_entries`, `diagnosis_synonyms` (Supabase + Prisma SQLite) |
| **B. Criterion trees** | Optional automated criteria check when linked | `src/data/diagnosisCriteria/` (authored TypeScript) |
| **C. Case diagnoses** | Clinician-selected codes on a patient case | Encrypted `diagnosenArchive` (browser local vault) |

## What the catalogue does

- ICD-10-GM psychiatric **F** chapter (BfArM when available; crosswalk fallback)
- ICD-11 MMS **Chapter 06** (mental, behavioural, neurodevelopmental)
- Architecture ready for somatic ICD expansion (`is_somatic`, `scope=somatic`)
- No ICD-10↔ICD-11 mapping required for search or selection
- ICD-11 codes (e.g. `6A20`) selectable without an F-code

## What criterion trees do

- Authored disorder definitions with evaluable criteria groups
- Used by Butterfly / ISDM **only after** a clinician enters a diagnosis
- Linked optionally via `diagnosis_criteria_links` → shows **“Kriterienprüfung verfügbar”** badge
- Missing link → **“Keine automatische Kriterienprüfung verfügbar”** — save is not blocked

## What criterion trees do **not** do

- Do **not** determine catalogue searchability
- Do **not** determine selectability or codability
- Are **not** queried by `GET /api/diagnoses/search`

## API

```
GET /api/diagnoses/search?q=6A20&system=ICD11MMS&scope=psychiatric&limit=12
GET /api/diagnoses/coverage   # dev/admin only
```

Parameters:

- `system`: `ICD10GM`, `ICD11MMS`, `ALL`
- `scope`: `psychiatric`, `somatic`, `all`

## Import pipeline

```bash
npm run db:import-catalogue
```

Steps:

1. `db:build-catalogue` — WHO ICD-11 tabulation Ch06 + BfArM ICD-10-GM F → `prisma/data/diagnosis-catalogue.json`
2. `db:seed-catalogue` — Prisma SQLite tables
3. `db:seed-criteria-links` — optional links from `matchDisorderToCodes` / `DISORDER_CRITERIA`

Supabase: apply migration `20260701000000_diagnosis_catalogue.sql`, then run a Supabase seed (future) or sync from Prisma export.

## Criteria pipeline status (2026-06-20)

| Metric | Before | After |
|--------|--------|-------|
| Native ICD-11 trees | 79 | **134** |
| ICD-11 Ch06 criteria links | 640 / 803 | **646 / 803** |
| Gap-coverage disorders without native tree | 24 | **1** (`tic_disorders` — ICD-11 8A05, chapter 08; deliberate fallback) |
| Substance intoxication/withdrawal/delirium/psychotic without native tree | 32 | **0** |
| Phase C drafts merged | 0 | **12** (LLM-generated `icd11` blocks in `icd11Merged/trees.ts`) |

Pipeline commands:

```bash
npm run criteria:generate-drafts -- --priority=gap --limit=15 --dry-run=false
npm run criteria:merge-drafts
npm run db:seed-criteria-links
```

Phase B factories (`icd11IntoxicationSet`, `icd11WithdrawalSet`, `icd11WithdrawalDeliriumSet`, `icd11PsychoticSet`, `icd11GapFactories`) plus merged Phase C drafts. All criteria remain `status: 'draft'`. Unlinked catalogue entries (~157) still lack disorder modules — `--priority=unlinked` full-disorder generation needs further prompt/normalizer tuning.

## Case diagnosis storage

`DiagnoseEntry` stores:

- `diagnosisEntryId`, `codingSystem`, `catalogueVersion`
- `code` / `displayLabel` in the active coding slot (`icd10` or `icd11`)
- `diagnosisStatus`, `diagnosisRole`, `criteriaAvailable`
- Legacy `icd10` / `icd11` / `dsm` slots retained for backward compatibility

Independent ICD-11 entries set `codingSystem: ICD11MMS` with only `icd11` populated — no silent ICD-10 fallback.

## Somatic expansion (follow-up)

- Import somatic ICD-10 chapters (A–N, excluding F) into `diagnosis_entries` with `is_somatic=true`
- Import non-Ch06 ICD-11 chapters similarly
- Reuse `scope=somatic` filter — schema and API already support it
