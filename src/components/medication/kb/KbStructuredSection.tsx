import { useState } from 'react'
import {
  getCypProfile,
  getDepotOptions,
  getPharmacokinetics,
  getSectionKind,
  getSideEffects,
  getTitrationSchedule,
  pickKbLocalizedText,
  type CypProfile,
  type DepotOption,
  type DrugSection,
  type KnowledgeBaseDrug,
  type PharmacokineticData,
  type TitrationSchedule,
} from '../../../types/knowledgeBase'
import { kbT } from './kbStrings'
import { AtAGlanceStrip } from './AtAGlanceStrip'
import { PkCurve } from './charts/PkCurve'
import { TitrationChart } from './charts/TitrationChart'
import { SideEffectHeatmap } from './charts/SideEffectHeatmap'
import { DepotTimeline } from './charts/DepotTimeline'

interface KbStructuredSectionProps {
  section: DrugSection
  drug: KnowledgeBaseDrug
  language: string
}

/** Inline "Details" disclosure holding verbose text / a table for graph sections. */
function Details({ language, children }: { language: string; children: React.ReactNode }) {
  return (
    <details className="kb-details">
      <summary className="kb-details__summary">{kbT(language, 'details')}</summary>
      <div className="kb-details__body">{children}</div>
    </details>
  )
}

function NarrativeText({ content }: { content: string }) {
  if (!content.trim()) return null
  return <p className="kb-structured__text">{content}</p>
}

/**
 * Resolve the canonical (German) {@link DrugSection.content} or its English
 * variant ({@link DrugSection.contentEn}) based on the active UI locale.
 * Centralized so every reading-mode branch in this file picks the same field.
 */
function getSectionContent(section: DrugSection, language: string): string {
  return pickKbLocalizedText(section.content, section.contentEn, language)
}

function PkStrip({ pk, language }: { pk: PharmacokineticData; language: string }) {
  const items: { label: string; value: string }[] = []
  if (pk.halfLifeHours != null)
    items.push({ label: kbT(language, 'pkHalfLife'), value: `${pk.halfLifeHours} ${kbT(language, 'hours')}` })
  if (pk.tmaxHours != null)
    items.push({ label: kbT(language, 'pkTmax'), value: `${pk.tmaxHours} ${kbT(language, 'hours')}` })
  if (pk.timeToSteadyStateDays != null)
    items.push({ label: kbT(language, 'pkSteadyState'), value: `${pk.timeToSteadyStateDays} ${kbT(language, 'days')}` })
  if (pk.bioavailabilityPercent != null)
    items.push({ label: kbT(language, 'pkBioavailability'), value: `${pk.bioavailabilityPercent} %` })
  if (pk.proteinBindingPercent != null)
    items.push({ label: kbT(language, 'pkProteinBinding'), value: `${pk.proteinBindingPercent} %` })
  if (pk.tdm && (pk.tdm.lowNgMl != null || pk.tdm.highNgMl != null)) {
    const unit = pk.tdm.unit ?? 'ng/ml'
    items.push({
      label: kbT(language, 'pkTdm'),
      value: `${pk.tdm.lowNgMl ?? '—'}–${pk.tdm.highNgMl ?? '—'} ${unit}`,
    })
  }
  return (
    <div className="kb-pk-strip">
      {items.map((it) => (
        <div key={it.label} className="kb-pk-strip__item">
          <span className="kb-pk-strip__value">{it.value}</span>
          <span className="kb-pk-strip__label">{it.label}</span>
        </div>
      ))}
    </div>
  )
}

function TitrationTable({ schedule, language }: { schedule: TitrationSchedule; language: string }) {
  const unit = pickKbLocalizedText(schedule.unit, schedule.unitEn, language) || 'mg'
  return (
    <table className="kb-mini-table">
      <thead>
        <tr>
          <th>{kbT(language, 'colDay')}</th>
          <th>{kbT(language, 'colStep')}</th>
          <th>{kbT(language, 'colDose')}</th>
          <th>{kbT(language, 'colNote')}</th>
        </tr>
      </thead>
      <tbody>
        {[...schedule.steps]
          .sort((a, b) => a.startDay - b.startDay)
          .map((s, i) => {
            const stepLabel = pickKbLocalizedText(s.label, s.labelEn, language)
            const stepNote = pickKbLocalizedText(s.note, s.noteEn, language)
            return (
              <tr key={i}>
                <td>{s.startDay}</td>
                <td>{stepLabel || '—'}</td>
                <td>{s.doseMg == null ? kbT(language, 'titrationStop') : `${s.doseMg} ${unit}`}</td>
                <td>{stepNote}</td>
              </tr>
            )
          })}
      </tbody>
    </table>
  )
}

