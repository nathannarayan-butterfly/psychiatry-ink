import type { SubstanceProfileDraft } from '../../src/schemas/kb/substanceProfile'
import type {
  KbAiGeneration,
  KbCountryPreparation,
  KbDosageGuidance,
  KbInteractionNote,
  KbMonitoringRecommendation,
  KbReceptorAffinity,
  KbSideEffect,
  KbSource,
  KbSubstance,
  KbSubstanceDetail,
  KbSubstanceTradeName,
} from '../../src/types/kbNormalized'
import { writeAiSeedProvenance } from './kbProvenance'
import { getKbSupabaseAdmin } from './kbSupabaseAdmin'

function mapSubstance(row: Record<string, unknown>): KbSubstance {
  return {
    id: String(row.id),
    genericName: String(row.generic_name),
    normalizedGenericName: String(row.normalized_generic_name),
    substanceClass: row.substance_class ? String(row.substance_class) : null,
    category: row.category ? String(row.category) : null,
    primaryPsychiatricUses: Array.isArray(row.primary_psychiatric_uses)
      ? (row.primary_psychiatric_uses as string[])
      : [],
    mechanismSummary: row.mechanism_summary ? String(row.mechanism_summary) : null,
    pharmacodynamicProfile: row.pharmacodynamic_profile ? String(row.pharmacodynamic_profile) : null,
    clinicalPearls: row.clinical_pearls ? String(row.clinical_pearls) : null,
    uncertaintyNotes: row.uncertainty_notes ? String(row.uncertainty_notes) : null,
    pregnancyLactationCaution: row.pregnancy_lactation_caution
      ? String(row.pregnancy_lactation_caution)
      : null,
    geriatricCaution: row.geriatric_caution ? String(row.geriatric_caution) : null,
    hepaticRenalCaution: row.hepatic_renal_caution ? String(row.hepatic_renal_caution) : null,
    contraindications: Array.isArray(row.contraindications) ? (row.contraindications as string[]) : [],
    severeRisks: Array.isArray(row.severe_risks) ? (row.severe_risks as string[]) : [],
    substanceClassDe: row.substance_class_de ? String(row.substance_class_de) : null,
    mechanismSummaryDe: row.mechanism_summary_de ? String(row.mechanism_summary_de) : null,
    pharmacodynamicProfileDe: row.pharmacodynamic_profile_de
      ? String(row.pharmacodynamic_profile_de)
      : null,
    clinicalPearlsDe: row.clinical_pearls_de ? String(row.clinical_pearls_de) : null,
    uncertaintyNotesDe: row.uncertainty_notes_de ? String(row.uncertainty_notes_de) : null,
    pregnancyLactationCautionDe: row.pregnancy_lactation_caution_de
      ? String(row.pregnancy_lactation_caution_de)
      : null,
    geriatricCautionDe: row.geriatric_caution_de ? String(row.geriatric_caution_de) : null,
    hepaticRenalCautionDe: row.hepatic_renal_caution_de ? String(row.hepatic_renal_caution_de) : null,
    primaryPsychiatricUsesDe: Array.isArray(row.primary_psychiatric_uses_de)
      ? (row.primary_psychiatric_uses_de as string[])
      : null,
    contraindicationsDe: Array.isArray(row.contraindications_de)
      ? (row.contraindications_de as string[])
      : null,
    severeRisksDe: Array.isArray(row.severe_risks_de) ? (row.severe_risks_de as string[]) : null,
    translationStatus: String(row.translation_status ?? 'pending'),
    translatedAt: row.translated_at ? String(row.translated_at) : null,
    status: row.status as KbSubstance['status'],
    reviewStatus: row.review_status as KbSubstance['reviewStatus'],
    sourceQuality: row.source_quality as KbSubstance['sourceQuality'],
    needsClinicalReview: Boolean(row.needs_clinical_review),
    countryDefault: String(row.country_default ?? 'DE'),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export async function listKbSubstances(filters?: {
  status?: string
  category?: string
  reviewStatus?: string
}): Promise<KbSubstance[]> {
  const supabase = getKbSupabaseAdmin()
  let query = supabase.from('kb_substances').select('*').order('generic_name')
  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.category) query = query.eq('category', filters.category)
  if (filters?.reviewStatus) query = query.eq('review_status', filters.reviewStatus)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((row) => mapSubstance(row as Record<string, unknown>))
}

export async function getKbSubstanceById(id: string): Promise<KbSubstanceDetail | null> {
  const supabase = getKbSupabaseAdmin()
  const { data: substance, error } = await supabase.from('kb_substances').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!substance) return null

  const [tradeNames, affinities, sideEffects, monitoring, dosage, interactions, sources, countryPreparations, generations] =
    await Promise.all([
      supabase.from('kb_substance_trade_names').select('*').eq('substance_id', id),
      supabase.from('kb_receptor_affinities').select('*').eq('substance_id', id).order('sort_order'),
      supabase.from('kb_side_effects').select('*').eq('substance_id', id).order('sort_order'),
      supabase.from('kb_monitoring_recommendations').select('*').eq('substance_id', id).order('sort_order'),
      supabase.from('kb_dosage_guidance').select('*').eq('substance_id', id).order('sort_order'),
      supabase.from('kb_interaction_notes').select('*').eq('substance_id', id).order('sort_order'),
      supabase.from('kb_sources').select('*').eq('substance_id', id).order('created_at'),
      supabase.from('kb_country_preparations').select('*').eq('substance_id', id).order('strength_value'),
      supabase
        .from('kb_ai_generations')
        .select('*')
        .eq('substance_id', id)
        .order('created_at', { ascending: false })
        .limit(1),
    ])

  const latestGen = generations.data?.[0] as Record<string, unknown> | undefined

  return {
    ...mapSubstance(substance as Record<string, unknown>),
    tradeNames: (tradeNames.data ?? []).map(
      (r): KbSubstanceTradeName => ({
        id: String(r.id),
        substanceId: String(r.substance_id),
        tradeName: String(r.trade_name),
        countryCode: r.country_code ? String(r.country_code) : null,
        isPrimary: Boolean(r.is_primary),
      }),
    ),
    receptorAffinities: (affinities.data ?? []).map(
      (r): KbReceptorAffinity => ({
        id: String(r.id),
        substanceId: String(r.substance_id),
        receptor: String(r.receptor),
        affinityPercent: r.affinity_percent != null ? Number(r.affinity_percent) : null,
        effectType: String(r.effect_type),
        confidence: String(r.confidence),
        explanation: r.explanation ? String(r.explanation) : null,
        explanationDe: r.explanation_de ? String(r.explanation_de) : null,
        isEstimated: Boolean(r.is_estimated),
      }),
    ),
    sideEffects: (sideEffects.data ?? []).map(
      (r): KbSideEffect => ({
        id: String(r.id),
        substanceId: String(r.substance_id),
        effect: String(r.effect),
        system: r.system ? String(r.system) : null,
        frequency: String(r.frequency),
        severity: String(r.severity),
        isSevereRisk: Boolean(r.is_severe_risk),
        note: r.note ? String(r.note) : null,
        effectDe: r.effect_de ? String(r.effect_de) : null,
        systemDe: r.system_de ? String(r.system_de) : null,
        noteDe: r.note_de ? String(r.note_de) : null,
      }),
    ),
    monitoring: (monitoring.data ?? []).map(
      (r): KbMonitoringRecommendation => ({
        id: String(r.id),
        substanceId: String(r.substance_id),
        parameter: String(r.parameter),
        intervalText: r.interval_text ? String(r.interval_text) : null,
        rationale: r.rationale ? String(r.rationale) : null,
        priority: String(r.priority),
        parameterDe: r.parameter_de ? String(r.parameter_de) : null,
        intervalTextDe: r.interval_text_de ? String(r.interval_text_de) : null,
        rationaleDe: r.rationale_de ? String(r.rationale_de) : null,
      }),
    ),
    dosageGuidance: (dosage.data ?? []).map(
      (r): KbDosageGuidance => ({
        id: String(r.id),
        substanceId: String(r.substance_id),
        population: String(r.population),
        startDose: r.start_dose ? String(r.start_dose) : null,
        targetDose: r.target_dose ? String(r.target_dose) : null,
        maxDose: r.max_dose ? String(r.max_dose) : null,
        titrationNotes: r.titration_notes ? String(r.titration_notes) : null,
        administrationNotes: r.administration_notes ? String(r.administration_notes) : null,
        populationDe: r.population_de ? String(r.population_de) : null,
        startDoseDe: r.start_dose_de ? String(r.start_dose_de) : null,
        targetDoseDe: r.target_dose_de ? String(r.target_dose_de) : null,
        maxDoseDe: r.max_dose_de ? String(r.max_dose_de) : null,
        titrationNotesDe: r.titration_notes_de ? String(r.titration_notes_de) : null,
        administrationNotesDe: r.administration_notes_de ? String(r.administration_notes_de) : null,
      }),
    ),
    interactions: (interactions.data ?? []).map(
      (r): KbInteractionNote => ({
        id: String(r.id),
        substanceId: String(r.substance_id),
        interactsWith: String(r.interacts_with),
        severity: String(r.severity),
        mechanism: r.mechanism ? String(r.mechanism) : null,
        clinicalManagement: r.clinical_management ? String(r.clinical_management) : null,
        interactsWithDe: r.interacts_with_de ? String(r.interacts_with_de) : null,
        mechanismDe: r.mechanism_de ? String(r.mechanism_de) : null,
        clinicalManagementDe: r.clinical_management_de ? String(r.clinical_management_de) : null,
      }),
    ),
    sources: (sources.data ?? []).map(
      (r): KbSource => ({
        id: String(r.id),
        substanceId: String(r.substance_id),
        sourceType: String(r.source_type),
        citation: String(r.citation),
        url: r.url ? String(r.url) : null,
        accessedAt: r.accessed_at ? String(r.accessed_at) : null,
      }),
    ),
    countryPreparations: (countryPreparations.data ?? []).map(
      (r): KbCountryPreparation => ({
        id: String(r.id),
        substanceId: String(r.substance_id),
        countryCode: String(r.country_code),
        dosageForm: String(r.dosage_form),
        strengthValue: String(r.strength_value),
        strengthUnit: String(r.strength_unit),
        route: String(r.route),
        tradeName: r.trade_name ? String(r.trade_name) : null,
        verificationStatus: String(r.verification_status),
        notes: r.notes ? String(r.notes) : null,
      }),
    ),
    latestGeneration: latestGen
      ? ({
          id: String(latestGen.id),
          substanceId: latestGen.substance_id ? String(latestGen.substance_id) : null,
          genericName: String(latestGen.generic_name),
          provider: String(latestGen.provider),
          model: String(latestGen.model),
          promptVersion: String(latestGen.prompt_version),
          status: latestGen.status as KbAiGeneration['status'],
          rawResponse: latestGen.raw_response,
          validatedPayload: latestGen.validated_payload,
          validationErrors: latestGen.validation_errors,
          createdAt: String(latestGen.created_at),
        } satisfies KbAiGeneration)
      : null,
  }
}

