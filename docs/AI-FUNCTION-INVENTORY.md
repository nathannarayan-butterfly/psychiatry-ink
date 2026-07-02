# AI Function Inventory

Concise audit of every AI/LLM function: route, model tier, UX state handling,
and save behavior. Compiled during the 2026-07 AI-reliability pass; update when
adding AI features. See also `docs/AI-WORKFLOWS.md` and `docs/AI-CALL-SCHEMA.md`.

## Core plumbing (all features)

| Layer | File | Guarantee |
|---|---|---|
| Feature entry | `server/ai/runAiFeature.ts` | Credit check (fail-closed in prod) → PHI-safe call → atomic deduct → usage log (metadata only) |
| PHI egress guard | `server/services/safeLlmEgress.ts` | Sole `callLlm` caller; re-scrubs server-side; 422 on residual PHI (audit-tested) |
| Provider | `server/services/llmProvider.ts` | OpenAI-compatible chat completions; no streaming; 60s timeout; mock mode without keys |
| Tiers | `server/modelTierMapping.ts` | fast=DeepSeek v4-flash · standard=Gemini 2.5-flash (env-reroutable) · thorough=gpt-5.4 · Maximum opt-in=gpt-5.5 · EU fallback=Mistral |
| Persisted jobs | `server/services/aiJobs/*`, `server/routes/aiJobs.ts` | queued/running/succeeded/failed/cancelled; survives navigation/refresh/login; chunking pipeline; length enforcement |

## Persisted-job features (async, survive navigation)

| Feature | Trigger | Tier routing | Length control | Save behavior |
|---|---|---|---|---|
| Workspace "Zusammenfassen" (all editor summarize runs) | KI panel → summarize | Auto: thorough for long inputs (>~8k tokens) or manual tier | Kurz/Mittel/Gründlich/custom words + compression pass | Applied to editor w/ review; patient-less → auto-saved to "Meine Notizen"; always on job row (30-day TTL) |
| "Therapie und Verlauf zusammenfassen" | therapie-verlauf summarize | Always thorough under Auto | same | same, structured 7-section clinical skeleton |

Job UX: step text (analysieren → zusammenfassen → erstellen → kürzen → speichern),
real chunk progress, elapsed timer, cancel, "Im Hintergrund fortsetzen", global
bottom-right indicator with badge/toast, retry for failed jobs.

## Synchronous features (request/response)

| Feature | Route | Tier (default) | Loading / error / retry | Result handling |
|---|---|---|---|---|
| Editor tools (structure, formalize, proofread, improve, shorten, bullet, expand) | `POST /api/generate` | per-schema / KI-Auto | spinner, toast on error, regenerate | editor + Accept/Reject review |
| Inline edit (selection rewrite, voice) | `POST /api/inline-edit` | fast | inline spinner | inline replace, undo-able |
| Transcription (Diktieren) | `POST /api/transcribe` | n/a (STT) | phase UI | inserted into editor |
| Ask Butterfly chat | `POST /api/ask-butterfly` | user-selectable | bubble spinner; manual resend | chat state only (not persisted, by design) |
| Butterfly criteria assessment | `POST /api/butterfly` | standard | card status | advisory, pending clinician attestation |
| Arztbrief sections | `POST /api/arztbrief/generate-section` | mode dropdown | per-section spinner; re-click retry | draft + IndexedDB; Accept per section |
| Discharge summary sections | `POST /api/discharge-summary/generate-section` | mode dropdown | same | same |
| Discuss-case AI | `POST /api/discuss-case/:id/ask-ai` | tier selector | chat loading | persisted in discussion (draft flag) |
| Medication education | `POST /api/medication-education/generate-section` | standard/gründlich | per-section checklist progress; per-section retry | auto-saved per section |
| Patient education (generic) | `POST /api/patient-education-generic/...` | standard | spinner + retry button | Save/Copy/Export/Print actions |
| Lab interpretation | via WorkspaceAiFeaturePanel | thorough | spinner + retry | save to case documents |
| Lab↔medication correlation | `POST /api/lab-med-correlation` | thorough | panel status | Accept/Reject/Edit+Accept |
| Combination check | `POST /api/combination-check/run` | standard | run status | accept/reject persisted per run |
| ADR causality | `POST /api/medication/adr-causality` | standard | panel status | advisory |
| Prior therapies / failure analysis | `POST /api/medication/prior-therapies` | standard | panel status | advisory |
| PrEP check | `POST /api/medication/prep-ai-check` | standard | panel status | advisory |
| Pharma Q&A | `POST /api/pharma-ask` | fast | spinner | patient context stripped server-side |
| Pharma monograph (KB) | `POST /api/pharma-generate` | standard | progress | KB drafts |
| Template AI (generate/fill/from-doc) | `POST /api/template-ai` | standard | spinner | template fields |
| Document import mapping | `POST /api/document-import/map` | standard | progress | mapped fields, user confirms |
| Clinical metadata extraction | `POST /api/clinical-metadata/extract` | fast | background | structured fields |
| Clinical Intelligence (3 layers, flag-gated) | `POST /api/clinical-intelligence/*` | pinned thorough | panel | advisory, attestation required |
| Criteria draft (internal) | `POST /api/criteria/generate-draft` | thorough | admin UI | KB drafts |
| Standalone translate/rewrite/befund widgets | `POST /api/generate` | user-selectable | spinner + retry | "Save as note" (Meine Notizen) |

## Cross-cutting behaviors

- **Directions**: global defaults + per-document overrides in Settings
  (`useKiInstructions`); per-run "Zusätzliche Anweisung" in the KI panel;
  per-run overrides/extends the default. Job pipeline receives them as
  `params.directions`.
- **Model visibility**: tier picker shows provider/model hints; job results
  record provider/model/words in `result_meta` (auditable via `ai_usage_logs`
  and `ai_jobs.result_meta.stages`).
- **Credits**: every call billed through `runAiFeature`; job pipeline bills per
  stage under the job's feature key (map stage always economic/fast).
- **PHI**: client pseudonymization (reversible locally) + server scrub before
  LLM egress AND before persisting any `ai_jobs` row; job error messages never
  echo PHI-guard match previews.

## Known gaps / follow-ups

- Streaming responses are not implemented anywhere (single-shot calls).
- Ask Butterfly conversations are intentionally ephemeral.
- Gesamt-scope reject restores only the active segment (pre-existing).
- "Assign to patient" from a patient-less job result is manual (copy/insert);
  a case-picker action is a candidate follow-up.
- Cloud Run: for fully detached job completion (user closes the app), run the
  service with `--no-cpu-throttling`; otherwise client polling supplies CPU.