function CypView({ cyp, language }: { cyp: CypProfile; language: string }) {
  const roleLabel = (role: 'substrate' | 'inhibitor' | 'inducer') =>
    role === 'substrate'
      ? kbT(language, 'cypSubstrate')
      : role === 'inhibitor'
        ? kbT(language, 'cypInhibitor')
        : kbT(language, 'cypInducer')
  return (
    <div className="kb-cyp">
      {cyp.enzymes.length > 0 ? (
        <div className="kb-cyp__chips">
          {cyp.enzymes.map((en, i) => {
            const enzymeNote = pickKbLocalizedText(en.note, en.noteEn, language)
            const enzymeStrength = pickKbLocalizedText(en.strength, en.strengthEn, language)
            return (
              <span key={i} className={`kb-cyp__chip kb-cyp__chip--${en.role}`} title={enzymeNote || undefined}>
                <span className="kb-cyp__enzyme">{en.enzyme}</span>
                <span className="kb-cyp__role">{roleLabel(en.role)}</span>
                {enzymeStrength ? <span className="kb-cyp__strength">{enzymeStrength}</span> : null}
              </span>
            )
          })}
        </div>
      ) : null}
      {cyp.interactions && cyp.interactions.length > 0 ? (
        <ul className="kb-cyp__interactions">
          {cyp.interactions.map((ix, i) => (
            <li key={i} className={`kb-cyp__interaction kb-cyp__interaction--${ix.severity}`}>
              <span className="kb-cyp__ix-sev" aria-hidden />
              <span className="kb-cyp__ix-drug">{pickKbLocalizedText(ix.withDrugOrClass, ix.withDrugOrClassEn, language)}</span>
              <span className="kb-cyp__ix-effect">{pickKbLocalizedText(ix.effect, ix.effectEn, language)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {cyp.qtcRisk ? (
        <span className={`kb-glance__badge kb-glance__badge--qtc-${cyp.qtcRisk}`}>
          {kbT(language, 'qtcRisk')}:{' '}
          {cyp.qtcRisk === 'low'
            ? kbT(language, 'qtcLow')
            : cyp.qtcRisk === 'moderate'
              ? kbT(language, 'qtcModerate')
              : kbT(language, 'qtcHigh')}
        </span>
      ) : null}
    </div>
  )
}

function DepotAccordion({ options, language }: { options: DepotOption[]; language: string }) {
  const [openIdx, setOpenIdx] = useState(0)
  return (
    <div className="kb-depot-accordion">
      {options.map((opt, i) => {
        const open = openIdx === i
        const localizedName = pickKbLocalizedText(opt.name, opt.nameEn, language) || opt.name
        const name = opt.brandName ? `${localizedName} · ${opt.brandName}` : localizedName
        const localizedDoseEquivalence = pickKbLocalizedText(opt.doseEquivalence, opt.doseEquivalenceEn, language)
        const localizedPostInjectionMonitoring = pickKbLocalizedText(
          opt.postInjectionMonitoring,
          opt.postInjectionMonitoringEn,
          language,
        )
        const localizedSourceNote = pickKbLocalizedText(opt.sourceNote, opt.sourceNoteEn, language)
        return (
          <div key={i} className={`kb-depot-accordion__item${open ? ' kb-depot-accordion__item--open' : ''}`}>
            <button
              type="button"
              className="kb-depot-accordion__head"
              aria-expanded={open}
              onClick={() => setOpenIdx(open ? -1 : i)}
            >
              <span className="kb-depot-accordion__name">{name}</span>
              <span className="kb-depot-accordion__interval">
                {kbT(language, 'depotEvery')} {opt.injectionIntervalDays} {kbT(language, 'days')}
              </span>
            </button>
            {open ? (
              <div className="kb-depot-accordion__body">
                {opt.isShortActingNotDepot ? (
                  <p className="kb-callout kb-callout--warn">{kbT(language, 'depotShortActing')}</p>
                ) : null}
                <DepotTimeline option={opt} language={language} />
                <ul className="kb-depot-facts">
                  {localizedDoseEquivalence ? (
                    <li>
                      <strong>{kbT(language, 'depotEquivalence')}:</strong> {localizedDoseEquivalence}
                    </li>
                  ) : null}
                  <li>
                    <strong>{kbT(language, 'depotOverlap')}:</strong>{' '}
                    {opt.oralOverlapDays > 0
                      ? `${opt.oralOverlapDays} ${kbT(language, 'days')}`
                      : kbT(language, 'depotNoOverlap')}
                  </li>
                  {opt.firstMaintenanceDay != null ? (
                    <li>
                      <strong>{kbT(language, 'depotFirstMaintenance')}:</strong>{' '}
                      {kbT(language, 'axisDay')} {opt.firstMaintenanceDay}
                    </li>
                  ) : null}
                  {opt.timeToSteadyStateWeeks != null ? (
                    <li>
                      <strong>{kbT(language, 'depotSteadyState')}:</strong> ~{opt.timeToSteadyStateWeeks}{' '}
                      {kbT(language, 'weeks')}
                    </li>
                  ) : null}
                  {opt.flexWindowDays != null ? (
                    <li>
                      <strong>{kbT(language, 'depotFlexWindow')}:</strong> ±{opt.flexWindowDays}{' '}
                      {kbT(language, 'days')}
                    </li>
                  ) : null}
                  {localizedPostInjectionMonitoring ? (
                    <li className="kb-depot-facts__monitoring">
                      <strong>{kbT(language, 'depotMonitoring')}:</strong> {localizedPostInjectionMonitoring}
                    </li>
                  ) : null}
                  {localizedSourceNote ? (
                    <li className="kb-depot-facts__source">{localizedSourceNote}</li>
                  ) : null}
                </ul>
                {opt.isEstimated ? (
                  <p className="kb-chart__note">{kbT(language, 'estimatedNote')}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

/**
 * Visual-first reading renderer for a structured (non-text) section. The graph
 * is shown by default; verbose narrative / tables are tucked behind an inline
 * "Details" disclosure. Returns the empty fallback when no structured data and
 * no content exist.
 */
export function KbStructuredSection({ section, drug, language }: KbStructuredSectionProps) {
  const kind = getSectionKind(section)

  switch (kind) {
    case 'glance':
      return <AtAGlanceStrip drug={drug} language={language} />

    case 'pk': {
      const pk = getPharmacokinetics(section)
      const content = getSectionContent(section, language)
      if (!pk) return <NarrativeFallback section={section} language={language} />
      return (
        <div className="kb-structured">
          <PkStrip pk={pk} language={language} />
          <PkCurve pk={pk} language={language} chartExportKey={section.key} />
          {pk.isEstimated ? <p className="kb-chart__note">{kbT(language, 'estimatedNote')}</p> : null}
          {content.trim() ? (
            <Details language={language}>
              <NarrativeText content={content} />
            </Details>
          ) : null}
        </div>
      )
    }

    case 'titration':
    case 'taper': {
      const schedule = getTitrationSchedule(section)
      const content = getSectionContent(section, language)
      if (!schedule) return <NarrativeFallback section={section} language={language} />
      return (
        <div className="kb-structured">
          <TitrationChart schedule={schedule} isTaper={kind === 'taper'} language={language} chartExportKey={section.key} />
          <Details language={language}>
            <TitrationTable schedule={schedule} language={language} />
            <NarrativeText content={content} />
          </Details>
        </div>
      )
    }

    case 'depot': {
      const options = getDepotOptions(section)
      const content = getSectionContent(section, language)
      if (options.length === 0) return <NarrativeFallback section={section} language={language} />
      return (
        <div className="kb-structured">
          {content.trim() ? (
            <p className="kb-callout">{content}</p>
          ) : null}
          <DepotAccordion options={options} language={language} />
        </div>
      )
    }

    case 'sideEffects': {
      const entries = getSideEffects(section)
      const content = getSectionContent(section, language)
      if (entries.length === 0) return <NarrativeFallback section={section} language={language} />
      return (
        <div className="kb-structured">
          <SideEffectHeatmap entries={entries} language={language} />
          {content.trim() ? (
            <Details language={language}>
              <NarrativeText content={content} />
            </Details>
          ) : null}
        </div>
      )
    }

    case 'cyp': {
      const cyp = getCypProfile(section)
      const content = getSectionContent(section, language)
      if (!cyp) return <NarrativeFallback section={section} language={language} />
      return (
        <div className="kb-structured kb-structured--cyp">
          <p className="kb-chart__caption">{kbT(language, 'cypTitle')}</p>
          <div className="kb-structured__visual">
            <CypView cyp={cyp} language={language} />
          </div>
          {content.trim() ? (
            <Details language={language}>
              <NarrativeText content={content} />
            </Details>
          ) : null}
        </div>
      )
    }

    default:
      return <NarrativeFallback section={section} language={language} />
  }
}

/** Plain text fallback when a structured section has no payload yet. */
function NarrativeFallback({ section, language }: { section: DrugSection; language: string }) {
  const content = getSectionContent(section, language)
  if (!content.trim()) {
    return <p className="kb-structured__empty">{kbT(language, 'noData')}</p>
  }
  return <NarrativeText content={content} />
}
