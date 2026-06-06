# AI Prompts Audit — 2026-06-06

## Executive summary

A user reported that **Formalisieren** on a **Verlauf** document produced output with **Aufnahme structure** in the wrong section. Root cause was a combination of:

1. **Stale tool state** — AI toolbar/slash/paste/selection handlers called `handleGenerate()` immediately after `selectAiTool()` without `flushSync`, so generation often ran with the **auto-selected tool** (typically `structure` or `summarize` for pasted text) instead of the clinician’s chosen `formalize`.
2. **Schema bleed into style-only tools** — `formalize` still received `sectionFocus` text (e.g. “visit note: reason, MSE, course, plan”), optional **example hints** (Aufnahme-style templates), and **schema constraints** that implied restructuring.
3. **Segment source text drift** — in multistage editors, segment generation used `editorContent` instead of the active section’s latest `sectionContents`, so the wrong text could be sent or written back.
4. **Section-scoped actions used document scope** — per-section quick-AI links did not force segment scope, allowing document-level chunking/schema to affect a single section.

Fixes applied across prompt building, schema resolution, workspace generation handlers, and Notion UI triggers. `npm run build` passes.

---

## Bug: Verlauf → Aufnahme contamination

### Symptom

User pasted text into **Verlauf**, ran **Formalisieren**, but received text structured like **Aufnahme** (admission headings/subsections) and applied in the wrong place.

### Root cause

| Layer | Problem |
|-------|---------|
| UI (`NotionApp.tsx`) | `runAiTool` / selection / paste paths did not synchronously commit tool selection before generate → **structure** ran instead of **formalize** for pasted Verlauf text. Structure with `componentId: 'aufnahme'` or admission-style hints produces Aufnahme headings. |
| Prompts (`aiPromptCore.ts`) | `formalize` appended `sectionFocus` and example hints that read like structural templates. |
| Pipeline (`aiGeneration.ts`) | `sectionExampleHint` was passed as style reference for formalize; schema `constraints` could still apply to non-style tools incorrectly. |
| Schema (`aiCallSchemas.ts`) | Fallback could attach another segment’s structural schema when lookup missed. |
| Workspace (`useWorkspaceState.ts`) | Segment source/result targeted `editorContent` rather than active `sectionContents[activeSectionId]` in multistage mode. |

### Fix applied

- **`handleGenerateWithTool(tool, { sectionId, forceSegment })`** — passes tool/section directly into `resolveGenerationCall`, avoiding stale React state.
- **`flushSync`** on all non-dropdown AI triggers before generate.
- **Style-only tools** (`formalize`, `proofread`): no schema constraints, no example style hints, no structural `sectionFocus`; optional section **label** only.
- **Segment source/result** reads and writes `sectionContents[targetSectionId]` in multistage editors.
- **Section quick-AI** forces **segment** scope for the focused section.

---

## AI command reference

| Name (DE) | Tool key | Purpose | Expected input | Expected output | Length / format | Section behavior |
|-----------|----------|---------|----------------|-----------------|-----------------|------------------|
| Strukturieren | `structure` | Organize free text into clear clinical prose; assign headings per document type | Segment or Gesamt text; typed/dictated/pasted | Structured prose with headings appropriate to **active document** (Aufnahme sections, Verlauf headings, AMDP, etc.) | Similar length; headings added per scope | Segment: active section only. Gesamt: per-section chunks + `sectionResults` |
| Zusammenfassen | `summarize` | Condense while keeping clinical facts | Long pasted or Gesamt text | Shorter summary; Gesamt keeps headings | Shorter than input | Gesamt: per-section summarize when chunked |
| Kürzen | `shorten` | Shorten without dropping facts | Any non-empty segment | Shorter text, same facts | Shorter | Active segment |
| Formalisieren | `formalize` | Polish to formal clinical German (Arztbrief style) | Non-empty segment text | Same structure; improved wording only | ~90–110% of input | **Active segment only**; never imposes Aufnahme/Verlauf templates |
| Stichpunkte | `bulletPoints` | Convert to concise bullets | Non-empty segment | Bullet list | Often shorter | Active segment |
| Korrekturlesen | `proofread` | Grammar/spelling/style only | Non-empty segment | Corrected text, same structure | ~same length | Active segment; checklist variant default for typed AMDP |
| Erweitern | `expand` | Elaborate only from given facts | Sparse segment notes | Expanded prose from existing facts only | Longer | Active segment |

