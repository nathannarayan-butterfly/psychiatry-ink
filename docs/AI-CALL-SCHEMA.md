# AI Call Schema — Psychiatry.ink

Schema-driven AI calls for all four default components. Tool-agnostic: any tool (structure, summarize, proofread, …) resolves against the same section schema. Prepared for secure API proxy + database in the next step.

## AI roles

| Role | Used for |
|------|----------|
| **writer** | Experienced psychiatric documentation writer assisting the clinician — structure, summarize, proofread, most sections |
| **psychiatrist** | Board-level psychiatrist voice — risk, diagnosis, treatment plan sections |

## Language policy

- **Input**: any language or mixed (German, English, dictation, paste)
- **Output**: always the user's UI language (`de` / `en` / `fr` / `es`) only
- Prompts are English internally (fewer tokens); output language enforced in system prompt

## Token efficiency

Prompts are minimal:

- **System** (~30 tokens): role + output language + no hallucination
- **User** (~15–40 tokens): tool verb + section focus + optional style ref + source text
- Tool verbs and section focuses are composed at runtime — no per-tool schema duplication

## Model tier mapping

| Tier | Provider | Default model | Use case |
|------|----------|---------------|----------|
| **Schnell** (`fast`) | DeepSeek | `deepseek-chat` | Kurznotiz, pasted summarize, checklist proofread |
| **Standard** (`standard`) | OpenAI | `gpt-4o-mini` | Most segment structure, document summarize |
| **Gründlich** (`thorough`) | OpenAI | `gpt-4.1` (latest) | Risiko, Suizid, Diagnostik, Therapieplan |

Override via env: `VITE_OPENAI_FAST_MODEL`, `VITE_OPENAI_STANDARD_MODEL`, `VITE_OPENAI_THOROUGH_MODEL`, `VITE_DEEPSEEK_FAST_MODEL`.

## Request shape

```typescript
interface AiGenerationRequest {
  componentId: string
  variantId?: string
  sectionId?: string
  scope: 'segment' | 'document'   // Einzelabschnitt | Gesamt
  tool: AiToolKey
  tier: AiModelTier
  language: UiLanguage
  sourceText: string
  sectionLabel?: string
  sectionDescription?: string
  sectionExampleHint?: string
  documentSections?: AiDocumentSectionInput[]
}
```

Resolution: `resolveAiCallSchema()` → `resolveAiCall()` → `executeAiGeneration()`.

## Chunking

| Strategy | When |
|----------|------|
| `by-token` | Single segment > ~3000 tokens — split by paragraphs |
| `by-section` | Document scope — one chunk per section; oversized sections sub-chunked |
| `none` | Short inputs |

Chunks are processed sequentially; document results merge into `sectionResults` per `sectionId`.

## Component schemas

### 1. Aufnahme (`aufnahme`)

**Segment (18 sections)** — tool: `structure` (default), tier: `standard`  
Exceptions: Suizid/Fremdgefährdung + Diagnostik/Therapieplan → `thorough`

| Section ID | Task focus |
|------------|------------|
| `aufnahmeanlass` | Admission indication, referral context |
| `aktuelle-beschwerden` | Current complaints |
| `aktuelle-krankheitsanamnese` | Illness history |
| `psychiatrische-vorgeschichte` | Psychiatric history |
| `somatische-anamnese` | Somatic history |
| `suchtanamnese` | Substance use |
| `medikamentenanamnese` | Medication |
| `familienanamnese` | Family history |
| `biografische-anamnese` | Biography |
| `sozialanamnese` | Social situation |
| `schul-und-berufsanamnese` | Education/work |
| `forensische-anamnese` | Forensic history |
| `traumaanamnese` | Trauma |
| `suizid-und-selbstgefaehrdungsanamnese` | Self-harm risk |
| `fremdgefaehrdungsanamnese` | Risk to others |
| `psychopathologischer-befund` | Mental state exam |
| `somatischer-befund` | Somatic exam |
| `diagnostische-einschaetzung` | Diagnostic assessment |
| `therapieplanung-behandlungsplan` | Treatment plan |

**Gesamt (document)**

