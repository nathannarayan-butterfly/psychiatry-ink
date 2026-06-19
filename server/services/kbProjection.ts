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
import type { KbRelease } from '../../src/types/kbReleases'
import type { MedicationMarketAvailability, PrescribingCountryCode } from '../../src/types/knowledgeBase'
import { normalizeGenericName } from '../../src/utils/kb/normalizeGenericName'
import { kbPharmacokineticsToStructuredData } from './kbPharmacokinetics'
import { getKbSubstanceById } from './kbNormalizedStore'
import { getCurrentKbRelease } from './kbReleases'
import { getKbSupabaseAdmin } from './kbSupabaseAdmin'

const PROJECTION_TAG = 'normalized-kb'

/** Prefer a non-empty German value, falling back to the English source. */
function de(deValue: string | null | undefined, enValue: string | null | undefined): string | null {
  const d = typeof deValue === 'string' ? deValue.trim() : ''
  if (d) return deValue as string
  const e = typeof enValue === 'string' ? enValue.trim() : ''
  return e ? (enValue as string) : null
}

/** Prefer a non-empty German array, falling back to the English source array. */
function deArr(deValue: string[] | null | undefined, enValue: string[]): string[] {
  if (Array.isArray(deValue) && deValue.length) return deValue
  return enValue
}

/**
 * Map the AI-seeded English `category` to the German {@link DrugCategory} enum
 * used by the medication UI filter chips. Unknown values fall through unchanged
 * (already German entries are preserved).
 */
function mapCategoryToGerman(raw: string | null): string | null {
  if (!raw) return null
  const n = raw.trim().toLowerCase()
  const map: Record<string, string> = {
    antipsychotics: 'Antipsychotika',
    antipsychotic: 'Antipsychotika',
    antidepressants: 'Antidepressiva',
    antidepressant: 'Antidepressiva',
    'mood stabilizers': 'Phasenprophylaktika',
    'mood stabilizer': 'Phasenprophylaktika',
    anticonvulsants: 'Phasenprophylaktika',
    benzodiazepines: 'Benzodiazepine',
    benzodiazepine: 'Benzodiazepine',
    'anxiolytics/hypnotics': 'Hypnotika',
    anxiolytics: 'Benzodiazepine',
    hypnotics: 'Hypnotika',
    hypnotic: 'Hypnotika',
    adhd: 'ADHS',
    stimulants: 'ADHS',
    stimulant: 'ADHS',
    'cognitive enhancers': 'Antidemenz',
    antidementia: 'Antidemenz',
    'anti-dementia': 'Antidemenz',
    addiction: 'Suchtmedizin',
    'addiction medicine': 'Suchtmedizin',
    'substance use disorders': 'Suchtmedizin',
    emergency: 'Notfallmedikation',
    depot: 'Depotpräparate',
  }
  return map[n] ?? raw
}

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
  // Free-text seeded values vary ("very common", "common at high doses",
  // "less common", "dose-dependent", …). Normalize by collapsing whitespace and
  // matching the leading qualifier so the heatmap intensity is accurate.
  const n = raw.trim().toLowerCase().replace(/[_-]/g, ' ').replace(/\s+/g, ' ')
  if (n.startsWith('very common')) return 'veryCommon'
  if (n.startsWith('less common')) return 'uncommon'
  if (n.startsWith('uncommon')) return 'uncommon'
  if (n.startsWith('common')) return 'common'
  if (n.startsWith('rare')) return 'rare'
  return 'unknown'
}

function mapSideEffectSeverity(raw: string, isSevereRisk: boolean): SideEffectSeverity {
  if (isSevereRisk) return 'dangerous'
  // Collapse compound free-text ("mild to moderate", "moderate-major",
  // "serious", "high"/"low") onto the four-value display enum.
  const n = raw.trim().toLowerCase().replace(/[_-]/g, ' ').replace(/\s+/g, ' ')
  if (n.includes('danger') || n === 'serious' || n === 'high') return 'dangerous'
  if (n.startsWith('severe') || n.includes('to severe') || n.includes('to major')) return 'severe'
  if (n.startsWith('mild') && !n.includes('moderate')) return 'mild'
  if (n === 'low') return 'mild'
  if (n.startsWith('moderate') || n.includes('moderate')) return 'moderate'
  if (n.startsWith('mild')) return 'mild'
  return 'moderate'
}

