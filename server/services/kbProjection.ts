import {
  createDefaultSections,
  DEFAULT_MEDICATIONS_COLLECTION_ID,
  RECEPTOR_PROFILE_VERSION,
  type CypInteraction,
  type DrugSectionKey,
  type EvidenceQuality,
  type KnowledgeBaseDrug,
  type ReceptorAction,
  type ReceptorAffinityEntry,
  type SectionStructuredOverrides,
  type SideEffectEntry,
  type SideEffectFrequency,
  type SideEffectSeverity,
} from '../../src/types/knowledgeBase'
import type { KbSubstanceDetail } from '../../src/types/kbNormalized'
import { normalizeGenericName } from '../../src/utils/kb/normalizeGenericName'
import { getKbSubstanceById } from './kbNormalizedStore'
import { getKbSupabaseAdmin } from './kbSupabaseAdmin'

const PROJECTION_TAG = 'normalized-kb'

function mapEffectType(raw: string): ReceptorAction {
  const n = raw.trim().toLowerCase().replace(/-/g, '_')
  const map: Record<string, ReceptorAction> = {
    antagonist: 'antagonist',
    partial_agonist: 'partial_agonist',
    agonist: 'agonist',
    inverse_agonist: 'inverse_agonist',
    reuptake_inhibitor: 'reuptake_inhibitor',
    reuptake_inhibition: 'reuptake_inhibitor',
    enzyme_inhibitor: 'enzyme_inhibitor',
    mixed: 'mixed',
  }
  return map[n] ?? 'unknown'
}

function mapEvidenceQuality(raw: string): EvidenceQuality {
  const n = raw.trim().toLowerCase()
  if (n === 'high' || n === 'moderate' || n === 'low' || n === 'estimated') return n
  return 'unknown'
}

function mapSideEffectFrequency(raw: string): SideEffectFrequency {
  const n = raw.trim().toLowerCase().replace(/_/g, '')
  if (n === 'verycommon') return 'veryCommon'
  if (n === 'common') return 'common'
  if (n === 'uncommon') return 'uncommon'
  if (n === 'rare') return 'rare'
  return 'unknown'
}

function mapSideEffectSeverity(raw: string, isSevereRisk: boolean): SideEffectSeverity {
  if (isSevereRisk) return 'dangerous'
  const n = raw.trim().toLowerCase()
  if (n === 'mild' || n === 'moderate' || n === 'severe' || n === 'dangerous') return n
  return 'moderate'
}

function mapInteractionSeverity(raw: string): 'major' | 'moderate' | 'minor' {
  const n = raw.trim().toLowerCase()
  if (n === 'major' || n === 'moderate' || n === 'minor') return n
  return 'moderate'
}

function bulletList(items: string[]): string {
  return items.filter(Boolean).map((item) => `• ${item}`).join('\n')
}

function formatDosageGuidance(detail: KbSubstanceDetail): string {
  if (!detail.dosageGuidance.length) return ''
  return detail.dosageGuidance
    .map((d) => {
      const lines = [`**${d.population}**`]
      const doses = [
        d.startDose ? `Start: ${d.startDose}` : null,
        d.targetDose ? `Ziel: ${d.targetDose}` : null,
        d.maxDose ? `Max: ${d.maxDose}` : null,
      ].filter(Boolean)
      if (doses.length) lines.push(doses.join(' · '))
      if (d.titrationNotes) lines.push(`Titration: ${d.titrationNotes}`)
      if (d.administrationNotes) lines.push(`Verabreichung: ${d.administrationNotes}`)
      return lines.join('\n')
    })
    .join('\n\n')
}

function formatMonitoring(detail: KbSubstanceDetail): string {
  if (!detail.monitoring.length) return ''
  return detail.monitoring
    .map((m) => {
      const interval = m.intervalText ? ` (${m.intervalText})` : ''
      const rationale = m.rationale ? ` — ${m.rationale}` : ''
      const priority = m.priority !== 'routine' ? ` [${m.priority}]` : ''
      return `• ${m.parameter}${interval}${rationale}${priority}`
    })
    .join('\n')
}

