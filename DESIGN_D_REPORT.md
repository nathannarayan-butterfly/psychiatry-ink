# Design D rollout — what shipped, what's deferred (2026-06-30)

Source: `[Audit patient-name storage & propose options]
(f7e7eb6b-c810-4ba3-bd34-fad13bf25307)`.

The audit confirmed clinical tables **already do not carry patient names**
on the server (PII lives only in the per-device crypto vault in
IndexedDB, RSA-OAEP wrapped). The remaining attack surface was:

1.  Konsil document sharing could write plaintext names to
    `ks_consultation_requests` when the clinician chose
    `patient_identifier_mode = 'full'`.
2.  `user_notes.content` and `kb_pharma_comments.text` were stored on
    the server in plaintext.
3.  DiscussCase identified packages were *intended* to be E2EE but
    nothing on the server rejected a forged plaintext upload.
4.  There was no formal table for direct identifiers (the would-be
    "patient identifier vault"); the audit recommended adding one even
    if the client work is deferred, so a future client rollout doesn't
    need another migration window.

This commit lands the four mitigations above and **defers** the
full identifier-vault client (passphrase unlock, initials-masked
pre-unlock UI, existing-row migration). See "Deferred" below for the
rationale and the exact reentry point.

The IndexedDB hotfix (commit `8893e95` —
`fix(indexeddb): add missing 'vault' object store via upgrade
handler`) landed as a separate commit before this one and is being
shipped to production in parallel; this rollout sits on top of it.

## What shipped (this commit)

### Konsil document sharing — disabled with banner

- **Server** (`server/routes/consultation.ts`,
  `server/utils/konsilDisabled.ts`): every mutating Konsil route
  (`POST /`, `POST /invites/accept`, `POST /:id/report/{draft,submit}`,
  `POST /:id/{more-info,respond,reviewed,archive,revoke}`) returns
  `410 Gone` with `{ code: 'konsil_disabled', error: <de-CH message> }`.
  GET routes still return existing rows so previously shared
  consultations stay accessible. Override via env var
  `ENABLE_KONSIL_SHARING=true` (dev/staging only).
- **Client** (`src/services/consultationApi.ts`): introduces
  `KonsilDisabledError` so call sites can render the user-visible
  banner without scraping HTTP status codes.
- **UI**: `ConsultationCaseSection`, `ConsultationCasePage`,
  `ConsultationRequestBuilder` all carry a banner pointing to the
  re-enable plan, and the relevant action buttons (`Request
  consultation`, `Save draft`) are `disabled` with an
  `aria-disabled="true"` tooltip; the `onClick` wiring is left in place
  so the re-enable is a one-line `disabled={false}`.
- Translations: `konsilDisabledTitle` / `konsilDisabledBody` in
  de/en/fr/es.
- **Tests**: `server/__tests__/konsilDisabled.test.ts` exercises every
  mutating route and asserts 410 + `konsil_disabled`. Also asserts
  the env override falls through to the next handler.

### `user_notes.content` + `kb_pharma_comments.text` — encrypted at rest

- **Migration** (`supabase/migrations/20260711000100_user_notes_kb_
  comments_ciphertext.sql`): additive only — adds `ciphertext`, `iv`,
  `wrapped_key`, `payload_version` to both tables. The plaintext
  `content`/`text` columns stay around so a pre-rollout client can keep
  reading; a follow-up migration can drop them once the install base
  has migrated.
- **Server** (`server/services/userNotesStore.ts`,
  `server/routes/{userNotes,kbPharmaComments}.ts`): accepts ciphertext
  payloads, rejects mixed writes (ciphertext + non-empty plaintext)
  with `400` so a buggy client can't leak the plaintext copy by
  accident.
- **Client** (`src/utils/{globalNotesSync,kbCommentsSync}.ts`):
  encrypts via the existing per-device `encryptJsonPayload` /
  `decryptJsonPayload` (RSA-OAEP wrapped AES-GCM, identical to the
  patient vault). Falls back to plaintext when
  `hasLocalKeyMaterial()` is false (first-run / offline) so the user
  doesn't lose offline writes. Decryption failures degrade gracefully
  to empty strings; the row is still surfaced for manual recovery.
- **Defensive crypto fix** (`src/utils/cryptoVault.ts`): wraps
  base64-decoded buffers in `Uint8Array` before passing them to
  `crypto.subtle.unwrapKey` / `decrypt`. Node's webcrypto accepts a
  bare `ArrayBuffer`, but jsdom's strict WebCrypto polyfill rejects
  cross-realm `ArrayBuffer` arguments with `"2nd argument is not
  instance of ArrayBuffer, ..."`. Wrapping in `Uint8Array` works in
  both environments.
- **Tests**: `globalNotesSync.encryption.test.ts` and
  `kbCommentsSync.encryption.test.ts` cover encryption roundtrip,
  legacy plaintext back-compat, and graceful decryption failure.

### DiscussCase identified packages — E2EE-only at server

- **Migration** (`supabase/migrations/20260711000200_discuss_case_
  e2ee_enforce.sql`): adds a non-validated CHECK on
  `dc_discussion_packages` enforcing that identified packages
  (`is_deidentified = false`) carry an `enc = 'aes-gcm-256-v1'`
  discriminator on `content`. Pre-rollout plaintext rows pass through
  because the constraint is `NOT VALID`; new inserts/updates are
  gated.
- **Server** (`server/routes/discussCase.ts`): the POST `/` create
  route calls `isEncryptedEnvelope(identifiedContent)` and rejects with
  `400` + `code: 'discuss_case_identified_must_be_e2ee'` if the
  identified payload is plaintext. The deidentified package
  intentionally stays plaintext for the server-side AI pipeline.
