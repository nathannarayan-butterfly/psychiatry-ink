# Project security guidance — psychiatry.ink

> This file is the Cursor-native equivalent of the original plugin's
> `claude-security-guidance.md`. Its contents are appended to the **Layer 2**
> (end-of-turn diff review) and **Layer 3** (commit-time review) prompt hooks.
> It is **additive only**: it can ADD checks, raise the severity of a class, or
> describe approved internal patterns to recognize. It must **never** be used to
> suppress a finding — if a rule below conflicts with a real vulnerability, the
> reviewer flags the vulnerability anyway and notes the conflict.
>
> Edit this file to teach the reviewer about *this* codebase. Keep it free of
> secrets (it is sent to the reviewing model on every review). Built-in rules
> already cover the common web-vuln classes (injection, XSS, SSRF, IDOR, auth
> bypass, unsafe deserialization, path traversal, hardcoded secrets); this file
> is for things specific to psychiatry.ink that a generic reviewer can't infer.

This is a **production clinical platform for psychiatrists**. It handles PHI
(protected health information). Treat any of the following as **high severity**.

## 1. Authentication on PHI / credit routes

- Every Express route under `server/routes/**` that reads or writes patient
  data, clinical text, credits, billing, or vault material **MUST** require a
  validated authenticated principal **before** the first DB read/write.
- Falling back to a shared `'default'` account (or any device-id / anonymous
  fallback) on a missing or invalid Bearer token is a **cross-tenant data-mixing
  vulnerability**, not a convenience. Flag any new or modified PHI/credit handler
  that resolves an account without rejecting unauthenticated/invalid tokens.
- Specifically watch: `patients`, `credits`, `generationLog`, `account/plan`,
  `crypto`, `workspaceVault`. An invalid/expired Bearer must be **rejected**, not
  silently downgraded to unauthenticated.
- Auth/ownership checks placed *after* an early return (empty-list/short-circuit
  paths) are a bypass — the guard must dominate every path that reaches PHI.

## 2. PHI egress to external LLMs

- Clinical free-text, patient identifiers, audio, lab values, and medication
  notes **MUST be de-identified server-side** before being sent to any external
  LLM/transcription provider. Do **not** trust a client-supplied
  `is_deidentified` / `deidentifiedContent` flag — re-run de-identification on
  the server.
- Flag any new route→provider path (generate, inline-edit, transcribe,
  lab-med correlation, combination-check, discuss-case ask-ai, etc.) that builds
  a prompt from raw `clinicalNotes` / `labNotes` / `question` without passing it
  through the shared server-side redactor first.
- The user's free-text `question` is PHI too — it must be redacted, not just the
  stored package.

## 3. PHI at rest

- Do not introduce new plaintext PHI in `localStorage`, `sessionStorage`,
  IndexedDB, logs, telemetry, error messages, or analytics. Clinical text and
  identifiers at rest must go through the encrypted vault / E2EE layer.
- Flag `console.log` / logger calls, error responses, and metric/trace
  dimensions that can carry clinical free-text, patient names, MRNs, emails, or
  raw model output.
- Raw `error.message` (DB / internal) must not be returned to clients — map to
  generic messages.

## 4. Crypto & vault

- No new AES-ECB, `createCipher` (no-IV), MD5/SHA-1 for security, or disabled
  TLS verification.
- Encryption key derivation must read the stored `iterations`; key regeneration
  paths must not silently orphan prior ciphertext (data loss).
- Validate any E2EE URL `#key=` fragment against the envelope before using it.

## 5. General data-flow rules for the reviewer

- Trace tainted input across files: input in module A, dangerous sink in module
  B is still in scope (IDOR, auth bypass, SSRF, injection, path traversal,
  unsafe deserialization).
- If a sibling handler in the same router enforces a check this one omits, the
  omission **is** the finding.
- Internal-only is not a safety argument — internal services are common SSRF /
  IDOR targets.
