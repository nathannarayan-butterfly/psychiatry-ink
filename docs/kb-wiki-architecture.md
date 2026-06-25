# psychopharmacology.wiki ↔ Psychiatry.ink KB Architecture

This document describes how collaborative wiki editing on **psychopharmacology.wiki** feeds versioned, read-only knowledge into the **Psychiatry.ink** clinical app.

See also: [kb-dual-model.md](./kb-dual-model.md) (JSONB vs normalized tables during transition).

## Principle

| System | Role |
|--------|------|
| **psychopharmacology.wiki** | Collaborative editing and community review (future dedicated frontend) |
| **Psychiatry.ink** | Clinical app consuming **published, read-only** knowledge only |
| **Constraint** | Psychiatry.ink must **not** depend on unstable live community edits |

## Data flow

```
1. AI seed → draft profiles (kb_substances, status=ai_draft)
2. Users suggest edits → kb_contributions (NOT direct publish)
3. Every community edit = proposed contribution (pending)
4. Admin review → accept / modify / reject
5. Accepted changes → canonical kb_* tables (kb_substances + children)
6. Periodic versioned release → kb_releases (e.g. 2026.06.1)
7. Psychiatry.ink pulls latest published release (or selected stable version)
   → projection to knowledge_base_drugs JSONB with kbReleaseVersion stamp
```

## Tables (foundation)

### `kb_releases`

Versioned snapshots consumed by Psychiatry.ink.

| Column | Purpose |
|--------|---------|
| `version_label` | e.g. `2026.06.1` |
| `source` | e.g. `psychopharmacology.wiki` |
| `published_at` | Release publication time |
| `synced_at` | Last sync into Psychiatry.ink projections |
| `is_current` | One row marked current for clinician UI |
| `snapshot_metadata` | Optional counts/checksums (full export deferred) |

Initial seed: `2026.06.1`, synced `2026-06-14`, `is_current=true`.

### `kb_field_provenance`

Field-level source tracking for normalized substances.

| Column | Purpose |
|--------|---------|
| `substance_id` | FK to `kb_substances` |
| `field_path` | e.g. `mechanismSummary`, `receptorAffinities.D2.action` |
| `value_snapshot` | JSONB snapshot at write time |
| `source_type` | `ai_draft`, `user_contribution`, `fachinformation`, `fda_label`, `stahl`, `guideline`, `literature`, `curated`, `unknown` |
| `contribution_id` | Optional FK when sourced from accepted contribution |

AI seed writes provenance for mechanism + receptor fields with `source_type=ai_draft`.

### `kb_contributions` + `kb_contribution_reviews`

Community edit queue. **No direct publish** from contributions.

| `contribution_type` | Proposed change |
|---------------------|-----------------|
| `edit_field` | Single field patch |
| `add_drug` | New substance (substance_id null) |
| `add_receptor`, `add_side_effect`, … | Structured child rows |

Status: `pending` → `accepted` | `rejected` | `modified`.

RLS (dev): insert for anon/authenticated with `license_accepted=true`; admin lists via `/api/kb-admin/contributions`.

### Psychiatry.ink consumption

Clinician UI (`KnowledgeBasePharma`) reads:

- `knowledge_base_drugs` JSONB (projected monographs)
- `kb_releases` current row (version metadata strip)
- **Not** live `kb_contributions` or draft `kb_substances`

Projected drugs carry:

- `kbReleaseVersion` — e.g. `2026.06.1`
- `kbReleaseSyncedAt` — ISO sync timestamp

Section-level `fieldProvenance` hints (lightweight) may be embedded on projection for future UI.

## API stubs

| Route | Purpose |
|-------|---------|
| `POST /api/kb-contributions` | Submit community contribution |
| `GET /api/kb-contributions/contributors?substanceId=` | Accepted contributor names (public) |
| `GET /api/kb-admin/contributions` | List pending (admin) |
| `GET/POST /api/kb-admin/discussions` | Admin discussion thread |
| `GET/POST /api/kb-admin/contributions/:id/votes` | Vote summary / cast vote |
| `POST /api/kb-admin/contributions/:id/publish` | Apply + publish after vote threshold |
| `POST /api/kb-admin/contributions/:id/reject` | Reject with notes |

Client hook: `useKbCurrentRelease()` reads current release from Supabase.

### KB access model

There is no per-user/per-org "KB admin" tier. Any authenticated user may **edit**
KB content and **report** issues. The sole elevated role over the global KB is the
platform **System Admin**, which gates destructive/global operations (publish,
approve, archive, contribution review):

| Layer | Mechanism |
|-------|-----------|
| Edit / report (any user) | Verified Supabase identity (`req.authUserId`); contributions via `POST /api/kb-contributions` (incl. `report_issue`) |
| System Admin (server API) | `SYSTEM_ADMIN_USER_IDS` (comma UUIDs/emails) matched against the verified `req.authUserId` — the legacy spoofable `X-KB-User-Id` header is never trusted |
| Client UI hint | `VITE_SYSTEM_ADMIN_USER_IDS`, Supabase `app_metadata.system_admin=true`, or Settings → **System Admin** local allowlist (`psychiatry-ink:system-admin-users`) — UX only; access is enforced server-side |
| Dev fallback | If no allowlist configured, non-prod permits local users (prod denies) |

### Voting

- `KB_ADMIN_APPROVAL_THRESHOLD` (default **2** in production, **1** in dev)
- Publish enabled when `approve >= threshold` and `reject === 0`
- Tables: `kb_contribution_discussions`, `kb_contribution_votes`

## Licensing

Community contributors accept license on submit (`license_accepted=true`). Displayed in Psychopharmacologie footer (DE primary + EN in `uiTranslations`).

## Personal clinician drug database (deferred)

Future: per-user fork after individual clinical verification. Documented stub only — shared KB remains canonical seed + community-reviewed content until personal DB ships.

## Deferred

- Full psychopharmacology.wiki frontend
- Per-field provenance UI in edit mode
- Automated release export pipeline (full snapshot)
- Bi-directional sync normalized ↔ clinician JSONB edits
- Tightened RLS (`is_kb_editor()` for contribution reads)

## Next steps for wiki split

1. **psychopharmacology.wiki** SPA: contribution form → `POST /api/kb-contributions`
2. Admin accept flow: contribution → patch `kb_substances` + provenance rows
3. Release job: bump `kb_releases`, re-project all published substances
4. Psychiatry.ink: optional pinned release (not only `is_current`)
5. Remove dev RLS relaxation; gate contribution reads to editors
