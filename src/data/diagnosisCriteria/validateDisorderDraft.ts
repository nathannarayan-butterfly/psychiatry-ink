import {
  CriterionGroupDraftSchema,
  DisorderDraftSchema,
  Icd11CriteriaSetDraftSchema,
  type DisorderDraft,
} from '../../schemas/diagnosisCriteria/disorderDraft'

export interface DisorderDraftValidationIssue {
  path: string
  message: string
}

export interface DisorderDraftValidationResult {
  ok: boolean
  draft?: DisorderDraft
  issues: DisorderDraftValidationIssue[]
}

const MIN_CRITERION_CHARS = 20

const MAPPING_HINT_KIND_ALIASES: Record<string, DisorderDraft['groups'][0]['criteria'][0]['mappingHints'][0]['kind']> = {
  domain: 'isdm_domain',
  isdm: 'isdm_domain',
  phenomenology: 'isdm_domain',
  developmental: 'checklist',
  clinical: 'checklist',
  temporal: 'course',
  onset: 'course',
}

const DEFAULT_MAPPING_HINT = { kind: 'checklist' as const, ref: 'clinical_review' }

function normalizeTimeWindow(value: unknown): unknown {
  if (value == null) return undefined
  if (typeof value === 'object') return value
  if (typeof value !== 'string') return value
  const text = value.toLowerCase()
  const monthMatch = text.match(/(\d+)\s*monat/)
  if (monthMatch) return { withinDays: Number(monthMatch[1]) * 30 }
  const dayMatch = text.match(/(\d+)\s*tag/)
  if (dayMatch) return { withinDays: Number(dayMatch[1]) }
  const yearMatch = text.match(/(\d+)\s* Jahr/)
  if (yearMatch) return { withinDays: Number(yearMatch[1]) * 365 }
  if (/dauerhaft|persistier|≥?\s*12\s*monat|mindestens.*monat/.test(text)) {
    return { withinDays: 365 }
  }
  return undefined
}

function normalizeMappingHints(value: unknown): unknown {
  if (!Array.isArray(value) || value.length === 0) return [DEFAULT_MAPPING_HINT]
  return value.map((hint) => {
    if (!hint || typeof hint !== 'object') return DEFAULT_MAPPING_HINT
    const raw = hint as Record<string, unknown>
    const kindRaw = String(raw.kind ?? 'checklist').toLowerCase()
    const kind =
      MAPPING_HINT_KIND_ALIASES[kindRaw] ??
      (['isdm_domain', 'checklist', 'medication', 'lab', 'course', 'diagnosis'].includes(kindRaw)
        ? (kindRaw as DisorderDraft['groups'][0]['criteria'][0]['mappingHints'][0]['kind'])
        : 'checklist')
    const refRaw = String(raw.ref ?? '').trim()
    const ref =
      refRaw && !['substance_related', 'neurological', 'differential_diagnosis', 'onset_course'].includes(refRaw)
        ? refRaw
        : kind === 'isdm_domain'
          ? 'general_presentation'
          : kind === 'course'
            ? 'onset'
            : 'clinical_review'
    return {
      ...raw,
      kind,
      ref,
    }
  })
}

function normalizeCriterion(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value
  const criterion = { ...(value as Record<string, unknown>) }
  criterion.mappingHints = normalizeMappingHints(criterion.mappingHints)
  return criterion
}

function normalizeGroup(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value
  const group = { ...(value as Record<string, unknown>) }
  group.timeWindow = normalizeTimeWindow(group.timeWindow)
  if (group.threshold === null) delete group.threshold
  if (Array.isArray(group.criteria)) {
    group.criteria = group.criteria.map(normalizeCriterion)
  }
  return group
}

function normalizeGroups(value: unknown): unknown {
  if (!Array.isArray(value)) return value
  return value.map(normalizeGroup)
}

function normalizeCodingRef(value: unknown, labelFallback: string): unknown {
  if (value == null) return undefined
  if (typeof value === 'string') {
    return { code: value, label_de: labelFallback }
  }
  return value
}