### UI entry points (non-tool keys)

| Name (DE) | ID | Maps to | Notes |
|-----------|-----|---------|-------|
| Verlauf-Eintrag (Slash) | `verlaufEntry` | Inserts template on Verlauf page | Navigation + template, not AI |
| Anamnese-Abschnitt (Slash) | `anamneseSection` | Navigates to Aufnahme + template | |
| Als Verlauf (Selection) | `convertVerlauf` | `structure` on Verlauf page | Page switch then structure |
| Als PPB (Selection) | `convertPpb` | `structure` on Psychopath page | |
| Als Arztbrief (Selection) | `convertArztbrief` | `formalize` | Style only, current page |
| Einfügen Anamnese (Paste) | `applyAnamnese` | Navigate Aufnahme + append | Intentional page switch |
| Einfügen Verlauf (Paste) | `applyVerlauf` | Navigate Verlauf + append | |
| Einfügen Psychopath. (Paste) | `applyPsychopath` | Navigate Psychopath + append | |
| Strukturieren (Paste) | `structure` | AI on current page | Now uses `handleGenerateWithTool` |
| KI Strukturieren (Slash) | `aiStructure` | `structure` | |
| KI Arztbrief (Slash) | `aiArztbrief` | `formalize` | |

### Document-type defaults (KI Auto, no manual override)

| Document | Variant | Segment + typed/dictated | Segment + pasted | Gesamt + typed | Gesamt + pasted |
|----------|---------|--------------------------|------------------|----------------|-----------------|
| Aufnahme | — | structure | summarize | structure | summarize |
| Verlauf | short | structure (fast) | summarize | — (segment only in UI) | — |
| Verlauf | broad | structure | summarize | structure | summarize |
| Psychopath | free | structure | summarize | — | — |
| Psychopath | checklist | proofread | shorten | — | — |
| Therapie und Verlauf (Arztbrief) | — | structure | summarize (fast) | — (segment only) | — |
| Medikation / Therapieplanung | — | structure | summarize | — | — |

---

## Prompt architecture (after fix)

### System prompt (`buildSystemPrompt`)

- Role: `writer` or `psychiatrist` (from schema)
- Output language = UI language
- Input may be any language
- No invented facts; text only
- **formalize**: preserve structure, wording only
- **proofread**: proofread only, preserve structure

### Tool task (`buildToolTask`)

| Tool class | Task composition |
|------------|------------------|
| **Style-only** (`formalize`, `proofread`) | `FORMALIZE_RULES` / `PROOFREAD_RULES` + optional section **label** only |
| **structure + Gesamt** | Verb + `DOCUMENT_STRUCTURE_HINT[componentId]` + `sectionFocus` |
| **summarize + Gesamt** | Verb + “Keep headings” + `sectionFocus` |
| **Other** | Verb + `sectionFocus` |

`DOCUMENT_STRUCTURE_HINT` by component:

- `aufnahme` → admission section headings
- `verlauf` → progress note headings
- `psychopath` → AMDP-style MSE
- `therapie-verlauf` → therapy/course headings
- `medikation` / `therapieplanung` → respective headings

### User prompt (`buildUserPrompt`)

1. Tool task  
2. `Section: {label}` when provided  
3. `Style ref: {exampleHint}` — **structure only** (removed from formalize)  
4. KI extra instructions (clinician settings)  
5. `---` + source text  

### Schema constraints (`appendConstraints`)

