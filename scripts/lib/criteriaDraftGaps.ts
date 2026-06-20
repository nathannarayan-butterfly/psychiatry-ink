import type { PrismaClient } from '@prisma/client'
import { DISORDER_CRITERIA } from '../../src/data/diagnosisCriteria/registry.ts'
import type { Disorder } from '../../src/data/diagnosisCriteria/schema.ts'

export type CriteriaDraftPriority = 'all' | 'gap' | 'substance' | 'unlinked' | 'icd11_tree'

export interface CriteriaDraftTarget {
  key: string
  mode: 'full_disorder' | 'icd11_tree'
  priority: number
  reason: string
  disorderId?: string
  icd10Code?: string
  icd11Code?: string
  title: string
  catalogueEntryId?: string
  existingDisorder?: Disorder
  metadata?: Record<string, unknown>
}

function normCode(code: string | undefined | null): string {
  return (code ?? '').trim().toUpperCase().replace(/\s+/g, '')
}

export function disordersWithoutNativeIcd11(): Disorder[] {
  return DISORDER_CRITERIA.filter((d) => !d.icd11?.groups?.length)
}

export function isSubstanceSyndrome(disorder: Disorder): boolean {
  return /_(acute_intoxication|withdrawal|withdrawal_delirium|substance_induced_psychotic)$/.test(
    disorder.id,
  )
}

export function isGapCoverageDisorder(disorder: Disorder): boolean {
  if (disorder.id.startsWith('dementia_') && disorder.code.startsWith('F02')) return true
  if (/^(f\d|crosswalk|unspecified|residual|other|stem)/i.test(disorder.id)) return true
  const gapPrefixes = [
    'dementia_other',
    'unspecified_',
    'residual_',
    'other_',
    'organic_secondary',
    'delirium_',
    'amnestic_',
    'personality_',
    'mental_retardation',
    'disorder_of_',
    'hyperkinetic_',
    'conduct_',
    'emotional_',
    'tic_',
    'stereotyped_',
  ]
  return gapPrefixes.some((prefix) => disorder.id.startsWith(prefix))
}

export function buildDisorderTargets(priority: CriteriaDraftPriority): CriteriaDraftTarget[] {
  const targets: CriteriaDraftTarget[] = []
  const noNative = disordersWithoutNativeIcd11()

  for (const disorder of noNative) {
    const icd11Code = disorder.codingSystems.icd11?.code
    if (!icd11Code) continue

    const substance = isSubstanceSyndrome(disorder)
    const gap = isGapCoverageDisorder(disorder)

    if (priority === 'substance' && !substance) continue
    if (priority === 'gap' && !gap) continue
    if (priority === 'icd11_tree' && substance) {
      // substance syndromes are valid icd11_tree targets too
    }

    let score = 50
    let reason = 'Disorder has ICD-11 crosswalk but no native ICD-11 tree'
    if (substance) {
      score += 30
      reason = 'Substance intoxication/withdrawal syndrome lacking native ICD-11 tree'
    }
    if (gap) {
      score += 20
      reason = 'Gap-coverage disorder lacking native ICD-11 tree'
    }
    if (disorder.groups.some((g) => g.groupType === 'inclusion' && g.criteria.length >= 3)) {
      score += 5
    }

    targets.push({
      key: `disorder:${disorder.id}`,
      mode: 'icd11_tree',
      priority: score,
      reason,
      disorderId: disorder.id,
      icd10Code: normCode(disorder.code),
      icd11Code: normCode(icd11Code),
      title: disorder.name_de,
      existingDisorder: disorder,
    })
  }

  return targets.sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title, 'de'))
}