function normalizeCodingSystems(value: unknown, nameDe?: string): unknown {
  if (!value || typeof value !== 'object') return value
  const coding = { ...(value as Record<string, unknown>) }
  const fallback = nameDe ?? 'Diagnose'
  if ('icd10' in coding) coding.icd10 = normalizeCodingRef(coding.icd10, fallback)
  if ('icd11' in coding) coding.icd11 = normalizeCodingRef(coding.icd11, fallback)
  if ('dsm5tr' in coding) coding.dsm5tr = normalizeCodingRef(coding.dsm5tr, `${fallback} (Crosswalk)`)
  return coding
}

export interface CatalogueDraftEnrichment {
  icd11Code?: string
  title: string
}

function icd11CodeToDisorderId(code: string): string {
  return code.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

const DEFAULT_DIFFERENTIALS_DE = [
  'Organische oder somatische Ursache mit vergleichbarer Symptomatik',
  'Substanz- oder medikamenteninduzierte Ursache',
] as const

/** Fill missing top-level disorder metadata when LLM returns only groups/icd11. */
export function enrichCatalogueDisorderDraft(
  input: unknown,
  enrichment: CatalogueDraftEnrichment,
): unknown {
  if (!input || typeof input !== 'object') return input
  const draft = { ...(input as Record<string, unknown>) }
  const code = String(draft.code ?? enrichment.icd11Code ?? '').trim()
  const nameDe = String(draft.name_de ?? enrichment.title ?? '').trim()
  const id = String(draft.id ?? (code ? icd11CodeToDisorderId(code) : '')).trim()

  if (!draft.id && id) draft.id = id
  if (!draft.classification) draft.classification = 'icd11'
  if (!draft.code && code) draft.code = code
  if (!draft.name_de && nameDe) draft.name_de = nameDe
  if (!draft.crosswalkKey && code) draft.crosswalkKey = code
  if (!draft.sourceRef && code) {
    draft.sourceRef = `operationalisiert nach ICD-11 ${code}`
  }
  if (draft.version == null) draft.version = 1
  if (!draft.status) draft.status = 'draft'
  if (!draft.codingSystems || typeof draft.codingSystems !== 'object') {
    draft.codingSystems = code
      ? { icd11: { code, label_de: nameDe || enrichment.title } }
      : {}
  } else {
    const coding = { ...(draft.codingSystems as Record<string, unknown>) }
    if (!coding.icd11 && code) {
      coding.icd11 = { code, label_de: nameDe || enrichment.title }
    }
    draft.codingSystems = coding
  }
  if (!Array.isArray(draft.differentials_de) || draft.differentials_de.length < 2) {
    draft.differentials_de = [...DEFAULT_DIFFERENTIALS_DE]
  }
  return draft
}

/** Best-effort cleanup of common LLM schema drift before Zod validation. */
export function normalizeDisorderDraftInput(input: unknown): unknown {
  if (!input || typeof input !== 'object') return input
  const draft = { ...(input as Record<string, unknown>) }
  draft.groups = normalizeGroups(draft.groups)
  draft.codingSystems = normalizeCodingSystems(draft.codingSystems, String(draft.name_de ?? ''))
  if (draft.icd11 && typeof draft.icd11 === 'object') {
    const icd11 = { ...(draft.icd11 as Record<string, unknown>) }
    icd11.groups = normalizeGroups(icd11.groups)
    draft.icd11 = icd11
  }
  return draft
}

function collectUniqueIdIssues(
  groups: Array<{ id: string; criteria: Array<{ id: string }> }>,
  prefix: string,
): DisorderDraftValidationIssue[] {
  const issues: DisorderDraftValidationIssue[] = []
  const seen = new Set<string>()
  for (const group of groups) {
    if (seen.has(group.id)) {
      issues.push({ path: `${prefix}.groups`, message: `Duplicate group id: ${group.id}` })
    }
    seen.add(group.id)
    for (const criterion of group.criteria) {
      if (seen.has(criterion.id)) {
        issues.push({ path: `${prefix}.criteria`, message: `Duplicate criterion id: ${criterion.id}` })
      }
      seen.add(criterion.id)
    }
  }
  return issues
}

function collectInclusionIssues(
  groups: Array<{ groupType: string; criteria: unknown[] }>,
  prefix: string,
): DisorderDraftValidationIssue[] {
  const hasInclusion = groups.some(
    (g) => g.groupType === 'inclusion' && Array.isArray(g.criteria) && g.criteria.length > 0,
  )
  return hasInclusion
    ? []
    : [{ path: `${prefix}.groups`, message: 'At least one inclusion group with criteria is required' }]
}

function collectShortCriterionIssues(
  groups: Array<{ criteria: Array<{ id: string; text_de: string }> }>,
  prefix: string,
): DisorderDraftValidationIssue[] {
  const issues: DisorderDraftValidationIssue[] = []
  for (const group of groups) {
    for (const criterion of group.criteria) {
      if (criterion.text_de.trim().length < MIN_CRITERION_CHARS) {
        issues.push({
          path: `${prefix}.criteria.${criterion.id}`,
          message: `Criterion text too short (${criterion.text_de.trim().length} chars; min ${MIN_CRITERION_CHARS})`,
        })
      }
    }
  }
  return issues
}

export function parseDisorderDraftJson(raw: string): unknown {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  const jsonText = fenced?.[1]?.trim() ?? trimmed
  return JSON.parse(jsonText) as unknown
}

export function validateDisorderDraft(input: unknown): DisorderDraftValidationResult {
  const parsed = DisorderDraftSchema.safeParse(normalizeDisorderDraftInput(input))
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.') || 'root',
        message: issue.message,
      })),
    }
  }

  const draft = parsed.data
  const issues: DisorderDraftValidationIssue[] = [
    ...collectInclusionIssues(draft.groups, 'disorder'),
    ...collectShortCriterionIssues(draft.groups, 'disorder'),
    ...collectUniqueIdIssues(draft.groups, 'disorder'),
  ]

  if (draft.icd11) {
    issues.push(
      ...collectInclusionIssues(draft.icd11.groups, 'disorder.icd11'),
      ...collectShortCriterionIssues(draft.icd11.groups, 'disorder.icd11'),
      ...collectUniqueIdIssues(draft.icd11.groups, 'disorder.icd11'),
    )
    const icd10Ids = new Set<string>()
    for (const group of draft.groups) {
      icd10Ids.add(group.id)
      for (const criterion of group.criteria) icd10Ids.add(criterion.id)
    }
    for (const group of draft.icd11.groups) {
      if (icd10Ids.has(group.id)) {
        issues.push({
          path: 'disorder.icd11.groups',
          message: `ICD-11 group id collides with ICD-10 tree: ${group.id}`,
        })
      }
      for (const criterion of group.criteria) {
        if (icd10Ids.has(criterion.id)) {
          issues.push({
            path: 'disorder.icd11.criteria',
            message: `ICD-11 criterion id collides with ICD-10 tree: ${criterion.id}`,
          })
        }
      }
    }
  }

  if (draft.status !== 'draft') {
    issues.push({ path: 'disorder.status', message: 'Generated criteria must remain status: draft' })
  }

  return {
    ok: issues.length === 0,
    draft: issues.length === 0 ? draft : undefined,
    issues,
  }
}

