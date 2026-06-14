import { useMemo } from 'react'
import {
  getCypProfile,
  getDepotOptions,
  getPharmacokinetics,
  getSectionKind,
  type GlanceData,
  type KnowledgeBaseDrug,
} from '../../../types/knowledgeBase'
import { getReceptorDisplayLabel } from '../../../data/receptorProfile'
import { getDisplayReceptorProfile } from '../../../utils/medication/receptorAffinity'
import { kbT } from './kbStrings'

interface AtAGlanceStripProps {
  drug: KnowledgeBaseDrug
  language: string
}

type QtcRisk = 'low' | 'moderate' | 'high'

/**
 * Derive a KPI snapshot from the drug + its sections, overlaying any explicit
 * `glance` payload stored on the Steckbrief section. Everything degrades to
 * "n/a" so the strip renders for legacy drugs too.
 */
function deriveGlance(drug: KnowledgeBaseDrug): Required<Pick<GlanceData, 'drugClass'>> & {
  halfLifeSummary: string | null
  primaryTargets: string[]
  qtcRisk: QtcRisk | null
  pregnancy: string | null
  lactation: string | null
  depotAvailable: boolean
} {
  const explicit =
    drug.sections.find((s) => getSectionKind(s) === 'glance')?.glance ?? ({} as GlanceData)

  // Half-life from the PK section.
  let halfLifeSummary: string | null = explicit.halfLifeSummary ?? null
  for (const s of drug.sections) {
    if (getSectionKind(s) !== 'pk') continue
    const pk = getPharmacokinetics(s)
    if (pk?.halfLifeHours != null) {
      halfLifeSummary = `${pk.halfLifeHours} h${pk.halfLifeNote ? ` · ${pk.halfLifeNote}` : ''}`
    } else if (pk?.halfLifeNote) {
      halfLifeSummary = pk.halfLifeNote
    }
  }

  // Primary receptor targets (top 3 by relative affinity).
  let primaryTargets = explicit.primaryTargets ?? []
  if (primaryTargets.length === 0) {
    const profile = getDisplayReceptorProfile(drug)
    primaryTargets = [...profile.entries]
      .filter((e) => e.affinityPercent != null)
      .sort((a, b) => (b.affinityPercent ?? 0) - (a.affinityPercent ?? 0))
      .slice(0, 3)
      .map((e) => getReceptorDisplayLabel(e.target))
  }

  // QTc risk from a CYP section or explicit glance.
  let qtcRisk: QtcRisk | null = explicit.qtcRisk ?? null
  for (const s of drug.sections) {
    const cyp = getCypProfile(s)
    if (cyp?.qtcRisk) qtcRisk = cyp.qtcRisk
  }

  // Depot availability.
  const depotFromSections = drug.sections.some(
    (s) => getDepotOptions(s).some((o) => !o.isShortActingNotDepot),
  )
  const depotFromTags = (drug.tags ?? []).some((t) => /depot|lai/i.test(t))
  const depotAvailable = explicit.depotAvailable ?? (depotFromSections || depotFromTags)

  return {
    drugClass: explicit.drugClass ?? drug.drugClass,
    halfLifeSummary,
    primaryTargets,
    qtcRisk,
    pregnancy: explicit.pregnancy ?? null,
    lactation: explicit.lactation ?? null,
    depotAvailable,
  }
}

export function AtAGlanceStrip({ drug, language }: AtAGlanceStripProps) {
  const glance = useMemo(() => deriveGlance(drug), [drug])
  const na = kbT(language, 'notSpecified')

  const qtcLabel = (risk: QtcRisk): string =>
    risk === 'low'
      ? kbT(language, 'qtcLow')
      : risk === 'moderate'
        ? kbT(language, 'qtcModerate')
        : kbT(language, 'qtcHigh')

  return (
    <div className="kb-glance" role="group" aria-label={kbT(language, 'glanceTitle')}>
      <div className="kb-glance__item">
        <span className="kb-glance__label">{kbT(language, 'glanceClass')}</span>
        <span className="kb-glance__value">{glance.drugClass || na}</span>
      </div>
      <div className="kb-glance__item">
        <span className="kb-glance__label">{kbT(language, 'glanceHalfLife')}</span>
        <span className="kb-glance__value">{glance.halfLifeSummary || na}</span>
      </div>
      <div className="kb-glance__item">
        <span className="kb-glance__label">{kbT(language, 'glanceTargets')}</span>
        <span className="kb-glance__value">
          {glance.primaryTargets.length > 0 ? (
            <span className="kb-glance__chips">
              {glance.primaryTargets.map((tgt) => (
                <span key={tgt} className="kb-glance__chip">
                  {tgt}
                </span>
              ))}
            </span>
          ) : (
            na
          )}
        </span>
      </div>
      <div className="kb-glance__item">
        <span className="kb-glance__label">{kbT(language, 'glanceQtc')}</span>
        {glance.qtcRisk ? (
          <span className={`kb-glance__badge kb-glance__badge--qtc-${glance.qtcRisk}`}>
            {qtcLabel(glance.qtcRisk)}
          </span>
        ) : (
          <span className="kb-glance__value">{na}</span>
        )}
      </div>
      <div className="kb-glance__item">
        <span className="kb-glance__label">{kbT(language, 'glanceDepot')}</span>
        <span
          className={`kb-glance__badge${
            glance.depotAvailable ? ' kb-glance__badge--depot' : ' kb-glance__badge--muted'
          }`}
        >
          {glance.depotAvailable ? kbT(language, 'glanceDepotYes') : kbT(language, 'glanceDepotNo')}
        </span>
      </div>
      {glance.pregnancy ? (
        <div className="kb-glance__item">
          <span className="kb-glance__label">{kbT(language, 'glancePregnancy')}</span>
          <span className="kb-glance__value">{glance.pregnancy}</span>
        </div>
      ) : null}
      {glance.lactation ? (
        <div className="kb-glance__item">
          <span className="kb-glance__label">{kbT(language, 'glanceLactation')}</span>
          <span className="kb-glance__value">{glance.lactation}</span>
        </div>
      ) : null}
    </div>
  )
}