Applied only for **non-style-only** tools. Style-only tools never receive `constraints` from `aiCallSchemas`.

### Server (`server/routes/generate.ts`)

Passthrough: `tier`, `systemPrompt`, `userPrompt` → LLM. No additional prompt mutation.

### KI instructions (`useKiInstructions.ts`)

Per-document or global extra instruction appended as `Additional instructions from clinician:` — applies to all tools; clinicians should avoid structural instructions when using Formalisieren.

---

## Before / after prompt changes

| Area | Before | After |
|------|--------|-------|
| Formalisieren task | `FORMALIZE_RULES` + `sectionFocus` (structural) | `FORMALIZE_RULES` + optional section label only; explicit “never impose Aufnahme/Verlauf/AMDP templates” |
| Korrekturlesen task | Generic verb + `sectionFocus` | Dedicated `PROOFREAD_RULES`; label only |
| Style hints | formalize + structure | structure only |
| Schema constraints | Skipped for formalize only | Skipped for formalize **and** proofread |
| Schema fallback | Any segment schema for component | Style-only tools skip structural segment fallback |
| Tool selection at generate | React state (race) | `handleGenerateWithTool` with explicit tool param |
| Segment source | `editorContent` | `sectionContents[activeSectionId]` with editor sync |
| Section quick-AI | Document scope possible | `forceSegment: true` |

---

## Files changed

- `src/data/aiPromptCore.ts` — style-only tool helpers, strengthened formalize/proofread rules
- `src/services/aiGeneration.ts` — constraint gating, style hint gating, pass section label
- `src/data/aiCallSchemas.ts` — style-only fallback guard
- `src/hooks/useWorkspaceState.ts` — `handleGenerateWithTool`, segment source/result fix
- `src/components/notion/NotionApp.tsx` — `flushSync` + `handleGenerateWithTool` on all quick AI paths

---

## Testing recommendations

### Regression: Verlauf Formalisieren

1. Open **Verlauf** → Kurznotiz.
2. Paste a multi-paragraph progress note (informal German).
3. Click **Formalisieren** (toolbar, slash `/KI Arztbrief`, or selection toolbar).
4. **Expect**: same paragraphs/headings; formal wording only; stays on Verlauf; no Aufnahme headings.

### Regression: Verlauf breit section quick-AI

1. **Verlauf** → Breiter Verlauf → paste into **Psychopathologie** (non-active section quick links).
2. Click **Formalisieren** on that section’s quick link.
3. **Expect**: only that section updates; segment scope; no other sections filled.

### Race: pasted + manual tool

1. Paste text (auto tool → summarize/structure).
2. Immediately click **Formalisieren** without changing auto mode.
3. **Expect**: formalize runs (not structure).

### Aufnahme structure still works

1. **Aufnahme** segment → paste unstructured anamnesis → **Strukturieren**.
2. **Expect**: admission headings appear (intended for structure tool only).

### Gesamt scope

1. **Aufnahme** → fill multiple sections → Gesamt → **Strukturieren**.
2. **Expect**: per-section structured output in correct sections.

### Psychopath checklist

1. Checklist selections → **Korrekturlesen**.
2. **Expect**: prose from selections; no new symptoms; no re-heading.

### Build

```bash
npm run build
```

### Optional workflow audit

```bash
npm run audit:workflows
```

---

## Residual risks / follow-ups

- **KI Auto + dropdown Generate**: Main **Generieren** button still uses `handleGenerate()` after tool selection in dropdown (sequential clicks — state is stable). Only single-click tool shortcuts needed the race fix.
- **Gesamt + Reject**: Still restores active segment snapshot only (documented limitation).
- **KI extra instructions**: Global presets can still ask for structural changes on any tool — clinician-facing docs should note this for Formalisieren.
- **No automated unit tests** for prompt composition yet; consider tests for `buildToolTask`, `resolveAiCallSchema`, and `handleGenerateWithTool` overrides.
