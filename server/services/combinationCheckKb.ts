import type {
  CombinationInteractionType,
  CombinationSeverity,
  MedicationCombinationKnowledge,
} from '../../src/types/combinationCheck'
import { buildCombinationKey } from '../../src/utils/combinationCheck/combinationKey'
import { getDrugsForSubstance } from '../../src/data/psychDrugReference/index'
import type { InteractionEntry } from '../../src/data/psychDrugReference/schema'
import type { ClinicalLanguage } from '../utils/resolveClinicalLanguage'
import { isKbAdminConfigured } from './kbSupabaseAdmin'
import { getKbSupabaseAdmin } from './kbSupabaseAdmin'

export interface ResolvedSubstance {
  inputName: string
  substanceId: string
  displayName: string
}

function normalizeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9äöüß]/gi, '')
}

function namesMatch(a: string, b: string): boolean {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (na.length < 2 || nb.length < 2) return false
  return na.includes(nb) || nb.includes(na)
}

function mapReferenceSeverity(severity: InteractionEntry['severity']): CombinationSeverity {
  switch (severity) {
    case 'contraindicated':
      return 'critical'
    case 'severe':
      return 'high'
    case 'moderate':
      return 'moderate'
    default:
      return 'low'
  }
}

function mapKbSeverity(severity: string): CombinationSeverity {
  const s = severity.toLowerCase()
  if (s.includes('contra') || s === 'critical' || s === 'major') return 'critical'
  if (s.includes('severe') || s === 'high') return 'high'
  if (s.includes('moderate')) return 'moderate'
  if (s.includes('minor') || s.includes('mild') || s === 'low') return 'low'
  return 'moderate'
}

function inferInteractionType(
  mechanism: string | undefined,
  severity: CombinationSeverity,
): CombinationInteractionType {
  const m = (mechanism ?? '').toLowerCase()
  if (severity === 'critical' && (m.includes('kontrain') || m.includes('contra'))) {
    return 'contraindication'
  }
  if (m.includes('cyp') || m.includes('metabol') || m.includes('clearance') || m.includes('spiegel')) {
    return 'pharmacokinetic'
  }
  if (m.includes('monitor') || m.includes('kontroll') || m.includes('ekg') || m.includes('labor')) {
    return 'monitoring_required'
  }
  if (m.includes('addit') || m.includes('sedier') || m.includes('qt')) {
    return 'additive_side_effect'
  }
  if (m.includes('rezeptor') || m.includes('agon') || m.includes('antagon')) {
    return 'pharmacodynamic'
  }
  return severity === 'none' ? 'uncertain' : 'pharmacodynamic'
}

export async function resolveSubstances(names: string[]): Promise<ResolvedSubstance[]> {
  const resolved: ResolvedSubstance[] = []

  if (isKbAdminConfigured()) {
    try {
      const supabase = getKbSupabaseAdmin()
      const { data: substances } = await supabase
        .from('kb_substances')
        .select('id, generic_name, normalized_generic_name')
      const { data: tradeNames } = await supabase
        .from('kb_substance_trade_names')
        .select('substance_id, trade_name')

      for (const inputName of names) {
        const norm = normalizeName(inputName)
        if (norm.length < 2) continue

        let matchId: string | null = null
        let displayName = inputName.trim()

        for (const row of substances ?? []) {
          const generic = String(row.generic_name)
          const normalized = String(row.normalized_generic_name)
          if (norm === normalized || namesMatch(generic, inputName)) {
            matchId = String(row.id)
            displayName = generic
            break
          }
        }

        if (!matchId) {
          for (const tn of tradeNames ?? []) {
            if (namesMatch(String(tn.trade_name), inputName)) {
              matchId = String(tn.substance_id)
              const sub = (substances ?? []).find((s) => String(s.id) === matchId)
              displayName = sub ? String(sub.generic_name) : inputName.trim()
              break
            }
          }
        }

        resolved.push({
          inputName,
          substanceId: matchId ?? `name:${norm}`,
          displayName,
        })
      }
      return resolved
    } catch (err) {
      console.warn('[combination-check] KB substance resolve failed, falling back to reference:', err)
    }
  }

  for (const inputName of names) {
    const norm = normalizeName(inputName)
    const refDrugs = getDrugsForSubstance(inputName)
    resolved.push({
      inputName,
      substanceId: refDrugs[0]?.id ?? `name:${norm}`,
      displayName: refDrugs[0]?.genericName ?? inputName.trim(),
    })
  }
  return resolved
}

function pickLocalizedText(
  de: string | undefined,
  en: string | undefined,
  language: ClinicalLanguage,
  fallbackDe: string,
  fallbackEn: string,
): string {
  const deText = de?.trim()
  const enText = en?.trim()
  if (language === 'de') return deText || enText || fallbackDe
  if (language === 'en') return enText || deText || fallbackEn
  return enText || deText || fallbackEn
}

