# Wissensdatenbank — Dual Model Coexistence

> **Wiki split architecture:** see [kb-wiki-architecture.md](./kb-wiki-architecture.md) for psychopharmacology.wiki ↔ Psychiatry.ink releases, contributions queue, and provenance.

This repo currently runs **two** KB persistence models in parallel during transition.

## Legacy JSONB model (existing UI)

| Table | API / hooks | Purpose |
|-------|-------------|---------|
| `public.knowledge_base_drugs` | `knowledgeBaseDrugsApi.ts`, `useKnowledgeBaseDrugs.ts` | Full `KnowledgeBaseDrug` monograph blob (sections, structured PK/titration, receptor v2) |
| `public.knowledge_base_preparations` | `knowledgeBasePreparationsApi.ts`, `useMedicationMarketAvailability.ts` | Country-specific preparations as JSONB |

**Used by:** Dashboard Wissensdatenbank tile → `KnowledgeBasePharma.tsx` (clinician-facing monograph editor/reader).

**RLS (dev/MVP):** Public SELECT; INSERT/UPDATE/DELETE allowed for anon + authenticated (no `kb_admin` claim required). **Will tighten** when auth hierarchy lands.

## Normalized relational model (new)

| Tables | API / scripts | Purpose |
|--------|---------------|---------|
| `kb_substances` + child tables | `kbNormalizedStore.ts`, seed script, `/api/kb-admin` | AI batch seed → review → publish pipeline |
| `kb_ai_generations` | seed script | Raw LLM responses + validation audit |
| `kb_revision_history` | seed script, admin API | Change log |

**Used by:** `scripts/seed-psychiatric-drug-kb.ts`, `/dashboard/kb-admin` (admin batch review MVP).

**RLS (dev/MVP):**
- **SELECT:** all rows (including `ai_draft`) readable by anon + authenticated
- **WRITE:** service role only (seed script + `/api/kb-admin` bypass RLS)
- No `is_kb_editor()` / `kb_admin` JWT claim required for dev workflow

**AI draft stamps** (set by seed on insert):
- `status = ai_draft`
- `review_status = unreviewed`
- `needs_clinical_review = true`
- `source_quality = ai_generated_unverified`

## Relationship

```
Seed list (150 drugs)
    → DeepSeek (1 call/drug)
    → Zod validate
    → kb_substances + normalized children (service_role upsert)
    → Admin review (/dashboard/kb-admin via /api/kb-admin)
    → publish (status=published, review_status=approved, needs_clinical_review stays true)
    → project/sync → knowledge_base_drugs JSONB (one-way, on publish via /api/kb-admin)
```

On **Publish**, the server maps the normalized profile into a `KnowledgeBaseDrug` JSONB blob and upserts `knowledge_base_drugs`. The projection stamps `kbReleaseVersion` and `kbReleaseSyncedAt` from the current `kb_releases` row. Clinicians then see it in **Psychopharmacologie** (`KnowledgeBasePharma`) via the existing `useKnowledgeBaseDrugs` hook — no frontend read of `kb_substances`.

**Publish semantics (dev vs release UX):**

| Field | On publish | UI meaning |
|-------|------------|------------|
| `status` | `published` | Visible in Psychopharmacologie (not hidden as `ai_draft`) |
| `review_status` | `approved` | Passes admin publish gate / projection |
| `needs_clinical_review` | stays `true` | Badge **„Klinische Prüfung empfohlen“** — clinician should verify before relying |
| `verificationStatus` (JSONB) | `reviewed` | Shown as approved in monograph metadata |
| `needsClinicalReview` (JSONB) | `true` | Same badge signal in Psychopharmacologie |

Clinicians can always edit projected monographs (community editable). Clearing `needs_clinical_review` on the normalized row (future admin action) will re-project without the badge.

## Shared KB vs personal clinician database (future)

The **shared KB** ships as canonical AI seed content: every drug is visible after publish, but marked **review needed** until a clinician verifies it for their own practice.

**Future model (not built yet):**

- Shared store = canonical seed + community edits in `knowledge_base_drugs`
- Personal/user store = drugs the clinician actually prescribes, copied or forked after individual review
- MVP today: all published shared drugs + badge; no per-user DB (localStorage or Supabase table deferred)
- Only medications a clinician commonly uses need individual review; others can stay in shared KB unread

**Edit path (MVP):** clinician edits in Psychopharmacologie write back to `knowledge_base_drugs` only. Re-publishing from admin overwrites the JSONB projection. Bi-directional sync is deferred.

The normalized model is the **source of truth for AI seeding and clinical review**. The JSONB model remains the **live clinician monograph UI** until a sync/export step maps normalized rows into `KnowledgeBaseDrug` sections.

### Field mapping (conceptual)

| Normalized | Legacy JSONB |
|------------|--------------|
| `kb_substances.mechanism_summary` | section `wirkmechanismus` |
| `kb_receptor_affinities` | `receptorAffinityProfile[]` |
| `kb_dosage_guidance` | section `dosierung` / structured `titration` |
| `kb_side_effects` | section `nebenwirkungen` / structured `sideEffects` |
| `kb_country_preparations` | `knowledge_base_preparations` |
| `kb_substance_trade_names` | `brandNames[]` |

## Safety

- **No patient data** in `kb_*` tables — reusable psychiatric medication knowledge only.
- `SUPABASE_SERVICE_ROLE_KEY` is **server-side only** (`.env.local`, never `VITE_*`).
- User-facing KB (`KnowledgeBasePharma`) does **not** read `kb_substances` drafts; it uses legacy JSONB.
- Only `published` + `approved` profiles should appear as clinical truth in the monograph UI.
- AI drafts show badge **"AI draft – not clinically reviewed"** in admin UI.

## Dev workflow

```bash
# Seed one drug (verify)
npm run kb:seed:psychiatric-drugs -- --drug=Haloperidol --dry-run=false

# Batch seed
npm run kb:seed:psychiatric-drugs -- --limit=150 --dry-run=false

# Publish all seeded substances to Psychopharmacologie (after seed or standalone)
npm run kb:publish-all
npm run kb:seed:psychiatric-drugs -- --dry-run=false --publish-all

# Admin UI (dev auto-enabled)
npm run dev          # Vite
npm run dev:server   # API on :3001 with SUPABASE_SERVICE_ROLE_KEY
# → /dashboard/kb-admin
```

Rerun enrichment for one drug: `--drug=Name --dry-run=false --rerun`

## Deferred

- Bi-directional sync normalized ↔ JSONB (clinician edits stay in JSONB for now)
- Rerun enrichment from admin UI (HTTP trigger; CLI documented today)
- Full auth hierarchy (`kb_admin` claim management UI) + tightened RLS
- Official DE PZN / market import into `kb_country_preparations`