export function validateIcd11TreeDraft(input: unknown): DisorderDraftValidationResult {
  const normalized =
    input && typeof input === 'object' && 'groups' in (input as Record<string, unknown>)
      ? { groups: normalizeGroups((input as Record<string, unknown>).groups), sourceRef: (input as Record<string, unknown>).sourceRef }
      : normalizeDisorderDraftInput(input)
  const parsed = Icd11CriteriaSetDraftSchema.safeParse(normalized)
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.') || 'icd11',
        message: issue.message,
      })),
    }
  }

  const tree = parsed.data
  const issues: DisorderDraftValidationIssue[] = [
    ...collectInclusionIssues(tree.groups, 'icd11'),
    ...collectShortCriterionIssues(tree.groups, 'icd11'),
    ...collectUniqueIdIssues(tree.groups, 'icd11'),
  ]

  return {
    ok: issues.length === 0,
    draft: undefined,
    issues,
  }
}

export function validateCriterionGroupDrafts(input: unknown): DisorderDraftValidationResult {
  const parsed = CriterionGroupDraftSchema.array().min(1).safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.') || 'groups',
        message: issue.message,
      })),
    }
  }
  const groups = parsed.data
  const issues: DisorderDraftValidationIssue[] = [
    ...collectInclusionIssues(groups, 'groups'),
    ...collectShortCriterionIssues(groups, 'groups'),
    ...collectUniqueIdIssues(groups, 'groups'),
  ]
  return { ok: issues.length === 0, issues }
}