function referenceInteractionNotes(
  interaction: InteractionEntry,
  language: ClinicalLanguage,
): { mainRisk: string; monitoring?: string; clinicalManagement?: string } {
  const mainRisk = pickLocalizedText(
    interaction.clinicalNoteDe,
    interaction.clinicalNoteEn,
    language,
    'Wechselwirkung beachten',
    'Consider interaction',
  )
  const note = pickLocalizedText(
    interaction.clinicalNoteDe,
    interaction.clinicalNoteEn,
    language,
    '',
    '',
  )
  return {
    mainRisk,
    monitoring: note || undefined,
    clinicalManagement: note || undefined,
  }
}

async function lookupKbPair(
  substanceA: ResolvedSubstance,
  substanceB: ResolvedSubstance,
  language: ClinicalLanguage,
): Promise<MedicationCombinationKnowledge | null> {
  const combinationKey = buildCombinationKey(substanceA.substanceId, substanceB.substanceId)

  if (isKbAdminConfigured() && !substanceA.substanceId.startsWith('name:')) {
    try {
      const supabase = getKbSupabaseAdmin()
      const ids = [substanceA.substanceId, substanceB.substanceId].filter((id) => !id.startsWith('name:'))
      if (ids.length > 0) {
        const { data: notes } = await supabase
          .from('kb_interaction_notes')
          .select('*')
          .in('substance_id', ids)

        for (const note of notes ?? []) {
          const sid = String(note.substance_id)
          const other =
            sid === substanceA.substanceId ? substanceB : substanceA
          if (namesMatch(String(note.interacts_with), other.displayName) ||
              namesMatch(String(note.interacts_with), other.inputName)) {
            const mechanism = note.mechanism ? String(note.mechanism) : undefined
            const severity = mapKbSeverity(String(note.severity))
            const mainRisk =
              String(note.clinical_management ?? note.mechanism ?? 'Wechselwirkung beachten').trim()
            return {
              combinationKey,
              substanceAId: substanceA.substanceId,
              substanceBId: substanceB.substanceId,
              substanceAName: substanceA.displayName,
              substanceBName: substanceB.displayName,
              interactionType: inferInteractionType(mechanism, severity),
              severity,
              mainRisk,
              mechanism,
              monitoring: note.clinical_management ? String(note.clinical_management) : undefined,
              clinicalManagement: note.clinical_management ? String(note.clinical_management) : undefined,
              source: 'knowledge_base',
              kbInteractionId: String(note.id),
            }
          }
        }
      }
    } catch (err) {
      console.warn('[combination-check] kb_interaction_notes lookup failed:', err)
    }
  }

  const drugsA = getDrugsForSubstance(substanceA.inputName)
  const drugsB = getDrugsForSubstance(substanceB.inputName)
  for (const drugA of drugsA) {
    for (const interaction of drugA.interactions) {
      const matchesB =
        drugsB.some((d) => namesMatch(interaction.interactsWith, d.genericName)) ||
        namesMatch(interaction.interactsWith, substanceB.inputName) ||
        namesMatch(interaction.interactsWith, substanceB.displayName)
      if (matchesB) {
        const severity = mapReferenceSeverity(interaction.severity)
        const mechanism = interaction.mechanismNote
        const notes = referenceInteractionNotes(interaction, language)
        return {
          combinationKey,
          substanceAId: substanceA.substanceId,
          substanceBId: substanceB.substanceId,
          substanceAName: substanceA.displayName,
          substanceBName: substanceB.displayName,
          interactionType: inferInteractionType(mechanism, severity),
          severity,
          mainRisk: notes.mainRisk,
          mechanism,
          monitoring: notes.monitoring,
          clinicalManagement: notes.clinicalManagement,
          source: 'knowledge_base',
        }
      }
    }
  }

  return null
}

export async function lookupInternalCombinations(
  substanceNames: string[],
  language: ClinicalLanguage,
): Promise<MedicationCombinationKnowledge[]> {
  const resolved = await resolveSubstances(substanceNames)
  const results: MedicationCombinationKnowledge[] = []

  for (let i = 0; i < resolved.length; i++) {
    for (let j = i + 1; j < resolved.length; j++) {
      const hit = await lookupKbPair(resolved[i]!, resolved[j]!, language)
      if (hit) results.push(hit)
    }
  }

  return results
}

export function severitiesConflict(
  kb: CombinationSeverity,
  ai: CombinationSeverity,
): boolean {
  const rank: Record<CombinationSeverity, number> = {
    none: 0,
    low: 1,
    moderate: 2,
    high: 3,
    critical: 4,
  }
  return Math.abs(rank[kb] - rank[ai]) >= 2
}
