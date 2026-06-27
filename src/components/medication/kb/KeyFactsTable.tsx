import { useMemo } from 'react'
import {
  getCypProfile,
  getDepotOptions,
  getPharmacokinetics,
  getSectionKind,
  pickKbLocalizedText,
  type GlanceData,
  type KnowledgeBaseDrug,
} from '../../../types/knowledgeBase'
import { getReceptorDisplayLabel } from '../../../data/receptorProfile'
import { getDisplayReceptorProfile } from '../../../utils/medication/receptorAffinity'
import { getPsychClassLabel } from '../../../utils/medication/psychClass'
import { kbT } from './kbStrings'

type QtcRisk = 'low' | 'moderate' | 'high'

interface KeyFactsTableProps {
  drug: KnowledgeBaseDrug
  language: string
}

function firstSentence(text: string | undefined): string | null {
  const clean = text?.replace(/\s+/g, ' ').trim()
  if (!clean) return null
  const match = clean.match(/^(.{1,180}?[.!?])(?:\s|$)/)
  return match?.[1] ?? (clean.length > 180 ? `${clean.slice(0, 177).trim()}...` : clean)
}

function deriveKeyFacts(drug: KnowledgeBaseDrug, language: string) {
  const explicit =
    drug.sections.find((section) => getSectionKind(section) === 'glance')?.glance ?? ({} as GlanceData)

  let halfLifeSummary: string | null =
    pickKbLocalizedText(explicit.halfLifeSummary, explicit.halfLifeSummaryEn, language) || null
  let activeMetabolite: string | null = null
  for (const section of drug.sections) {
    if (getSectionKind(section) !== 'pk') continue
    const pk = getPharmacokinetics(section)
    const localizedNote = pickKbLocalizedText(pk?.halfLifeNote, pk?.halfLifeNoteEn, language) || null
    if (pk?.halfLifeHours != null) {
      halfLifeSummary = `${pk.halfLifeHours} h${localizedNote ? ` · ${localizedNote}` : ''}`
    } else if (localizedNote) {
      halfLifeSummary = localizedNote
    }
    // `metabol` matches both the German ("Metabolit") and English ("metabolite")
    // spellings, so the active-metabolite hint resolves in either locale.
    if (localizedNote && /metabol/i.test(localizedNote)) {
      activeMetabolite = localizedNote
    }
  }

  let primaryTargets = explicit.primaryTargets ?? []
  if (primaryTargets.length === 0) {
    const profile = getDisplayReceptorProfile(drug)
    primaryTargets = [...profile.entries]
      .filter((entry) => entry.affinityPercent != null)
      .sort((a, b) => (b.affinityPercent ?? 0) - (a.affinityPercent ?? 0))
      .slice(0, 5)
      .map((entry) => getReceptorDisplayLabel(entry.target))
  }

  let qtcRisk: QtcRisk | null = explicit.qtcRisk ?? null
  for (const section of drug.sections) {
    const cyp = getCypProfile(section)
    if (cyp?.qtcRisk) qtcRisk = cyp.qtcRisk
  }

  const depotFromSections = drug.sections.some((section) =>
    getDepotOptions(section).some((option) => !option.isShortActingNotDepot),
  )
  const depotFromTags = (drug.tags ?? []).some((tag) => /depot|lai/i.test(tag))
  const depotAvailable = explicit.depotAvailable ?? (depotFromSections || depotFromTags)

  const cautionSources = ['qtc', 'kontraindikationen', 'kontrollen', 'besonderheiten'] as const
  const mainCautions =
    cautionSources
      .map((key) => {
        const section = drug.sections.find((entry) => entry.key === key)
        if (!section) return null
        return firstSentence(pickKbLocalizedText(section.content, section.contentEn, language))
      })
      .find(Boolean) ?? null

  return {
    drugClass: pickKbLocalizedText(explicit.drugClass ?? drug.drugClass, explicit.drugClassEn ?? drug.drugClassEn, language),
    halfLifeSummary,
    activeMetabolite,
    primaryTargets,
    qtcRisk,
    depotAvailable,
    mainCautions,
  }
}

export function KeyFactsTable({ drug, language }: KeyFactsTableProps) {
  const facts = useMemo(() => deriveKeyFacts(drug, language), [drug, language])
  const na = kbT(language, 'notSpecified')
  const qtcLabel = facts.qtcRisk
    ? facts.qtcRisk === 'low'
      ? kbT(language, 'qtcLow')
      : facts.qtcRisk === 'moderate'
        ? kbT(language, 'qtcModerate')
        : kbT(language, 'qtcHigh')
    : na

  const rows = [
    [kbT(language, 'classification'), getPsychClassLabel(drug.psychClass, language)],
    [kbT(language, 'glanceClass'), facts.drugClass || na],
    [kbT(language, 'glanceHalfLife'), facts.halfLifeSummary || na],
    [kbT(language, 'kfActiveMetabolite'), facts.activeMetabolite || na],
    [kbT(language, 'kfMainTargets'), facts.primaryTargets.length > 0 ? facts.primaryTargets.join(', ') : na],
    [kbT(language, 'glanceQtc'), qtcLabel],
    [kbT(language, 'glanceDepot'), facts.depotAvailable ? kbT(language, 'glanceDepotYes') : kbT(language, 'glanceDepotNo')],
    [kbT(language, 'kfMainCautions'), facts.mainCautions || na],
  ] as const

  return (
    <table className="kb-key-facts" aria-label={kbT(language, 'kfTableLabel')}>
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <th scope="row">{label}</th>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