function mapInteractionSeverity(raw: string): 'major' | 'moderate' | 'minor' {
  const n = raw.trim().toLowerCase()
  if (n === 'major' || n === 'moderate' || n === 'minor') return n
  return 'moderate'
}

/** German label for the free-text interaction severity shown in projected prose. */
function germanInteractionSeverity(raw: string): string {
  const n = raw.trim().toLowerCase()
  if (n === 'contraindicated') return 'kontraindiziert'
  if (n === 'major') return 'schwerwiegend'
  if (n === 'moderate') return 'mäßig'
  if (n === 'minor') return 'gering'
  if (n === 'low') return 'gering'
  if (n.includes('moderate') && n.includes('major')) return 'mäßig bis schwerwiegend'
  return raw
}

function bulletList(items: string[]): string {
  return items.filter(Boolean).map((item) => `• ${item}`).join('\n')
}

function formatDosageGuidance(detail: KbSubstanceDetail): string {
  if (!detail.dosageGuidance.length) return ''
  return detail.dosageGuidance
    .map((d) => {
      const lines = [`**${de(d.populationDe, d.population)}**`]
      const startDose = de(d.startDoseDe, d.startDose)
      const targetDose = de(d.targetDoseDe, d.targetDose)
      const maxDose = de(d.maxDoseDe, d.maxDose)
      const doses = [
        startDose ? `Start: ${startDose}` : null,
        targetDose ? `Ziel: ${targetDose}` : null,
        maxDose ? `Max: ${maxDose}` : null,
      ].filter(Boolean)
      if (doses.length) lines.push(doses.join(' · '))
      const titration = de(d.titrationNotesDe, d.titrationNotes)
      if (titration) lines.push(`Titration: ${titration}`)
      const administration = de(d.administrationNotesDe, d.administrationNotes)
      if (administration) lines.push(`Verabreichung: ${administration}`)
      return lines.join('\n')
    })
    .join('\n\n')
}

function formatMonitoring(detail: KbSubstanceDetail): string {
  if (!detail.monitoring.length) return ''
  return detail.monitoring
    .map((m) => {
      const intervalText = de(m.intervalTextDe, m.intervalText)
      const rationaleText = de(m.rationaleDe, m.rationale)
      const interval = intervalText ? ` (${intervalText})` : ''
      const rationale = rationaleText ? ` — ${rationaleText}` : ''
      const priority = m.priority !== 'routine' ? ` [${m.priority}]` : ''
      return `• ${de(m.parameterDe, m.parameter)}${interval}${rationale}${priority}`
    })
    .join('\n')
}

function formatInteractionsText(detail: KbSubstanceDetail): string {
  if (!detail.interactions.length) return ''
  return detail.interactions
    .map((ix) => {
      const parts = [
        `**${de(ix.interactsWithDe, ix.interactsWith)}** (${germanInteractionSeverity(ix.severity)})`,
      ]
      const mechanism = de(ix.mechanismDe, ix.mechanism)
      if (mechanism) parts.push(mechanism)
      const management = de(ix.clinicalManagementDe, ix.clinicalManagement)
      if (management) parts.push(`Management: ${management}`)
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
      const explanation = de(r.explanationDe, r.explanation)
      return `${r.receptor}: ${pct} (${r.effectType})${explanation ? ` — ${explanation}` : ''}`
    })
    .join('\n')
}

function projectCountryPreparation(
  prep: KbSubstanceDetail['countryPreparations'][number],
  drugId: string,
  genericName: string,
): MedicationMarketAvailability {
  const now = new Date().toISOString()
  return {
    id: `kb-norm-prep-${prep.id}`,
    substanceId: drugId,
    countryCode: prep.countryCode as PrescribingCountryCode,
    tradeName: prep.tradeName ?? '',
    genericName,
    strengthValue: prep.strengthValue,
    strengthUnit: prep.strengthUnit,
    dosageForm: prep.dosageForm,
    route: prep.route,
    verificationStatus: prep.verificationStatus as MedicationMarketAvailability['verificationStatus'],
    notes: prep.notes ?? undefined,
    sourceName: 'KB normalized projection',
    createdAt: now,
    lastModifiedAt: now,
    createdByUserId: 'kb-admin',
    createdByDisplayName: 'KB Admin (normalized)',
    lastModifiedByUserId: 'kb-admin',
    lastModifiedByDisplayName: 'KB Admin (normalized)',
  }
}

