# Psychiatry.ink — Codebase Audit Report

**Date:** June 5, 2026  
**Scope:** All work to date (workspace, AI, credits, dictation, Therapie und Verlauf, AI Manager, generation scope, settings)  
**Build status:** `npm run build` passes (TypeScript + Vite, no compile errors)  
**Tests:** None (`*.test.ts` / `*.spec.ts` not found)

---

## Executive summary

The architecture is sound: settings templates, runtime session state, variants, and i18n are cleanly separated. Several **critical workflow bugs** remain, especially around **document-scope generation** and **stub AI features** that look live but do nothing. Therapie und Verlauf free-form mode is implemented correctly; extract still has localization gaps.

**Recommended fix order:** document-scope generation → session reset on component removal → honor AI tool `enabled` flags → wire or hide AI tool actions → align `goToNextSection` with `selectSection`.

---

## Critical — breaks workflow

### 1. Document-scope generation overwrites one section with the full document

**File:** `src/hooks/useWorkspaceState.ts` (lines 605–626)

“Gesamter Abschnitt” correctly **reads** all segments via `buildDocumentGenerationInput()`, and the UI shows a combined read-only preview. But `runGeneration()` writes the **entire generated result into only `activeSectionId`**:

```typescript
if (activeSectionId) {
  setSectionContents((current) => ({
    ...current,
    [activeSectionId]: result,
  }))
```

`rejectGeneration()` restores `lastVersion` (the combined source) into that same single section.

**Impact:** Aufnahme, Verlauf (broad), Psychopath checklist — accepting document-scope generation can destroy per-segment structure.

---

### 2. Deleted component leaves stale session state

**File:** `src/hooks/useWorkspaceState.ts` (lines 226–247)

If the active component is removed in settings, the fallback switches `selectedDocumentType` and resets `sections`, but **does not** reset `editorContent`, `sectionContents`, `checklistSelections`, `generationPendingReview`, `therapieVerlaufSourceText`, etc.

**Impact:** New component label in the header, old patient text still in the editor.

---

### 3. AI Manager “disable tool” has no runtime effect

**File:** `src/utils/aiManager.ts` (lines 72–77)

Settings let admins uncheck tools, but `resolveAiContext()` hardcodes `enabled: true` for every tool. Only `highlighted` respects config.

**Impact:** KI-Manager settings mislead admins; disabled tools stay visible and clickable.

---

### 4. AI documentation tools are visual-only

**Files:** `useWorkspaceState.ts` (`selectAiTool`, `mockAction`), `AiToolRail.tsx`, `AiToolsPanel.tsx`

Tool clicks toggle selection styling only. `handleRewrite` logs `[mock] rewrite`. No summarize/structure/formalize behavior is wired.

**Impact:** Rail looks functional; clicks give no document change (except tier selection, which does work).

---

### 5. KI Auto toggle does nothing

**Files:** `useWorkspaceState.ts`, rail/panel, settings `AiSection`

`aiAutoMode` is stored and displayed but never read during generation, dictation, or tool selection.

**Impact:** Users enable automation; behavior is unchanged.

---

## High — confusing UX / likely bugs

### 6. `goToNextSection` ≠ `selectSection` cleanup

| Side effect | `selectSection` | `goToNextSection` |
|-------------|-----------------|-------------------|
| Reset `generationPendingReview` | ✓ | ✗ |
| Reset `generationScope` to segment | ✓ | ✗ |
| Clear incomplete-generation warning | ✓ | ✗ |
| `applyContextDefaultTier` for new section | ✓ | ✗ |

**Impact:** Using → (next) can leave stale review UI, wrong scope badge, and wrong AI hints/tier.

---

### 7. Document generation requires explicit Save, not draft content

**File:** `getIncompleteSections()` — `status !== 'saved'`

Draft sections with full text still block “Gesamter Abschnitt” generation. Section rail progress also only counts `saved`.

**Impact:** Users fill all segments, hit Generieren, get an incomplete warning without realizing they must Save each segment.

---

### 8. Therapie extract uses German labels regardless of UI language

**File:** `extractTherapieVerlaufFromPaste` uses `cloneTherapieVerlaufSections()` (German defaults), not `componentTranslations`.

**Impact:** In EN/FR/ES UI, extracted blocks are prefixed with German headings (`Aufnahmeanlass`, `Medikation`, etc.).

---

### 9. `handleRestoreLastVersion` exported but never wired

Translation key `restoreLastVersion` exists in `uiTranslations.ts`; hook exports the handler; no UI calls it.

---

### 10. Settings UI is German-only; main app is i18n

`AiManagerSettings.tsx`, `WorkspaceSection.tsx` use hardcoded German. Language switch does not affect settings.

---

### 11. Terminology: Segment / Abschnitt / Section

Mixed in UI: “Dieses Segment”, “Abschnitt speichern”, “Gesamter Abschnitt”, section rail “Dokumentabschnitte”. Same concept, three labels.

---

### 12. Dead AI preset config for Therapie und Verlauf

**File:** `aiManagerPresets.ts` — `formalize` highlights `document` scope, but `generateInScopes` is only `['segment']` and scope toggle is hidden for therapie-verlauf.

---

## Medium — inconsistencies / tech debt

