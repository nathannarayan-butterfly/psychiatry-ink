# AI Workflow Specification

Psychiatry.ink is a **clinical writing and transcription assistant**. In the current build, processing runs locally or via placeholder calls — **no clinical content is transmitted to external AI services yet**. When API integration is enabled, requests must still be treated as drafts only.

**The clinician remains the author.** Every AI result must be verified before use in care or records.

See also: [AI Call Schema](./AI-CALL-SCHEMA.md) (prompts, roles, models, chunking).

---

## Product stance

| Principle | Implementation |
|-----------|----------------|
| Writing tool, not autonomous documentation | AI suggests text; clinician accepts, edits, or rejects |
| Verify all output | Warning shown before Generate; review state after output |
| No silent overwrite | Pre-generation text stored; Reject restores it |
| Output language | Always UI language (`de` / `en` / `fr` / `es`) |
| Input language | Any or mixed — routing does not depend on language |

---

## Full call pipeline

From clinician action to workspace update:

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. INPUT                                                        │
│    Schreiben / Diktieren / Extrahieren → contentInputOrigin     │
│    Optional: paste, transcribe, section/Gesamt scope              │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. TOOL & TIER (resolveGenerationCall)                          │
│    Manual tool → KI Auto → highlight → fallback                 │
│    Tier: Auto rules or manual model tier                        │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. SCHEMA & PROMPT                                              │
│    resolveAiCallSchema → sectionFocus + tool verb               │
│    buildSystemPrompt (writer | psychiatrist role)               │
│    buildUserPrompt (minimal tokens + source text)               │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. CHUNK & EXECUTE (executeAiGeneration)                        │
│    by-section (Gesamt) or by-token (long segment)               │
│    Model from tier mapping (DeepSeek / OpenAI) — mock today     │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. WORKSPACE                                                    │
│    Result → editor; generationPendingReview = true              │
│    Accept / Reject / Regenerate / Edit / Copy                   │
└─────────────────────────────────────────────────────────────────┘
```

**Important:** Picking a tool in the AI panel sets the **request mode for the next Generate**. Tools do not run until **Generieren** (or Regenerate) is pressed.

---

## Verification warning

Before every generation, the input panel shows:

> *AI output is a draft. Verify clinically before accepting.*

This appears whenever Generate is available (not during pending review). Regenerate shows the same obligation — each pass must be checked.

---

## Tool resolution order

Single source: `src/utils/resolveGenerationCall.ts`

| Priority | Source | When |
|----------|--------|------|
| 1 | **Manual override** | Clinician picked a tool (`userToolOverride`) |
| 2 | **KI Auto** | Auto on, no override → `resolveAiAutoSelection` |
| 3 | **Selected tool** | Auto off, tool still active in panel |
| 4 | **Highlight** | Config highlights tool for current scope |
| 5 | **Fallback** | Origin + scope defaults (same logic as Auto) |

Disabled tools are greyed out in the UI. If a disabled tool is somehow requested, the resolver substitutes the next enabled tool.

**Asymmetry:** Manual **tool** pick does not turn off KI Auto. Manual **model tier** pick turns Auto off.

---

## Input origin

| Origin | Set when |
|--------|----------|
| `typed` | Schreiben, after AI generation, normal typing |
| `dictated` | After transcription from Diktieren |
| `pasted` | Paste into editor, Extrahieren, Therapie extract apply |

**Note:** Pasting then typing more keeps `pasted` until Generate, input-mode change, or navigation. Auto still prefers summarize until then.

---

## KI Auto — default tool matrix

| Input | Scope | Default tool | Example |
|-------|-------|--------------|---------|
| typed | segment | structure | Type anamnesis in one section |
| dictated | segment | structure | Dictate → transcribe → structure |
| pasted | segment | summarize | Paste old note |
| typed | Gesamt | structure | Type across sections → organize |
| dictated | Gesamt | structure | Dictate full admission → split headings |
| pasted | Gesamt | summarize | Paste full report → condense |

### Component exceptions

| Component | Variant | typed / dictated | pasted |
|-----------|---------|------------------|--------|
| Psychopath checklist | checklist | proofread | shorten |
| Verlauf | short | structure (fast tier) | summarize |
| Therapie und Verlauf | — | structure | summarize (fast tier) |
| Psychopath | free | structure | summarize |
| Verlauf | broad | structure / summarize by origin | same |

Therapie und Verlauf has **segment scope only** (no Gesamt in UI).

---

## KI Auto — tier matrix

| Condition | Tier tendency |
|-----------|----------------|
| Default per component | `autoDefaultTier` in presets |
| Verlauf Kurznotiz | fast |
| AMDP checklist | fast |
| Long pasted summarize (>1500 tokens est.) | downgrade toward fast |
| Long typed structure (>4000 tokens est.) | fast → standard |
| Aufnahme Gesamt | never thorough in Auto |
| Suizid / Fremdgefährdung / Diagnostik / Plan (schema) | thorough when manual tier or schema default |

Manual tier selection overrides Auto tier until Auto is re-enabled.

---

## Preconditions (when Generate is disabled)

| Blocker | Reason |
|---------|--------|
| Empty source text | Nothing to process |
| Scope not allowed | e.g. Therapie segment-only config |
| Dictation recording / transcribing | `aiControlsLocked` |
| Generation in progress | `isGenerating` |
| Insufficient credits | Credit check fails |
| Gesamt + unsaved segments | Warning dialog; confirm or save first |

---

## Workspace behaviour after AI output

When generation completes:

### What appears

- AI text replaces the **current editor content** (active segment, or Gesamt preview).
- For **Gesamt** with chunking, section fields update from `sectionResults` where available.
- Section status → `draft` (not `saved`).
- `generationPendingReview` → **true** (review mode in input bar).

### What the clinician can do immediately

| Action | Available? | Behaviour |
|--------|------------|-----------|
| **Edit** textarea | Yes | Editor unlocked after generation; change text freely before Accept |
| **Copy** (segment / all) | Yes | Copies current `editorContent` |
| **Accept** (✓) | Yes | Keeps text; exits review mode |
| **Reject** (✗) | Yes | Restores **pre-generation** text for active segment |
| **Regenerate** | Yes | Runs Generate again with current resolver state |
| **Rewrite** | UI only | Not implemented (mock) |
| **Save section** | Yes | Persists current editor text to section store |
| **Switch segment** | Yes | Navigating away keeps draft content in section store |

### Review mode UI

While `generationPendingReview` is true:

- Generate button hidden; **Accept / Reject / Regenerate / Rewrite** shown
- Scope toggle hidden
- Clinician should verify, edit if needed, then **Accept** or **Reject**

### After Accept

- Review mode ends
- Text remains in editor (including any edits made during review)
- `contentInputOrigin` → `typed` (next Auto pass uses typed defaults)

### After Reject

- Editor restored to snapshot taken **before** that Generate call
- Review mode ends

### Limitation — Gesamt reject

Reject currently restores the **active segment** snapshot only, not every section touched by a Gesamt run. For full rollback across segments, use section navigation and manual undo until multi-section restore exists.

---

## Clinician workflow examples

### 1. Dictate → transcribe → structure → improve

1. Diktieren → Transkribieren → origin `dictated`, Auto → **structure**
2. Read verification warning → **Generieren**
3. Review output in editor; edit if needed → **Accept**
4. Pick **Formalisieren** → **Generieren** again → verify → Accept

### 2. Type full anamnesis → structure (Gesamt)

1. Fill or type across sections
2. Scope **Gesamt**, origin `typed`, Auto → **structure**
3. **Generieren** → headings assigned per schema
4. Edit, copy, or Accept

### 3. Paste old report → summarize

1. Paste → origin `pasted` → Auto → **summarize**
2. **Generieren** → verify condensed draft

### 4. Manual tool anytime

Pick any enabled tool → next Generate uses it (Auto can stay on for tier).

### 5. AMDP checklist

Compile checklist selections → Auto → **proofread** (structure disabled for this variant).

---

## Multi-pass and limitations

| Topic | Status |
|-------|--------|
| Multi-pass chains (structure → formalize) | Manual: two Generate clicks; no automatic pipeline |
| API / model calls | Mock placeholder; no external transmission in current build |
| Rewrite button | Not implemented |
| Gesamt reject rollback | Active segment only |
| Origin after paste + type | Stays `pasted` until Generate or mode change |
| Clinical validation | Prompt rules only; no automated fact-check |
| Audit log | Not yet (planned with database layer) |

---

## AI roles (in prompts)

| Role | Sections |
|------|----------|
| **writer** | Most documentation — structure, summarize, proofread |
| **psychiatrist** | Risk, diagnosis, treatment plan (see AI-CALL-SCHEMA.md) |

---

## Audit plan

### Current (`npm run audit:workflows`)

9 cases — **KI Auto default tool** only (`src/utils/workflowMatrix.ts`).

### Planned expansion

| Category | Cases to add |
|----------|----------------|
| `resolveGenerationCall` | manual override, auto off, highlight, disabled-tool fallback |
| Tier | per component, long text downgrade, manual tier override |
| Components | psychopath free, verlauf broad, therapie-verlauf |
| Tools | all 7 tools with manual pick |
| Schema | `schemaId` + `aiRole` for risk sections |
| Post-generation | origin reset, override cleared |
| Preconditions | empty content, locked controls |

Target: **40–60 automated cases** before API go-live.

---

## Key source files

| File | Role |
|------|------|
| `src/utils/resolveGenerationCall.ts` | Tool + tier + request assembly |
| `src/utils/aiAutoDefaults.ts` | Auto tool/tier rules |
| `src/data/aiCallSchemas.ts` | Section focus + clinical role |
| `src/data/aiPromptCore.ts` | Minimal prompts |
| `src/services/aiGeneration.ts` | Chunk + execute |
| `src/hooks/useWorkspaceState.ts` | Generation + review state |
