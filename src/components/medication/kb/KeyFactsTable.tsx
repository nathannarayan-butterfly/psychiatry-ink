import { useMemo } from 'react'
import {
  getCypProfile,
  getDepotOptions,
  getPharmacokinetics,
  getSectionKind,
  type GlanceData,
  type KnowledgeBaseDrug,
} from '../../../types/knowledgeBase'
import { getDisplayReceptorProfile } from '../../../utils/medication/receptorAffinity'
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

function deriveKeyFacts(drug: KnowledgeBaseDrug) {
  const explicit =
    drug.sections.find((section) => getSectionKind(section) === 'glance')?.glance ?? ({} as GlanceData)

  let halfLifeSummary: string | null = explicit.halfLifeSummary ?? null
  let activeMetabolite: string | null = null
  for (const section of drug.sections) {
    if (getSectionKind(section) !== 'pk') continue
    const pk = getPharmacokinetics(section)
    if (pk?.halfLifeHours != null) {
      halfLifeSummary = `${pk.halfLifeHours} h${pk.halfLifeNote ? ` · ${pk.halfLifeNote}` : ''}`
    } else if (pk?.halfLifeNote) {
      halfLifeSummary = pk.halfLifeNote
    }
    if (pk?.halfLifeNote && /metabol/i.test(pk.halfLifeNote)) {
      activeMetabolite = pk.halfLifeNote
    }
  }

  let primaryTargets = explicit.primaryTargets ?? []
  if (primaryTargets.length === 0) {
    const profile = getDisplayReceptorProfile(drug)
    primaryTargets = [...profile.entries]
      .filter((entry) => entry.affinityPercent != null)
      .sort((a, b) => (b.affinityPercent ?? 0) - (a.affinityPercent ?? 0))
      .slice(0, 5)
      .map((entry) => entry.target)
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
      .map((key) => firstSentence(drug.sections.find((section) => section.key === key)?.content))
      .find(Boolean) ?? null

  return {
    drugClass: explicit.drugClass ?? drug.drugClass,
    halfLifeSummary,
    activeMetabolite,
    primaryTargets,
    qtcRisk,
    depotAvailable,
    mainCautions,
  }
}

export function KeyFactsTable({ drug, language }: KeyFactsTableProps) {
  const facts = useMemo(() => deriveKeyFacts(drug), [drug])
  const na = kbT(language, 'notSpecified')
  const qtcLabel = facts.qtcRisk
    ? facts.qtcRisk === 'low'
      ? kbT(language, 'qtcLow')
      : facts.qtcRisk === 'moderate'
        ? kbT(language, 'qtcModerate')
        : kbT(language, 'qtcHigh')
    : na

  const rows = [
    ['Class', facts.drugClass || na],
    ['Half-life', facts.halfLifeSummary || na],
    ['Active metabolite', facts.activeMetabolite || na],
    ['Main receptor targets', facts.primaryTargets.length > 0 ? facts.primaryTargets.join(', ') : na],
    ['QTc risk', qtcLabel],
    ['Depot availability', facts.depotAvailable ? kbT(language, 'glanceDepotYes') : kbT(language, 'glanceDepotNo')],
    ['Main clinical cautions', facts.mainCautions || na],
  ] as const

  return (
    <table className="kb-key-facts" aria-label="Key Facts">
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