export async function substanceExists(normalizedName: string): Promise<string | null> {
  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase
    .from('kb_substances')
    .select('id')
    .eq('normalized_generic_name', normalizedName)
    .maybeSingle()
  if (error) throw error
  return data?.id ? String(data.id) : null
}

export async function insertNormalizedProfile(params: {
  draft: SubstanceProfileDraft
  category: string
  countryDefault: string
  substanceId?: string
}): Promise<string> {
  const supabase = getKbSupabaseAdmin()
  const { draft, category, countryDefault, substanceId } = params

  const substanceRow = {
    ...(substanceId ? { id: substanceId } : {}),
    generic_name: draft.genericName,
    normalized_generic_name: draft.normalizedGenericName,
    substance_class: draft.substanceClass ?? null,
    category,
    primary_psychiatric_uses: draft.primaryPsychiatricUses,
    mechanism_summary: draft.mechanismSummary ?? null,
    pharmacodynamic_profile: draft.pharmacodynamicProfile ?? null,
    clinical_pearls: draft.clinicalPearls ?? null,
    uncertainty_notes: draft.uncertaintyNotes ?? null,
    pregnancy_lactation_caution: draft.pregnancyLactationCaution ?? null,
    geriatric_caution: draft.geriatricCaution ?? null,
    hepatic_renal_caution: draft.hepaticRenalCaution ?? null,
    contraindications: draft.contraindications,
    severe_risks: draft.severeRisks,
    status: 'ai_draft',
    review_status: 'unreviewed',
    source_quality: 'ai_generated_unverified',
    needs_clinical_review: true,
    country_default: countryDefault,
  }

  const { data: inserted, error: insertError } = await supabase
    .from('kb_substances')
    .upsert(substanceRow, { onConflict: 'normalized_generic_name' })
    .select('id')
    .single()
  if (insertError) throw insertError
  const sid = String(inserted.id)

  // Clear child rows on rerun
  await Promise.all([
    supabase.from('kb_substance_trade_names').delete().eq('substance_id', sid),
    supabase.from('kb_receptor_affinities').delete().eq('substance_id', sid),
    supabase.from('kb_side_effects').delete().eq('substance_id', sid),
    supabase.from('kb_monitoring_recommendations').delete().eq('substance_id', sid),
    supabase.from('kb_dosage_guidance').delete().eq('substance_id', sid),
    supabase.from('kb_interaction_notes').delete().eq('substance_id', sid),
    supabase.from('kb_sources').delete().eq('substance_id', sid),
    supabase.from('kb_country_preparations').delete().eq('substance_id', sid),
    supabase.from('kb_field_provenance').delete().eq('substance_id', sid),
  ])

  if (draft.commonTradeNames.length) {
    const { error } = await supabase.from('kb_substance_trade_names').insert(
      draft.commonTradeNames.map((name, i) => ({
        substance_id: sid,
        trade_name: name,
        is_primary: i === 0,
      })),
    )
    if (error) throw error
  }

  if (draft.sourceHints.length) {
    const { data: sources, error } = await supabase
      .from('kb_sources')
      .insert(
        draft.sourceHints.map((citation) => ({
          substance_id: sid,
          citation,
          source_type: 'reference',
        })),
      )
      .select('id')
    if (error) throw error
    void sources
  }

  if (draft.receptorAffinityProfile.length) {
    const { error } = await supabase.from('kb_receptor_affinities').insert(
      draft.receptorAffinityProfile.map((r, i) => ({
        substance_id: sid,
        receptor: r.receptor,
        affinity_percent: r.affinityPercent ?? null,
        effect_type: r.effectType ?? 'unknown',
        confidence: r.confidence ?? 'unknown',
        explanation: r.explanation ?? null,
        is_estimated: r.isEstimated ?? true,
        raw_ki_nm: r.rawKiNm ?? null,
        p_ki: r.pKi ?? null,
        sort_order: i,
      })),
    )
    if (error) throw error
  }

  const sideRows = [
    ...draft.importantSideEffects.map((s) => ({ ...s, severe: false })),
    ...draft.severeRisks.map((effect) => ({
      effect,
      system: undefined,
      frequency: 'unknown',
      severity: 'dangerous',
      note: undefined,
      severe: true,
    })),
  ]
  if (sideRows.length) {
    const { error } = await supabase.from('kb_side_effects').insert(
      sideRows.map((s, i) => ({
        substance_id: sid,
        effect: s.effect,
        system: s.system ?? null,
        frequency: s.frequency ?? 'unknown',
        severity: s.severity ?? 'mild',
        is_severe_risk: s.severe,
        note: s.note ?? null,
        sort_order: i,
      })),
    )
    if (error) throw error
  }

  if (draft.monitoringRecommendations.length) {
    const { error } = await supabase.from('kb_monitoring_recommendations').insert(
      draft.monitoringRecommendations.map((m, i) => ({
        substance_id: sid,
        parameter: m.parameter,
        interval_text: m.interval ?? null,
        rationale: m.rationale ?? null,
        priority: m.priority ?? 'routine',
        sort_order: i,
      })),
    )
    if (error) throw error
  }

  if (draft.commonDosageGuidance.length) {
    const { error } = await supabase.from('kb_dosage_guidance').insert(
      draft.commonDosageGuidance.map((d, i) => ({
        substance_id: sid,
        population: d.population ?? 'adult',
        start_dose: d.startDose ?? null,
        target_dose: d.targetDose ?? null,
        max_dose: d.maxDose ?? null,
        titration_notes: d.titrationNotes ?? null,
        administration_notes: d.administrationNotes ?? null,
        sort_order: i,
      })),
    )
    if (error) throw error
  }

  if (draft.importantInteractions.length) {
    const { error } = await supabase.from('kb_interaction_notes').insert(
      draft.importantInteractions.map((ix, i) => ({
        substance_id: sid,
        interacts_with: ix.interactsWith,
        severity: ix.severity ?? 'moderate',
        mechanism: ix.mechanism ?? null,
        clinical_management: ix.clinicalManagement ?? null,
        sort_order: i,
      })),
    )
    if (error) throw error
  }

  if (draft.countryPreparations?.length) {
    const { error } = await supabase.from('kb_country_preparations').insert(
      draft.countryPreparations.map((p) => ({
        substance_id: sid,
        country_code: p.countryCode,
        dosage_form: p.dosageForm,
        strength_value: p.strengthValue,
        strength_unit: p.strengthUnit,
        route: p.route,
        trade_name: p.tradeName ?? null,
        verification_status: 'ai_draft',
        notes: p.notes ?? null,
      })),
    )
    if (error) throw error
  }

  const { error: revError } = await supabase.from('kb_revision_history').insert({
    substance_id: sid,
    revision_type: 'ai_seed',
    changes_summary: `AI seed for ${draft.genericName}`,
    created_by: 'seed-script',
  })
  if (revError) throw revError

  await writeAiSeedProvenance(sid, draft)

  return sid
}