async function upsertProjectedPreparations(detail: KbSubstanceDetail, drugId: string): Promise<void> {
  if (!detail.countryPreparations.length) return
  const supabase = getKbSupabaseAdmin()
  const rows = detail.countryPreparations.map((prep) => {
    const entry = projectCountryPreparation(prep, drugId, detail.genericName)
    return {
      id: entry.id,
      data: entry,
      substance_id: entry.substanceId,
      country_code: entry.countryCode,
      verification_status: entry.verificationStatus,
      generic_name: entry.genericName,
      trade_name: entry.tradeName || null,
      updated_at: new Date().toISOString(),
    }
  })
  const { error } = await supabase.from('knowledge_base_preparations').upsert(rows, { onConflict: 'id' })
  if (error) throw error
}

function buildSectionOverrides(detail: KbSubstanceDetail): Partial<Record<DrugSectionKey, string>> {
  const substanceClass = de(detail.substanceClassDe, detail.substanceClass)
  const mechanismSummary = de(detail.mechanismSummaryDe, detail.mechanismSummary)
  const pharmacodynamicProfile = de(detail.pharmacodynamicProfileDe, detail.pharmacodynamicProfile)
  const uses = deArr(detail.primaryPsychiatricUsesDe, detail.primaryPsychiatricUses)
  const uncertaintyNotes = de(detail.uncertaintyNotesDe, detail.uncertaintyNotes)
  const geriatricCaution = de(detail.geriatricCautionDe, detail.geriatricCaution)

  const kurzParts = [
    substanceClass,
    uses.length ? uses.join(', ') : null,
    mechanismSummary,
  ].filter(Boolean)

  const besonderheitenParts = [
    uncertaintyNotes ? `Unsicherheiten: ${uncertaintyNotes}` : null,
    geriatricCaution ? `Geriatrie: ${geriatricCaution}` : null,
  ].filter(Boolean)

  const pkSummary = detail.pharmacokinetics
    ? de(detail.pharmacokinetics.summaryDe, detail.pharmacokinetics.summary)
    : null

  return {
    kurzprofil: kurzParts.join('. ').slice(0, 600),
    wirkmechanismus: [mechanismSummary, pharmacodynamicProfile].filter(Boolean).join('\n\n'),
    rezeptorprofil: formatReceptorSummary(detail),
    pharmakokinetik: pkSummary ?? '',
    indikationen: uses.join(', '),
    dosierung: formatDosageGuidance(detail),
    nebenwirkungen: detail.sideEffects.length
      ? ''
      : bulletList(deArr(detail.severeRisksDe, detail.severeRisks)),
    kontraindikationen: bulletList(deArr(detail.contraindicationsDe, detail.contraindications)),
    wechselwirkungen: formatInteractionsText(detail),
    kontrollen: formatMonitoring(detail),
    schwangerschaft: de(detail.pregnancyLactationCautionDe, detail.pregnancyLactationCaution) ?? '',
    niereLeber: de(detail.hepaticRenalCautionDe, detail.hepaticRenalCaution) ?? '',
    besonderheiten: besonderheitenParts.join('\n\n'),
    merksaetze: de(detail.clinicalPearlsDe, detail.clinicalPearls) ?? '',
    quellen: formatSources(detail),
  }
}