| # | Issue | Location |
|---|--------|----------|
| 14 | **Dead exports:** `isLegacyTherapieVerlaufSections`, `getTherapieVerlaufExtractionTargets`, `isAiToolKey`, entire `documentTypes.ts` (not imported anywhere) | Various |
| 15 | Duplicate `documentationToolIcons` + `tierIcon` in `AiToolRail` and `AiToolsPanel` | Both components |
| 16 | Inconsistent localStorage keys: `psychiatry-ink-workspace` vs `psychiatry-ink:credits-balance` | Settings vs credits hooks |
| 17 | Migration silently drops `labor` component | `useWorkspaceSettings.ts` ~203 |
| 18 | Psychopath `sections` variant stripped without content migration | `useWorkspaceSettings.ts` |
| 19 | `activeVariantIds` only initialized on mount | `useWorkspaceState.ts` |
| 20 | Settings change multistage→free-text: sections cleared, editor content may persist | `useWorkspaceState` useEffect |
| 21 | Extract paste buffer not cleared after “In Arbeitsfeld übernehmen” | `extractTherapieVerlaufFromPaste` |
| 22 | `componentTranslations` therapie-verlauf section keys unused for extract labels | translations vs extract path |
| 23 | **No automated tests** for extract, migrations, scope logic | — |

---

## Low — minor cleanup

- `resetWorkspaceSession` does not clear `checklistSelections` / `sectionContents` (safe today via callers, fragile alone)
- `mockAction` for print/export only logs to console
- Document-scope textarea wires `onChange` while `readOnly`
- `lottieCharacters` is empty — stage mounts but shows nothing
- `useCredits` has no cross-tab sync
- Bundle ~716 KB — no code-splitting

---

## What works well

1. **Architecture** — `useWorkspaceSettings` (persisted templates) vs `useWorkspaceState` (session) vs `toDocumentTypes()` is clear and extensible.

2. **Variant model** — Psychopath free/checklist and Verlauf short/broad resolve correctly.

3. **Section status merge** — `mergeSectionStatuses` preserves draft/saved across settings/language hot reloads.

4. **Therapie und Verlauf free-form** — Sidebar hidden for Schreiben/Diktieren; blank workspace; no document-scope preview; extract optional.

5. **Extract heuristic** — Heading regex + keyword fallback in `extractTherapieVerlauf.ts`; short clinical headings applied.

6. **Checklist → prose** — Psychopath checklist compiles into editor with synced `sectionContents`.

7. **Normalbefund** — `insertNormalBefund` handles free, checklist, and multistage modes.

8. **Main UI i18n** — `uiTranslations.ts` is broad and wired through `TranslationProvider`.

9. **Dictation** — Phase machine, editor lock, playback in pause/review, overlay integration.

10. **Credits** — Tier + length estimation; Generieren disabled when insufficient; balance in top bar.

11. **AI context hints** — Scope-aware recommendation bar in input panel.

12. **Document-scope UI** (read path) — Badge, toggle, combined preview when “Gesamter Abschnitt” is selected (write path is broken — see Critical #1).

13. **KI tools during dictation review** — Controls unlocked in pause/review; locked only during recording/transcribing.

---

## Workflow matrix

| Workflow | Status | Notes |
|----------|--------|-------|
| Component switch (user) | ✅ | Full reset via `resetWorkspaceSession` |
| Component removed in settings | ❌ | Stale editor (Critical #2) |
| Section navigation (rail click) | ✅ | Full cleanup in `selectSection` |
| Section navigation (→ button) | ⚠️ | Missing cleanup (High #6) |
| Segment-scope generation | ✅ | Mock append works |
| Document-scope generation | ❌ | Writes combined text to one section (Critical #1) |
| Therapie Schreiben/Diktieren | ✅ | Free blank workspace, no rail |
| Therapie extract | ⚠️ | Works; German labels only (High #8) |
| AI tool clicks | ⚠️ | Visual only (Critical #4) |
| AI Manager disable tools | ❌ | Ignored (Critical #3) |
| KI Auto | ❌ | No behavior (Critical #5) |
| Dictation | ✅ | End-to-end mock flow |
| Credits gate | ✅ | Estimate + deduct on generate |
| Settings migrations | ⚠️ | Mostly good; labor dropped silently |

---

## Junk / orphaned code to remove or wire

| File / symbol | Recommendation |
|---------------|----------------|
| `src/data/documentTypes.ts` | Delete or use in tests only — **zero imports** |
| `isLegacyTherapieVerlaufSections` | Delete or use in migration |
| `getTherapieVerlaufExtractionTargets` | Wire to extract UI or delete |
| `handleRestoreLastVersion` | Wire to review UI or delete |
| `componentTranslations` therapie sections | Wire into extract for i18n labels |
| Duplicate icon maps in rail/panel | Extract shared `aiToolIcons.ts` |

---

## Design consistency notes

| Area | Anamnese / Verlauf | Therapie und Verlauf |
|------|--------------------|----------------------|
| Structure | Multistage, guided sections | Free-form (write/dictate) |
| Sidebar | Always visible | Hidden |
| KI scope toggle | Segment / Gesamter Abschnitt | Hidden (segment only) |
| Section hints | None (by design) | Hidden in free mode; used only in extract templates |
| Input modes | Write, Dictate | Write, Dictate, Extract |

This split is **intentional and correct** per product spec. The main inconsistency is extract still thinking in 10 structured sections while the UI presents free text.

---

## Suggested remediation plan

### Phase 1 — Fix data loss (1–2 days)

1. Document-scope generation: distribute result per section, or block accept until parser exists
2. Component-removal fallback: call same reset as `selectDocumentType`
3. Align `goToNextSection` with `selectSection` side effects

### Phase 2 — Honest AI UX (1 day)

4. Honor `rule.enabled` in `resolveAiContext`
5. Either wire tools to mock actions or disable with “coming soon”
6. Remove or implement KI Auto

### Phase 3 — Polish (ongoing)

7. Localize extract headings
8. Clarify Save vs draft for document generation
9. Delete dead code; add tests for extract + migrations
10. Unify Segment/Abschnitt terminology in `uiTranslations.ts`