function formatInteractionsText(detail: KbSubstanceDetail): string {
  if (!detail.interactions.length) return ''
  return detail.interactions
    .map((ix) => {
      const parts = [`**${ix.interactsWith}** (${ix.severity})`]
      if (ix.mechanism) parts.push(ix.mechanism)
      if (ix.clinicalManagement) parts.push(`Management: ${ix.clinicalManagement}`)
      return parts.join(' — ')
    })
    .join('\n\n')
}

function formatSources(detail: KbSubstanceDetail): string {
  if (!detail.sources.length) return ''
  return bulletList(
    detail.sources.map((s) => {
      const parts = [s.citation]
      if (s.url) parts.push(s.url)
      return parts.join(' — ')
    }),
  )
}

function formatReceptorSummary(detail: KbSubstanceDetail): string {
  if (!detail.receptorAffinities.length) return ''
  return detail.receptorAffinities
    .map((r) => {
      const pct = r.affinityPercent != null ? `${r.affinityPercent}%` : '—'
      return `${r.receptor}: ${pct} (${r.effectType})${r.explanation ? ` — ${r.explanation}` : ''}`
    })
    .join('\n')
}

function buildSectionOverrides(detail: KbSubstanceDetail): Partial<Record<DrugSectionKey, string>> {
  const kurzParts = [
    detail.substanceClass,
    detail.primaryPsychiatricUses.length ? detail.primaryPsychiatricUses.join(', ') : null,
    detail.mechanismSummary,
  ].filter(Boolean)

  const besonderheitenParts = [
    detail.uncertaintyNotes ? `Unsicherheiten: ${detail.uncertaintyNotes}` : null,
    detail.geriatricCaution ? `Geriatrie: ${detail.geriatricCaution}` : null,
  ].filter(Boolean)

  return {
    kurzprofil: kurzParts.join('. ').slice(0, 600),
    wirkmechanismus: [detail.mechanismSummary, detail.pharmacodynamicProfile].filter(Boolean).join('\n\n'),
    rezeptorprofil: formatReceptorSummary(detail),
    indikationen: detail.primaryPsychiatricUses.join(', '),
    dosierung: formatDosageGuidance(detail),
    nebenwirkungen: detail.sideEffects.length
      ? ''
      : bulletList(detail.severeRisks),
    kontraindikationen: bulletList(detail.contraindications),
    wechselwirkungen: formatInteractionsText(detail),
    kontrollen: formatMonitoring(detail),
    schwangerschaft: detail.pregnancyLactationCaution ?? '',
    niereLeber: detail.hepaticRenalCaution ?? '',
    besonderheiten: besonderheitenParts.join('\n\n'),
    merksaetze: detail.clinicalPearls ?? '',
    quellen: formatSources(detail),
  }
}

function buildStructuredOverrides(detail: KbSubstanceDetail): SectionStructuredOverrides {
  const sideEffects: SideEffectEntry[] = detail.sideEffects.map((s) => ({
    effect: s.effect,
    system: s.system ?? undefined,
    frequency: mapSideEffectFrequency(s.frequency),
    severity: mapSideEffectSeverity(s.severity, s.isSevereRisk),
    note: s.note ?? undefined,
  }))

  const interactions: CypInteraction[] = detail.interactions.map((ix) => ({
    withDrugOrClass: ix.interactsWith,
    severity: mapInteractionSeverity(ix.severity),
    effect: [ix.mechanism, ix.clinicalManagement].filter(Boolean).join(' — ') || '—',
  }))

  const primaryTargets = detail.receptorAffinities
    .filter((r) => r.affinityPercent != null)
    .sort((a, b) => (b.affinityPercent ?? 0) - (a.affinityPercent ?? 0))
    .slice(0, 4)
    .map((r) => r.receptor)

  return {
    steckbrief: {
      glance: {
        drugClass: detail.substanceClass ?? undefined,
        primaryTargets: primaryTargets.length ? primaryTargets : undefined,
        isEstimated: detail.sourceQuality.startsWith('ai_'),
      },
    },
    nebenwirkungen: sideEffects.length ? { sideEffects } : undefined,
    wechselwirkungen: interactions.length
      ? {
          cyp: {
            enzymes: [],
            interactions,
            isEstimated: detail.sourceQuality.startsWith('ai_'),
          },
        }
      : undefined,
  }
}