function buildStructuredOverrides(detail: KbSubstanceDetail): SectionStructuredOverrides {
  const sideEffects: SideEffectEntry[] = detail.sideEffects.map((s) => ({
    effect: de(s.effectDe, s.effect) ?? s.effect,
    system: de(s.systemDe, s.system) ?? undefined,
    frequency: mapSideEffectFrequency(s.frequency),
    severity: mapSideEffectSeverity(s.severity, s.isSevereRisk),
    note: de(s.noteDe, s.note) ?? undefined,
  }))

  const interactions: CypInteraction[] = detail.interactions.map((ix) => ({
    withDrugOrClass: de(ix.interactsWithDe, ix.interactsWith) ?? ix.interactsWith,
    severity: mapInteractionSeverity(ix.severity),
    effect:
      [de(ix.mechanismDe, ix.mechanism), de(ix.clinicalManagementDe, ix.clinicalManagement)]
        .filter(Boolean)
        .join(' — ') || '—',
  }))

  const primaryTargets = detail.receptorAffinities
    .filter((r) => r.affinityPercent != null)
    .sort((a, b) => (b.affinityPercent ?? 0) - (a.affinityPercent ?? 0))
    .slice(0, 4)
    .map((r) => r.receptor)

  const pkStructured = detail.pharmacokinetics
    ? kbPharmacokineticsToStructuredData(detail.pharmacokinetics)
    : undefined
  const halfLifeSummary =
    pkStructured?.halfLifeHours != null
      ? `${pkStructured.halfLifeHours} h${pkStructured.halfLifeNote ? ` (${pkStructured.halfLifeNote})` : ''}`
      : undefined

  return {
    steckbrief: {
      glance: {
        drugClass: de(detail.substanceClassDe, detail.substanceClass) ?? undefined,
        halfLifeSummary,
        primaryTargets: primaryTargets.length ? primaryTargets : undefined,
        isEstimated: detail.sourceQuality.startsWith('ai_'),
      },
    },
    ...(pkStructured
      ? {
          pharmakokinetik: {
            pk: pkStructured,
          },
        }
      : {}),
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
  release?: KbRelease | null,
): KnowledgeBaseDrug {
  const now = new Date().toISOString()
  const brandNames = detail.tradeNames.map((t) => t.tradeName)
  const receptors = mapReceptorProfile(detail)
  const hasReceptors = receptors.length > 0

  const sections = createDefaultSections(buildSectionOverrides(detail), buildStructuredOverrides(detail))
  if (detail.mechanismSummary) {
    const wirk = sections.find((s) => s.key === 'wirkmechanismus')
    if (wirk) {
      wirk.fieldProvenance = [{ fieldPath: 'mechanismSummary', sourceType: 'ai_draft' }]
    }
  }
  const firstReceptor = detail.receptorAffinities[0]
  if (firstReceptor) {
    const rezeptor = sections.find((s) => s.key === 'rezeptorprofil')
    if (rezeptor) {
      rezeptor.fieldProvenance = [
        {
          fieldPath: `receptorAffinities.${firstReceptor.receptor}.action`,
          sourceType: 'ai_draft',
        },
      ]
    }
  }

  const drug: KnowledgeBaseDrug = {
    id: existingId ?? `kb-norm-${detail.id}`,
    collectionId: DEFAULT_MEDICATIONS_COLLECTION_ID,
    dataModelVersion: 2,
    ...(release
      ? {
          kbReleaseVersion: release.versionLabel,
          kbReleaseSyncedAt: release.syncedAt,
        }
      : {}),
    genericName: detail.genericName,
    brandNames,
    drugClass: de(detail.substanceClassDe, detail.substanceClass) ?? '',
    category: mapCategoryToGerman(detail.category) ?? 'Antipsychotika',
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
    sections,
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

/**
 * Substances (normalized English INN) that already have a hand-curated German
 * seed entry in `knowledge_base_drugs` (see `knowledgeBaseDrugSeedData.ts`,
 * German names like "Clozapin", "Olanzapin"). The English INN and the German
 * INN normalize differently ("clozapine" vs "clozapin"), so the projection's
 * name-based dedup misses them and would create a duplicate English-named row
 * (audit v2 finding L-003 / V2-M1). For these the curated German entry is the
 * canonical display, so projection is skipped to avoid a duplicate.
 *
 * These rows remain regenerable: remove an entry here and re-run
 * `kb:publish-all` to re-create the projected row.
 */
const LEGACY_CURATED_GERMAN_DUPLICATES = new Set<string>([
  'clozapine',
  'olanzapine',
  'risperidone',
  'aripiprazole',
  'sertraline',
])

/** Hand-curated German seed rows keyed by normalized English INN. */
const LEGACY_CURATED_DRUG_IDS: Record<string, string> = {
  olanzapine: 'seed-olanzapine-003',
  risperidone: 'seed-risperidone-002',
  aripiprazole: 'seed-aripiprazole-004',
  sertraline: 'seed-sertraline-005',
}

function applyPharmacokineticsToDrug(
  drug: KnowledgeBaseDrug,
  detail: KbSubstanceDetail,
): KnowledgeBaseDrug {
  if (!detail.pharmacokinetics) return drug
  const pkText = de(detail.pharmacokinetics.summaryDe, detail.pharmacokinetics.summary) ?? ''
  const pkStructured = kbPharmacokineticsToStructuredData(detail.pharmacokinetics)
  const now = new Date().toISOString()
  const sections = drug.sections.map((section) => {
    if (section.key === 'pharmakokinetik') {
      return { ...section, kind: 'pk' as const, content: pkText, pk: pkStructured }
    }
    if (section.key === 'steckbrief' && pkStructured.halfLifeHours != null) {
      const halfLifeSummary = `${pkStructured.halfLifeHours} h${
        pkStructured.halfLifeNote ? ` (${pkStructured.halfLifeNote})` : ''
      }`
      return {
        ...section,
        glance: { ...(section.glance ?? {}), halfLifeSummary },
      }
    }
    return section
  })
  return {
    ...drug,
    sections,
    updatedAt: now,
    lastModifiedAt: now,
  }
}

export async function mergePharmacokineticsIntoKnowledgeBaseDrug(
  drugId: string,
  detail: KbSubstanceDetail,
): Promise<void> {
  if (!detail.pharmacokinetics) return
  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase.from('knowledge_base_drugs').select('data').eq('id', drugId).single()
  if (error) throw error
  if (!data?.data) throw new Error(`Drug not found: ${drugId}`)
  const updated = applyPharmacokineticsToDrug(data.data as KnowledgeBaseDrug, detail)
  const { error: upsertError } = await supabase.from('knowledge_base_drugs').upsert(
    {
      id: drugId,
      data: updated,
      collection_id: updated.collectionId ?? null,
      generic_name: updated.genericName,
      updated_at: updated.updatedAt,
    },
    { onConflict: 'id' },
  )
  if (upsertError) throw upsertError
}

/** Patch hand-curated German legacy drugs with PK from normalized substances. */
export async function syncLegacyCuratedPharmacokinetics(): Promise<string[]> {
  const patched: string[] = []
  for (const inn of LEGACY_CURATED_GERMAN_DUPLICATES) {
    const legacyId = LEGACY_CURATED_DRUG_IDS[inn]
    if (!legacyId) continue
    const supabase = getKbSupabaseAdmin()
    const { data: substance } = await supabase
      .from('kb_substances')
      .select('id')
      .eq('normalized_generic_name', inn)
      .maybeSingle()
    if (!substance?.id) continue
    const detail = await getKbSubstanceById(String(substance.id))
    if (!detail?.pharmacokinetics) continue
    await mergePharmacokineticsIntoKnowledgeBaseDrug(legacyId, detail)
    patched.push(legacyId)
  }
  return patched
}

/** Upsert projected drug into knowledge_base_drugs (service role). Returns drug id. */
export async function projectAndUpsertKnowledgeBaseDrug(substanceId: string): Promise<string> {
  const detail = await getKbSubstanceById(substanceId)
  if (!detail) throw new Error(`Substance not found: ${substanceId}`)
  if (detail.status !== 'published' || detail.reviewStatus !== 'approved') {
    throw new Error('Projection requires status=published and review_status=approved')
  }

  // L-003: a curated German entry already exists for this substance — keep it
  // canonical instead of projecting a duplicate English-named row.
  const inn = normalizeGenericName(detail.genericName)
  if (LEGACY_CURATED_GERMAN_DUPLICATES.has(inn)) {
    const legacyId = LEGACY_CURATED_DRUG_IDS[inn]
    if (legacyId && detail.pharmacokinetics) {
      await mergePharmacokineticsIntoKnowledgeBaseDrug(legacyId, detail)
    }
    const normId = `kb-norm-${detail.id}`
    const release = await getCurrentKbRelease()
    const projected = projectKbSubstanceDetailToDrug(detail, normId, release)
    const supabase = getKbSupabaseAdmin()
    const { error: normError } = await supabase.from('knowledge_base_drugs').upsert(
      {
        id: projected.id,
        data: projected,
        collection_id: projected.collectionId ?? null,
        generic_name: projected.genericName,
        updated_at: projected.updatedAt,
      },
      { onConflict: 'id' },
    )
    if (normError) throw normError
    return legacyId ?? normId
  }

  const existingId = await findExistingDrugId(detail)
  const release = await getCurrentKbRelease()
  const drug = projectKbSubstanceDetailToDrug(detail, existingId, release)

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

  await upsertProjectedPreparations(detail, drug.id)

  return drug.id
}