export async function buildUnlinkedCatalogueTargets(
  prisma: PrismaClient,
  limit = 500,
): Promise<CriteriaDraftTarget[]> {
  const entries = await prisma.diagnosisEntry.findMany({
    where: {
      isPsychiatric: true,
      isSelectable: true,
      catalogue: { system: 'ICD11MMS' },
      criteriaLinks: { none: {} },
      chapterCode: { startsWith: '06' },
    },
    include: { catalogue: true },
    orderBy: { codeNormalized: 'asc' },
    take: limit,
  })

  return entries.map((entry, index) => ({
    key: `catalogue:${entry.id}`,
    mode: 'full_disorder' as const,
    priority: 40 - Math.min(index, 20),
    reason: 'Selectable ICD-11 Ch06 catalogue entry without criteria link',
    icd11Code: normCode(entry.codeNormalized),
    title: entry.title,
    catalogueEntryId: entry.id,
    metadata: {
      chapterCode: entry.chapterCode,
      chapterTitle: entry.chapterTitle,
      blockCode: entry.blockCode,
      blockTitle: entry.blockTitle,
      description: entry.description,
      metadataJson: entry.metadataJson,
    },
  }))
}

export async function listCriteriaDraftTargets(
  prisma: PrismaClient,
  priority: CriteriaDraftPriority,
  limit: number,
): Promise<CriteriaDraftTarget[]> {
  if (priority === 'unlinked') {
    return (await buildUnlinkedCatalogueTargets(prisma, limit)).slice(0, limit)
  }

  const disorderTargets = buildDisorderTargets(priority === 'all' ? 'all' : priority)

  const merged =
    priority === 'all'
      ? [
          ...disorderTargets,
          ...(await buildUnlinkedCatalogueTargets(prisma, Math.max(limit, 100))),
        ]
      : disorderTargets

  const deduped = new Map<string, CriteriaDraftTarget>()
  for (const target of merged) {
    if (!deduped.has(target.key)) deduped.set(target.key, target)
  }

  return [...deduped.values()]
    .sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title, 'de'))
    .slice(0, limit)
}

export async function summarizeCriteriaGaps(prisma: PrismaClient): Promise<{
  totalDisorders: number
  nativeIcd11Trees: number
  withoutNativeIcd11: number
  withIcd11RefNoTree: number
  gapCoverageNoTree: number
  substanceSyndromeNoTree: number
  icd11PsychiatricEntries: number
  icd11SelectableUnlinked: number
  icd11WithLinks: number
}> {
  const noNative = disordersWithoutNativeIcd11()
  const withIcd11Ref = noNative.filter((d) => d.codingSystems.icd11?.code)
  const gapNoTree = noNative.filter(isGapCoverageDisorder)
  const substanceNoTree = noNative.filter(isSubstanceSyndrome)

  const icd11Entries = await prisma.diagnosisEntry.findMany({
    where: { catalogue: { system: 'ICD11MMS' }, isPsychiatric: true },
    include: { criteriaLinks: true },
  })
  const selectableUnlinked = icd11Entries.filter(
    (e) => e.isSelectable && e.criteriaLinks.length === 0,
  )
  const withLinks = icd11Entries.filter((e) => e.criteriaLinks.length > 0)

  return {
    totalDisorders: DISORDER_CRITERIA.length,
    nativeIcd11Trees: DISORDER_CRITERIA.length - noNative.length,
    withoutNativeIcd11: noNative.length,
    withIcd11RefNoTree: withIcd11Ref.length,
    gapCoverageNoTree: gapNoTree.length,
    substanceSyndromeNoTree: substanceNoTree.length,
    icd11PsychiatricEntries: icd11Entries.length,
    icd11SelectableUnlinked: selectableUnlinked.length,
    icd11WithLinks: withLinks.length,
  }
}

export function findTargetByDisorderId(disorderId: string): CriteriaDraftTarget | undefined {
  return buildDisorderTargets('all').find((t) => t.disorderId === disorderId)
}

export function findTargetByCode(
  code: string,
  system: 'ICD10GM' | 'ICD11MMS',
): CriteriaDraftTarget | undefined {
  const normalized = normCode(code)
  if (system === 'ICD10GM') {
    const disorder = DISORDER_CRITERIA.find(
      (d) =>
        normCode(d.code) === normalized ||
        normCode(d.crosswalkKey) === normalized ||
        normCode(d.codingSystems.icd10?.code) === normalized,
    )
    if (!disorder) return undefined
    return findTargetByDisorderId(disorder.id)
  }
  const disorder = DISORDER_CRITERIA.find(
    (d) => normCode(d.codingSystems.icd11?.code) === normalized,
  )
  if (disorder) return findTargetByDisorderId(disorder.id)
  return undefined
}