| Tool | Use case |
|------|----------|
| `structure` | Typed/pasted full anamnesis → split into standard section headings |
| `summarize` | Condense completed admission; keep headings + risk/plan |

Chunk: `by-section`. Example: type everything in one pass, switch to **Gesamt**, choose **Strukturieren**.

---

### 2. Verlauf (`verlauf`)

#### Kurznotiz (`short`)

| Scope | Tool | Tier |
|-------|------|------|
| segment | structure | fast |

#### Breiter Verlauf (`broad`)

**Segment (8 sections)** — tool: `structure`, tier: `standard` (risiko: `thorough`)

- `psychopathologie`, `stationsverhalten`, `risiko`, `compliance-krankheitseinsicht`
- `medikation-vertraeglichkeit`, `besondere-ereignisse`, `somatik`, `beurteilung-plan`

**Gesamt** — `structure` (organize full note) or `summarize` (condense), chunk: `by-section`

---

### 3. Psychopathologie (`psychopath`)

#### Freitext (`free`)

| Scope | Tool | Tier |
|-------|------|------|
| segment | structure | standard |

#### AMDP-Checkliste (`checklist`)

**Segment (11 sections)** — tool: `proofread`, tier: `fast`

- `bewusstsein`, `aufmerksamkeit-gedaechtnis`, `formales-denken`, `inhaltliches-denken`
- `wahrnehmung`, `ich-stoerungen`, `affektivitaet`, `antrieb-psychomotorik`
- `suizidalitaet`, `vegetative-funktionen`, `sozialverhalten`

---

### 4. Therapie und Verlauf (`therapie-verlauf`)

Free-text workspace (no section rail). Logical sections used for extract + schema hints.

| Scope | Tool (KI Auto) | Tier |
|-------|----------------|------|
| segment (typed) | structure | standard |
| segment (pasted) | summarize | fast |

Chunk: `by-token` up to 4000 tokens.

---

## KI Auto integration

When **KI Auto** is on, `resolveAiAutoSelection()` picks tier + tool before `executeAiGeneration()`. Schemas use the selected tool; `autoDefaultTier` in presets guides economy.

## Default components (locked)

`aufnahme`, `verlauf`, `psychopath`, `therapie-verlauf`, `medikation`, `therapieplanung` are the fixed default set and are **not editable** in settings. Custom workspace-component authoring has been removed — Settings → Workspace now lists the default components read-only (with a "Standard" badge) plus a reset affordance. Legacy localStorage entries for custom components are filtered to the default set on load, and saved documents whose `typeId` referenced a removed custom component still reopen (resolved to the nearest default via `resolveNotionPageFromDocumentType`).

## Hint translation agent

`ensureHintsTranslated(language)` batches German hint texts (15 per chunk), uses static maps + cache (`psychiatry-ink:hint-translations`), ready for API agent replacement.

Applied at runtime via `applyHintTranslationsToComponents()` for checklist hints, section descriptions, and Therapie extract labels.

## Next step: database + security

- Move API keys server-side
- Persist generation logs + audit trail
- Replace mock `callModel()` with authenticated proxy

## All tools on all components

`TOOL_VERB` in `src/data/aiPromptCore.ts` maps each tool to one line. Combined with `sectionFocus` at call time:

| Tool | Verb |
|------|------|
| structure | Structure into clear clinical prose |
| summarize | Summarize; keep clinical facts |
| shorten | Shorten; keep all facts |
| formalize | Formalize to clinical standard |
| bulletPoints | Convert to concise bullet points |
| proofread | Proofread only; no new content |
| expand | Expand only from given facts |

## Key files

| File | Role |
|------|------|
| `src/data/aiCallSchemas.ts` | Section/document schemas + roles |
| `src/data/aiPromptCore.ts` | Roles, tool verbs, minimal prompts |
| `src/services/aiGeneration.ts` | Request build + execution |
| `src/data/modelTierMapping.ts` | Tier → provider/model |
| `src/utils/chunkText.ts` | Chunking |
| `src/services/hintTranslationAgent.ts` | Hint localization |
| `src/utils/defaultComponents.ts` | Default component lock |
