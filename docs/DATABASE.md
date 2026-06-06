# Local database (SQLite + Prisma)

Psychiatry.ink uses **SQLite** locally via **Prisma ORM**. This project is **Vite + React** (not Next.js). Prisma runs in **Node only** — the Express API (`server/`) and scripts — never in the browser bundle.

## Quick start

```bash
cp .env.example .env          # if needed
npm install
npm run db:migrate            # apply migrations (dev)
npm run db:generate           # generate Prisma Client
npm run db:check              # verify connection
```

Database file: `prisma/dev.db` (gitignored; path is relative to `prisma/schema.prisma`).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev:server` | Start API on port 3001 (generation logging) |
| `npm run dev` | Start Vite dev server (proxies `/api` → API) |
| `npm run db:migrate` | Create/apply migrations (`prisma migrate dev`) — **preferred** |
| `npm run db:push` | Push schema without migration files (prototyping only) |
| `npm run db:generate` | Regenerate client after schema changes |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run db:check` | Connection smoke test |

## Schema

| Model | Purpose |
|-------|---------|
| `GenerationLog` | Metadata-only AI call audit (no clinical text) |
| `AppSetting` | Key/value store for future server-side settings |

### GenerationLog fields

| Field | Description |
|-------|-------------|
| `documentType` | Component id (e.g. `aufnahme`) |
| `aiMode` | `schnell` \| `standard` \| `gruendlich` |
| `inputTextLength` | Source text character count |
| `estimatedInputTokens` | Token estimate |
| `estimatedCredits` | Credit estimate (logging only) |
| `provider`, `model` | Resolved model metadata |
| `status` | `started` → `completed` or `failed` |
| `errorMessage` | Set when `status = failed` |
| `createdAt`, `completedAt` | Timestamps |

## Usage logging flow

1. React calls `executeAiGeneration` → `logGenerationUsage` (`src/services/generationLogClient.ts`).
2. Client POSTs `/api/generation-logs` with `status: started` before the mock AI call.
3. On success/failure, client PATCHes the same row to `completed` or `failed`.
4. Express route (`server/routes/generationLog.ts`) writes via `server/db.ts` (Prisma).

Logging failures are **non-blocking** — generation continues even if the API is down.

## Prisma import rule

```typescript
// server/db.ts or scripts only — never from React
import { prisma } from '../server/db'
```

## Environment

```env
DATABASE_URL="file:./dev.db"
API_PORT=3001
```

## Schema changes

After editing `prisma/schema.prisma`:

```bash
npm run db:migrate -- --name describe_your_change
```

This creates a migration under `prisma/migrations/` and applies it. Use `db:push` only for quick experiments — not for changes you want to keep.

## API endpoints

| Route | Purpose |
|-------|---------|
| `POST /api/generate` | Server-side LLM proxy (keys in `.env`) |
| `GET /api/credits` | Current credit balance |
| `POST /api/credits/check` | Pre-flight affordability check |
| `POST /api/generation-logs` | Start usage log (402 if insufficient credits) |
| `PATCH /api/generation-logs/:id` | Complete/fail log; deducts credits on complete |

## Test GenerationLog

1. Terminal 1: `npm run dev:server`
2. Terminal 2: `npm run dev`
3. In the app: enter text → **Generate** → confirm output in the editor.
4. Terminal 3: `npm run db:studio` → open `GenerationLog` → row with `status: completed`, `documentType`, `aiMode`, etc.

Or: `npm run db:check` before/after to see row count increase.

## Prisma version

Pinned to **Prisma 6** for simple SQLite `url` in `schema.prisma`. Prisma 7 requires `prisma.config.ts` and driver adapters.
