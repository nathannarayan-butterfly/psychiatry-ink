# Database Migration Policy

**Status:** Authoritative · **Audience:** every engineer and CI pipeline that touches the database · **Enforced by:** `npm run db:check` (see [scripts/db-check.ts](../scripts/db-check.ts)) and `.github/workflows/db-check.yml`.

This project ships **two** schema-management systems. Running both as if each owns production causes schema drift across dev / staging / prod. This document removes that ambiguity.

---

## 1. The single production authority

> **Supabase SQL migrations (`supabase/migrations/*.sql`) are the ONE source of truth for the production database schema.**

The deployed database is **Supabase Postgres**. It owns:

- All production tables (org, konsil, discuss-case, calendar, integration hub, demo canonical, KB normalized schema, etc.)
- **Row Level Security (RLS) policies**
- **Auth policies** and GoTrue-related grants
- **Indexes, triggers, SQL functions, constraints, TTL/purge jobs**

If a schema object must exist in production, it **must** be expressed as a Supabase SQL migration. There is no other path to production schema change.

## 2. Prisma's role: client/typing only

Prisma is used **only** as a local ORM and type generator:

- `prisma/schema.prisma` targets **local SQLite** (`provider = "sqlite"`, `DATABASE_URL="file:./dev.db"`).
- Prisma generates the typed client (`@prisma/client`) consumed by the Express API (`server/`) and scripts.
- Prisma models cover the **local-only / metadata** surface (e.g. `GenerationLog`, `CreditBalance`, `PatientCase`, `EncryptedWorkspaceSnapshot`, `DiagnosisCode`). These are deliberately a *subset* of the production Supabase schema.

> **Prisma must NEVER silently mutate the production schema.**
> Prisma and Supabase are different engines (SQLite vs Postgres). The Prisma schema is **not** a complete mirror of production and is not intended to be.

## 3. Forbidden in production

The following commands are **FORBIDDEN** against any staging or production (Supabase/Postgres) database:

| Command | Why it is forbidden |
|---------|---------------------|
| `prisma migrate deploy` | Would let Prisma apply migrations to production, bypassing Supabase as source of truth. **Not chosen for this project.** |
| `prisma db push` (against prod) | Force-syncs schema with no migration history — destructive drift. |
| `prisma migrate dev` (against prod) | Dev-only; can reset/destroy data. |
| `prisma migrate reset` (against prod) | **Drops and recreates** the database. |
| Running Prisma + Supabase migrations together in one deploy step | Double-applies / conflicts → drift. |

`prisma migrate deploy` is gated behind an explicit opt-in: it will only ever run if `ALLOW_PRISMA_PROD_MIGRATE=true` is set **and** the team has consciously decided to change this policy. `db:check` fails the build if a deploy/build script invokes `prisma migrate deploy` without that flag.

## 4. Local development workflow

```bash
cp .env.example .env          # if needed (DATABASE_URL="file:./dev.db")
npm install                   # runs postinstall: prisma generate (generate only — safe)
npm run db:migrate            # apply Prisma migrations to LOCAL SQLite (prisma migrate dev)
npm run db:generate           # regenerate Prisma client after schema edits
npm run db:check              # structural migration sanity check (no DB needed)
npm run db:smoke              # optional: local SQLite connection smoke test (needs dev.db)
```

These commands are **safe** because they target the local SQLite file only.

### Working on the production (Supabase) schema

1. Author a new SQL migration under `supabase/migrations/` using the Supabase timestamp convention:
   `YYYYMMDDHHMMSS_short_description.sql` (14-digit UTC timestamp prefix).
2. The timestamp prefix (the "version") **must be unique** across all migration files.
3. Apply via the Supabase tooling (CLI / dashboard / your team's deploy pipeline) — **never** via Prisma.
4. Include RLS, grants, indexes, triggers, and functions in that same migration.
5. Run `npm run db:check` to confirm filenames are well-formed and versions are unique.

## 5. Keeping the Prisma schema aligned with Supabase

Because Prisma covers only the local-metadata subset, alignment is a **manual, deliberate** process — never automatic against production:

- When a production table also needs a local Prisma representation, **hand-edit `prisma/schema.prisma`** to mirror the relevant columns, then `npm run db:migrate -- --name <change>` to update local SQLite.
- If you ever want to inspect a live schema, use **introspection against a throwaway/local copy** (`prisma db pull`) — never point introspection writes at production.
- Treat any divergence between a Supabase migration and the Prisma model for the *same* table as a code-review checklist item, not an automated sync.

## 6. CI enforcement

`.github/workflows/db-check.yml` runs `npm run db:check` on every push / PR. The check is **structural** and needs **no live database**, so it runs offline in CI:

- Prisma schema parses (`prisma validate`).
- Supabase migrations are present, well-named, and ordered, with **unique version prefixes**.
- No deploy/build script runs `prisma migrate deploy` without `ALLOW_PRISMA_PROD_MIGRATE=true`.
- DB-connected drift checks are **skipped gracefully** when no `DATABASE_URL` / Supabase env is reachable.

The build **fails** on any structural violation.

## 7. Known findings (tracked)

- **Duplicate Supabase migration version prefixes** exist from concurrent development:
  - `20260621000000_org_audit_logs_extend.sql` and `20260621000000_org_case_access_unique.sql`
  - `20260622000000_enterprise_org_hierarchy.sql` and `20260622000000_case_access_owner_and_module_comment.sql`

  Supabase tracks applied migrations by their version (timestamp prefix), so duplicate versions risk a tracking collision. These files **must not be rewritten unilaterally** (other tables/migrations may depend on their current names and ordering). The fix is a **coordinated rename** to unique timestamps, applied in lockstep across dev/staging/prod migration history. Until then, `db:check` surfaces these as a loud warning.