export async function recordAiGeneration(record: {
  substanceId: string | null
  genericName: string
  provider: string
  model: string
  status: 'success' | 'failed_validation' | 'failed_api' | 'dry_run'
  rawResponse?: unknown
  validatedPayload?: unknown
  validationErrors?: unknown
  durationMs?: number
}): Promise<void> {
  const supabase = getKbSupabaseAdmin()
  const { error } = await supabase.from('kb_ai_generations').insert({
    substance_id: record.substanceId,
    generic_name: record.genericName,
    provider: record.provider,
    model: record.model,
    prompt_version: 'v1',
    status: record.status,
    raw_response: record.rawResponse ?? null,
    validated_payload: record.validatedPayload ?? null,
    validation_errors: record.validationErrors ?? null,
    duration_ms: record.durationMs ?? null,
  })
  if (error) throw error
}

export async function updateKbSubstance(
  id: string,
  patch: Partial<{
    genericName: string
    substanceClass: string
    mechanismSummary: string
    clinicalPearls: string
    status: string
    reviewStatus: string
    needsClinicalReview: boolean
  }>,
  revisionType: 'manual_edit' | 'publish' | 'archive' | 'approve' | 'reject' = 'manual_edit',
): Promise<void> {
  const supabase = getKbSupabaseAdmin()
  const row: Record<string, unknown> = {}
  if (patch.genericName != null) row.generic_name = patch.genericName
  if (patch.substanceClass != null) row.substance_class = patch.substanceClass
  if (patch.mechanismSummary != null) row.mechanism_summary = patch.mechanismSummary
  if (patch.clinicalPearls != null) row.clinical_pearls = patch.clinicalPearls
  if (patch.status != null) row.status = patch.status
  if (patch.reviewStatus != null) row.review_status = patch.reviewStatus
  if (patch.needsClinicalReview != null) row.needs_clinical_review = patch.needsClinicalReview
  if (patch.status === 'published' && patch.reviewStatus === 'approved') {
    row.source_quality = 'curated'
  }

  const { error } = await supabase.from('kb_substances').update(row).eq('id', id)
  if (error) throw error

  await supabase.from('kb_revision_history').insert({
    substance_id: id,
    revision_type: revisionType,
    changes_summary: JSON.stringify(patch),
    created_by: 'kb-admin',
  })
}
