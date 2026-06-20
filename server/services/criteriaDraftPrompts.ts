import type { Disorder } from '../../src/data/diagnosisCriteria/schema.ts'
import type { CriteriaDraftTarget } from '../../scripts/lib/criteriaDraftGaps.ts'

const LICENSING_RULES = `LICENSING & QUALITY RULES (mandatory):
- NEVER reproduce verbatim ICD-11 CDDR or DSM-5 criterion text.
- Write ORIGINAL German operational paraphrases of clinical facts only.
- Every criterion text_de must be a complete, clinically meaningful sentence (≥ 20 characters).
- No placeholder strings, no "TODO", no one-line stub criteria.
- status MUST be exactly "draft" — never clinician_reviewed.
- Do not invent operationalRule functions; omit them (attestation-only is fine).
- mappingHints are required on every criterion; use kind "isdm_domain" or "checklist" with sensible ref ids.
- Include structured citation metadata (classification + code + optional ref) per criterion when possible.
- Include at least one inclusion group with multiple criteria and any clinically relevant exclusion groups.
- For ICD-11 trees, use globally unique ids prefixed with the ICD-11 code stem (e.g. "6c43.3.recent_use").
- ICD-11 group/criterion ids MUST NOT collide with the existing ICD-10 tree ids provided.`

export function buildCriteriaDraftSystemPrompt(): string {
  return `You are a psychiatric classification expert helping Psychiatry.Ink author licensing-safe, clinician-reviewable diagnostic criteria trees.

You output STRICT JSON only — no markdown fences, no commentary.

${LICENSING_RULES}

JSON schema summary:
- Disorder: id, classification ("icd10"|"icd11"), code, name_de, crosswalkKey, sourceRef, version: 1, status: "draft", codingSystems {icd10?, icd11?, dsm5tr?}, differentials_de (≥2), groups[]
- CriterionGroup: id, label_de, logic ("all_of"|"any_of"|"at_least_n_of"|"none_of"), threshold?, timeWindow?, groupType ("inclusion"|"exclusion"|"severity"), criteria[]
- Criterion: id, text_de, mappingHints[{kind, ref}], allowClinicianAttest (usually true), citation?[{classification, code, ref?}]
- Optional icd11: { groups[], sourceRef? } when generating a native ICD-11 tree alongside ICD-10.`
}

function summarizeExistingDisorder(disorder: Disorder): string {
  const icd10Groups = disorder.groups.map((g) => ({
    id: g.id,
    label_de: g.label_de,
    logic: g.logic,
    groupType: g.groupType,
    criteria: g.criteria.map((c) => ({
      id: c.id,
      text_de: c.text_de,
      mappingHints: c.mappingHints,
      allowClinicianAttest: c.allowClinicianAttest,
      citation: c.citation,
    })),
  }))
  return JSON.stringify(
    {
      id: disorder.id,
      code: disorder.code,
      name_de: disorder.name_de,
      crosswalkKey: disorder.crosswalkKey,
      sourceRef: disorder.sourceRef,
      codingSystems: disorder.codingSystems,
      differentials_de: disorder.differentials_de,
      groups: icd10Groups,
    },
    null,
    2,
  )
}

export function buildFullDisorderUserPrompt(target: CriteriaDraftTarget): string {
  const meta = target.metadata ?? {}
  return `Generate a complete Disorder JSON for clinician review.

WHO / catalogue metadata (titles only — do NOT copy copyrighted CDDR text):
- ICD-11 code: ${target.icd11Code ?? 'unknown'}
- Title: ${target.title}
- Chapter: ${String(meta.chapterCode ?? '')} ${String(meta.chapterTitle ?? '')}
- Block: ${String(meta.blockCode ?? '')} ${String(meta.blockTitle ?? '')}
- Description: ${String(meta.description ?? 'n/a')}

Requirements:
- Anchor classification to ICD-11 when only an ICD-11 code is known; otherwise ICD-10.
- crosswalkKey should be the primary ICD-10 F-code when available, else the ICD-11 code.
- sourceRef like "operationalisiert nach ICD-11 ${target.icd11Code ?? '…'}".
- Provide a substantive ICD-10-style groups tree with multiple inclusion criteria.
- If clinically appropriate, also provide a DISTINCT native icd11 tree in the icd11 field.
- Return a single JSON object matching the Disorder schema.`
}

export function buildIcd11TreeUserPrompt(target: CriteriaDraftTarget): string {
  if (!target.existingDisorder) {
    throw new Error(`icd11_tree mode requires existingDisorder for ${target.key}`)
  }
  const disorder = target.existingDisorder
  return `Generate ONLY a native ICD-11 criteria tree for an existing authored disorder.

Existing disorder (ICD-10 anchor — preserve these ids; do NOT repeat them in ICD-11 ids):
${summarizeExistingDisorder(disorder)}

Target ICD-11 code: ${target.icd11Code}
Clinical title: ${target.title}
Reason: ${target.reason}

Return JSON:
{
  "id": "${disorder.id}",
  "status": "draft",
  "icd11": {
    "sourceRef": "operationalisiert nach ICD-11 ${target.icd11Code}",
    "groups": [ ... ]
  }
}

The icd11.groups must reflect ICD-11 clinical structure (thresholds, clusters, durations) as original German paraphrases — not a verbatim copy of the ICD-10 tree.`
}

export function buildCriteriaDraftUserPrompt(target: CriteriaDraftTarget): string {
  return target.mode === 'icd11_tree'
    ? buildIcd11TreeUserPrompt(target)
    : buildFullDisorderUserPrompt(target)
}