- **Test**: `server/__tests__/discussCaseE2eeEnforce.test.ts` asserts
  plaintext is rejected and that a valid `EncryptedEnvelope` reaches
  `createDiscussion` verbatim. Also pins `E2EE_VERSION` against the
  SQL CHECK string so the two stay in sync.

### Patient identifier vault — table only

- **Migration** (`supabase/migrations/20260711000000_patient_
  identifiers_vault.sql`): creates `public.patient_identifiers`
  (case-keyed ciphertext rows owned by a Supabase user, RLS scoped to
  owner). The schema is final; the table will sit empty in production
  until the client rolls out. No clinical flow reads from or writes to
  it yet, so landing the schema now is safe and saves a migration
  window later.

## Deferred (behind a flag — explicitly NOT shipped today)

These are real Design D scope items the audit recommended; I deferred
them rather than half-shipping them because each is multi-day work that
touches user-facing flows where a bug is costly for a clinical product.
The plan to bring them in is concrete and lives next to the empty
`patient_identifiers` table.

1.  **Identifier-vault client + unlock UX**. Passphrase / WebAuthn-PRF
    derived AES-GCM key, session unlock state with idle timer, lock
    button, auto-lock on tab close / sign-out, an `UnlockDialog`
    component, an `IdentifierVaultProvider`-style React context, and a
    `useDisplayName(caseId)` hook that returns initials + DOB year
    pre-unlock / full name post-unlock.
2.  **UI surfaces**. Replace every direct call site that renders patient
    names (case list, case header, document headers, search results,
    printed reports, audit log, …) so they route through the new
    `useDisplayName` hook. There are ~30+ touchpoints in the current
    UI — this is the bulk of the work and is the highest-risk step
    (any miss leaks PHI on the pre-unlock list).
3.  **Existing-row migration**. A one-time client-side migration that,
    after first successful unlock, walks every locally-known case,
    pulls `{ name, geburtsdatum, … }` out of the per-device crypto
    vault, encrypts them with the new passphrase-derived key, and
    writes them to `public.patient_identifiers`. Until this runs the
    new server-side table stays empty and the existing local
    cryptoVault remains the source of truth for names — exactly the
    pre-Design-D state.
4.  **Recovery**. Passphrase-only recovery at first; optional
    printed/downloadable backup code as a stretch goal. The settings
    UI needs a "Lost passphrase + lost backup code = unrecoverable
    identifiers; clinical content stays readable" disclaimer.
5.  **Egress sweep**. Re-read `safeLlmEgress.ts` and `deidentify.ts`
    once the vault client is wired up, to confirm no LLM prompt path
    accidentally pulls a decrypted name out of the new vault and
    forwards it to a 3p model.
6.  **Calendar legacy on-read migration**. The audit flagged legacy
    calendar rows that may still carry patient names plaintext-on-the-
    server; the read path needs a one-shot client migration. Out of
    scope for this pass.
7.  **Patient identifier server route + service layer**. There is no
    `/api/patient-identifiers` endpoint yet. The migration is in
    place, but a thin Express route + service (mirroring
    `server/services/userNotesStore.ts` shape) needs to land before
    the client can read/write the new table. Trivial once the unlock
    UX exists; pointless to ship before it.

### Reentry checklist (next pass)

1.  Build `src/utils/identifierVault/*` (key derivation, in-memory
    cache, unlock state machine).
2.  Build the `IdentifierVaultProvider` + `useDisplayName` hook.
3.  Add `server/routes/patientIdentifiers.ts` + service.
4.  Sweep UI call sites for name rendering via `useDisplayName`.
5.  One-time client migration that fills `patient_identifiers` from
    the existing local cryptoVault, runs ONCE per device after first
    unlock, gated behind an `identifierVaultMigrated:<userId>`
    `localStorage` flag.
6.  Drop the deferred migration into `safeLlmEgress.ts` / sweep
    `deidentify.ts`.
7.  Calendar legacy on-read migration.

## Files

### Migrations to apply (in this order)

```
supabase/migrations/20260711000000_patient_identifiers_vault.sql
supabase/migrations/20260711000100_user_notes_kb_comments_ciphertext.sql
supabase/migrations/20260711000200_discuss_case_e2ee_enforce.sql
```

All three are additive and idempotent (`create table if not exists`,
`add column if not exists`, `add constraint … not valid` behind a
`pg_constraint` existence probe).

### Test coverage added

- `server/__tests__/konsilDisabled.test.ts` — 10 tests (9 routes ×
  410 + 1 override).
- `server/__tests__/discussCaseE2eeEnforce.test.ts` — 3 tests (E2EE
  shape pin, plaintext reject, envelope passthrough).
- `src/utils/__tests__/globalNotesSync.encryption.test.ts` — 4 tests
  (no-plaintext-on-wire, decrypt roundtrip, decrypt-failure
  graceful, legacy plaintext back-compat).
- `src/utils/__tests__/kbCommentsSync.encryption.test.ts` — 4 tests
  (mirror of user_notes coverage).

## Verification

- `npm run typecheck` — clean (app + server).
- `npm test` — 1917 / 1918 passing. The one timeout
  (`casePatientLifecycle > removes every local patient case`,
  5 s timeout under suite load) is a **pre-existing** flake that was
  documented before this work began: it mocks `clearCaseStorage`
  entirely so neither the IDB hotfix nor any of these changes can
  affect it. Passes consistently in isolation (1.76 s) — it is a
  test-infrastructure flake on a slow CI box, not a code regression.