function mapReceptorProfile(detail: KbSubstanceDetail): ReceptorAffinityEntry[] {
  return detail.receptorAffinities.map((r) => ({
    target: r.receptor,
    affinityPercent: r.affinityPercent,
    action: mapEffectType(r.effectType),
    evidenceQuality: mapEvidenceQuality(r.confidence),
    sourceNote: r.explanation ?? undefined,
    isEstimated: r.isEstimated,
  }))
}

/** Map a published normalized substance profile to the legacy KnowledgeBaseDrug JSONB shape. */
export function projectKbSubstanceDetailToDrug(
  detail: KbSubstanceDetail,
  existingId?: string | null,
): KnowledgeBaseDrug {
  const now = new Date().toISOString()
  const brandNames = detail.tradeNames.map((t) => t.tradeName)
  const receptors = mapReceptorProfile(detail)
  const hasReceptors = receptors.length > 0

  const drug: KnowledgeBaseDrug = {
    id: existingId ?? `kb-norm-${detail.id}`,
    collectionId: DEFAULT_MEDICATIONS_COLLECTION_ID,
    dataModelVersion: 2,
    genericName: detail.genericName,
    brandNames,
    drugClass: detail.substanceClass ?? '',
    category: detail.category ?? 'Antipsychotika',
    tags: [PROJECTION_TAG, `kb-substance:${detail.id}`],
    createdAt: detail.createdAt,
    updatedAt: now,
    createdByUserId: 'kb-admin',
    createdByDisplayName: 'KB Admin (normalized)',
    lastModifiedAt: now,
    lastModifiedByUserId: 'kb-admin',
    lastModifiedByDisplayName: 'KB Admin (normalized)',
    lastReviewedAt: now,
    lastReviewedByUserId: 'kb-admin',
    lastReviewedByDisplayName: 'KB Admin (normalized)',
    verificationStatus: 'reviewed',
    needsClinicalReview: detail.needsClinicalReview,
    sourceHierarchyLevel: 'normalized-kb-projection',
    sections: createDefaultSections(buildSectionOverrides(detail), buildStructuredOverrides(detail)),
    ...(hasReceptors
      ? {
          receptorProfileVersion: RECEPTOR_PROFILE_VERSION,
          affinityScale: 'relative_log_ki_percent' as const,
          receptorAffinityProfile: receptors,
          lastReceptorProfileUpdatedAt: now,
        }
      : {}),
  }

  return drug
}

async function findExistingDrugId(detail: KbSubstanceDetail): Promise<string | null> {
  const supabase = getKbSupabaseAdmin()
  const normId = `kb-norm-${detail.id}`

  const { data: byNormId, error: e1 } = await supabase
    .from('knowledge_base_drugs')
    .select('id')
    .eq('id', normId)
    .maybeSingle()
  if (e1) throw e1
  if (byNormId?.id) return String(byNormId.id)

  const normalized = normalizeGenericName(detail.genericName)
  const { data: rows, error: e2 } = await supabase
    .from('knowledge_base_drugs')
    .select('id, generic_name')
  if (e2) throw e2

  for (const row of rows ?? []) {
    const name = row.generic_name ? String(row.generic_name) : ''
    if (name && normalizeGenericName(name) === normalized) {
      return String(row.id)
    }
  }

  return null
}

/** Upsert projected drug into knowledge_base_drugs (service role). Returns drug id. */
export async function projectAndUpsertKnowledgeBaseDrug(substanceId: string): Promise<string> {
  const detail = await getKbSubstanceById(substanceId)
  if (!detail) throw new Error(`Substance not found: ${substanceId}`)
  if (detail.status !== 'published' || detail.reviewStatus !== 'approved') {
    throw new Error('Projection requires status=published and review_status=approved')
  }

  const existingId = await findExistingDrugId(detail)
  const drug = projectKbSubstanceDetailToDrug(detail, existingId)

  const supabase = getKbSupabaseAdmin()
  const { error } = await supabase.from('knowledge_base_drugs').upsert(
    {
      id: drug.id,
      data: drug,
      collection_id: drug.collectionId ?? null,
      generic_name: drug.genericName,
      updated_at: drug.updatedAt,
    },
    { onConflict: 'id' },
  )
  if (error) throw error

  return drug.id
}
