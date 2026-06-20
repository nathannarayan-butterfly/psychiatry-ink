import { useCallback, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Minus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import type { UiTranslationKey } from '../../../data/uiTranslations'
import type { VerlaufstendenzSummary } from '../../../utils/overview/verlaufstendenzSummary'
import type {
  VerlaufstendenzDomain,
  VerlaufstendenzTrend,
  VerlaufstendenzWindowPreset,
} from '../../../types/verlaufstendenz'
import {
  acceptVerlaufstendenzDraft,
  clearVerlaufstendenzOverride,
  overrideVerlaufstendenz,
  setVerlaufstendenzWindow,
} from '../../../utils/verlaufstendenz/storage'
import type { SemanticTone } from './OverviewCard'
import { OverviewCard, OverviewEmpty } from './OverviewCard'

interface VerlaufstendenzCardProps {
  caseId: string
  data: VerlaufstendenzSummary
}

const TREND_I18N: Record<VerlaufstendenzTrend, UiTranslationKey> = {
  deutlich_gebessert: 'verlaufstendenzTrendDeutlichGebessert',
  leicht_gebessert: 'verlaufstendenzTrendLeichtGebessert',
  stabil: 'verlaufstendenzTrendStabil',
  schwankend: 'verlaufstendenzTrendSchwankend',
  leicht_verschlechtert: 'verlaufstendenzTrendLeichtVerschlechtert',
  deutlich_verschlechtert: 'verlaufstendenzTrendDeutlichVerschlechtert',
  kritisch_handlungsrelevant: 'verlaufstendenzTrendKritisch',
  nicht_beurteilbar: 'verlaufstendenzTrendNichtBeurteilbar',
}

const DOMAIN_I18N: Record<VerlaufstendenzDomain, UiTranslationKey> = {
  safety_risk: 'verlaufstendenzDomainSafety',
  core_psychopathology: 'verlaufstendenzDomainCorePsychopathology',
  ward_behavior: 'verlaufstendenzDomainWardBehavior',
  sleep_drive_affect: 'verlaufstendenzDomainSleepDriveAffect',
  insight_compliance: 'verlaufstendenzDomainInsightCompliance',
  somatic_side_effects: 'verlaufstendenzDomainSomatic',
  social_functioning: 'verlaufstendenzDomainSocialFunctioning',
}

const DIRECTION_I18N: Record<string, UiTranslationKey> = {
  deutlich_gebessert: 'verlaufstendenzDirectionDeutlichGebessert',
  leicht_gebessert: 'verlaufstendenzDirectionLeichtGebessert',
  stabil: 'verlaufstendenzDirectionStabil',
  leicht_verschlechtert: 'verlaufstendenzDirectionLeichtVerschlechtert',
  deutlich_verschlechtert: 'verlaufstendenzDirectionDeutlichVerschlechtert',
  gemischt: 'verlaufstendenzDirectionGemischt',
  nicht_beurteilbar: 'verlaufstendenzDirectionNichtBeurteilbar',
}

const CONFIDENCE_I18N: Record<VerlaufstendenzSummary['confidence'], UiTranslationKey> = {
  high: 'verlaufstendenzConfidenceHigh',
  medium: 'verlaufstendenzConfidenceMedium',
  low: 'verlaufstendenzConfidenceLow',
  insufficient: 'verlaufstendenzConfidenceInsufficient',
}

const WINDOW_OPTIONS: { value: VerlaufstendenzWindowPreset; labelKey: UiTranslationKey }[] = [
  { value: '7d', labelKey: 'verlaufstendenzWindow7d' },
  { value: '14d', labelKey: 'verlaufstendenzWindow14d' },
  { value: 'admission', labelKey: 'verlaufstendenzWindowAdmission' },
]

function trendTone(trend: VerlaufstendenzTrend): SemanticTone {
  if (trend === 'kritisch_handlungsrelevant' || trend === 'deutlich_verschlechtert') return 'high'
  if (trend === 'leicht_verschlechtert' || trend === 'schwankend') return 'moderate'
  if (trend === 'deutlich_gebessert' || trend === 'leicht_gebessert') return 'ok'
  if (trend === 'nicht_beurteilbar') return 'neutral'
  return 'info'
}

function TrendIcon({ trend }: { trend: VerlaufstendenzTrend }) {
  const size = 16
  const stroke = 2
  switch (trend) {
    case 'deutlich_gebessert':
      return <TrendingUp size={size} strokeWidth={stroke} aria-hidden />
    case 'leicht_gebessert':
      return <ArrowUp size={size} strokeWidth={stroke} aria-hidden />
    case 'stabil':
      return <ArrowRight size={size} strokeWidth={stroke} aria-hidden />
    case 'schwankend':
      return <ArrowRight size={size} strokeWidth={stroke} aria-hidden />
    case 'leicht_verschlechtert':
      return <ArrowDown size={size} strokeWidth={stroke} aria-hidden />
    case 'deutlich_verschlechtert':
      return <TrendingDown size={size} strokeWidth={stroke} aria-hidden />
    case 'kritisch_handlungsrelevant':
      return <AlertTriangle size={size} strokeWidth={stroke} aria-hidden />
    default:
      return <Minus size={size} strokeWidth={stroke} aria-hidden />
  }
}

export function VerlaufstendenzCard({ caseId, data }: VerlaufstendenzCardProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draftTrend, setDraftTrend] = useState<VerlaufstendenzTrend>(data.trend)
  const [draftRationale, setDraftRationale] = useState(data.rationaleSentence)

  const tone = trendTone(data.trend)
  const meta = [
    data.lastUpdatedLabel ? `${t('verlaufstendenzUpdated')} ${data.lastUpdatedLabel}` : null,
    data.windowLabel,
  ]
    .filter(Boolean)
    .join(' · ')

  const assessableDomains = useMemo(
    () => data.domains.filter((d) => d.direction !== 'nicht_beurteilbar'),
    [data.domains],
  )

  const startEditing = useCallback(() => {
    setDraftTrend(data.trend)
    setDraftRationale(data.rationaleSentence)
    setEditing(true)
    setExpanded(true)
  }, [data.rationaleSentence, data.trend])

  const handleAcceptDraft = useCallback(() => {
    acceptVerlaufstendenzDraft(data.computed, caseId)
    setEditing(false)
  }, [caseId, data.computed])

  const handleSaveOverride = useCallback(() => {
    const trimmed = draftRationale.trim()
    if (!trimmed) return
    overrideVerlaufstendenz(draftTrend, trimmed, caseId)
    setEditing(false)
  }, [caseId, draftRationale, draftTrend])

  const handleRevertOverride = useCallback(() => {
    clearVerlaufstendenzOverride(caseId)
    setEditing(false)
  }, [caseId])

  const handleWindowChange = useCallback(
    (preset: VerlaufstendenzWindowPreset) => {
      setVerlaufstendenzWindow(preset, caseId)
    },
    [caseId],
  )

  const hasContent = data.trend !== 'nicht_beurteilbar' || assessableDomains.length > 0

  return (
    <OverviewCard
      title={t('overviewWidgetVerlaufstendenz')}
      className="ov-col-6"
      meta={meta || null}
      badge={
        data.isClinicianApproved
          ? { label: t('verlaufstendenzClinicianApproved'), tone: 'info' }
          : undefined
      }
      headerExtra={
        <button
          type="button"
          className="ov-vt__expand"
          aria-expanded={expanded}
          aria-label={expanded ? t('verlaufstendenzCollapse') : t('verlaufstendenzExpand')}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? <ChevronUp size={14} strokeWidth={2} /> : <ChevronDown size={14} strokeWidth={2} />}
        </button>
      }
    >
      {!hasContent ? (
        <OverviewEmpty>{t('verlaufstendenzEmpty')}</OverviewEmpty>
      ) : (
        <div className="ov-vt">
          <div className={`ov-vt__headline ov-vt__headline--${tone}`}>
            <span className="ov-vt__icon">
              <TrendIcon trend={data.trend} />
            </span>
            <span className="ov-vt__trend-label">{t(TREND_I18N[data.trend])}</span>
            <span className={`ov-vt__confidence ov-vt__confidence--${data.confidence}`}>
              {t(CONFIDENCE_I18N[data.confidence])}
            </span>
          </div>

          {editing ? (
            <div className="ov-vt__edit">
              <label className="ov-vt__edit-label" htmlFor={`vt-trend-${caseId}`}>
                {t('verlaufstendenzEditTrend')}
              </label>
              <select
                id={`vt-trend-${caseId}`}
                className="ov-vt__select"
                value={draftTrend}
                onChange={(e) => setDraftTrend(e.target.value as VerlaufstendenzTrend)}
              >
                {(Object.keys(TREND_I18N) as VerlaufstendenzTrend[]).map((trend) => (
                  <option key={trend} value={trend}>
                    {t(TREND_I18N[trend])}
                  </option>
                ))}
              </select>
              <label className="ov-vt__edit-label" htmlFor={`vt-rationale-${caseId}`}>
                {t('verlaufstendenzEditRationale')}
              </label>
              <textarea
                id={`vt-rationale-${caseId}`}
                className="ov-vt__textarea"
                rows={3}
                value={draftRationale}
                onChange={(e) => setDraftRationale(e.target.value)}
              />
              <div className="ov-vt__edit-actions">
                <button type="button" className="ov-vt__btn ov-vt__btn--primary" onClick={handleSaveOverride}>
                  {t('verlaufstendenzSaveOverride')}
                </button>
                <button type="button" className="ov-vt__btn" onClick={() => setEditing(false)}>
                  {t('overviewPsyCancel')}
                </button>
              </div>
            </div>
          ) : (
            <p className="ov-vt__rationale">{data.rationaleSentence}</p>
          )}

          {expanded ? (
            <div className="ov-vt__expanded">
              <div className="ov-vt__window">
                <span className="ov-vt__subhead">{t('verlaufstendenzWindowLabel')}</span>
                <div className="ov-vt__window-options" role="group" aria-label={t('verlaufstendenzWindowLabel')}>
                  {WINDOW_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`ov-vt__window-btn${
                        data.windowPreset === opt.value ? ' ov-vt__window-btn--active' : ''
                      }`}
                      aria-pressed={data.windowPreset === opt.value}
                      onClick={() => handleWindowChange(opt.value)}
                    >
                      {t(opt.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              <table className="ov-vt__domain-table">
                <thead>
                  <tr>
                    <th scope="col">{t('verlaufstendenzDomainColumn')}</th>
                    <th scope="col">{t('verlaufstendenzDirectionColumn')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.domains.map((row) => (
                    <tr key={row.domain}>
                      <td>{t(DOMAIN_I18N[row.domain])}</td>
                      <td>{t(DIRECTION_I18N[row.direction])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {data.domains.some((d) => d.evidence.length > 0) ? (
                <div className="ov-vt__evidence">
                  <p className="ov-vt__subhead">{t('verlaufstendenzEvidenceHeading')}</p>
                  <ul className="ov-vt__evidence-list">
                    {data.domains.flatMap((d) =>
                      d.evidence.map((ev) => (
                        <li key={ev.id} className="ov-vt__evidence-item">
                          <span className="ov-vt__evidence-source">{ev.sourceLabel}</span>
                          <span className="ov-vt__evidence-snippet">{ev.snippet}</span>
                        </li>
                      )),
                    )}
                  </ul>
                </div>
              ) : null}

              {data.sourceEntries.length > 0 ? (
                <div className="ov-vt__sources">
                  <p className="ov-vt__subhead">{t('verlaufstendenzSourcesHeading')}</p>
                  <ul className="ov-list ov-list--flat">
                    {data.sourceEntries.map((entry) => (
                      <li key={entry.id} className="ov-vt__source-item">
                        <span className="ov-vt__source-meta">
                          {entry.dateLabel} · {entry.sourceLabel}
                        </span>
                        <span className="ov-vt__source-text">{entry.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {!editing ? (
                <div className="ov-vt__actions">
                  {!data.isClinicianApproved ? (
                    <button type="button" className="ov-vt__btn ov-vt__btn--primary" onClick={handleAcceptDraft}>
                      {t('verlaufstendenzAcceptDraft')}
                    </button>
                  ) : null}
                  <button type="button" className="ov-vt__btn" onClick={startEditing}>
                    {data.isClinicianApproved ? t('verlaufstendenzEditOverride') : t('verlaufstendenzOverride')}
                  </button>
                  {data.isClinicianApproved ? (
                    <button type="button" className="ov-vt__btn ov-vt__btn--ghost" onClick={handleRevertOverride}>
                      {t('verlaufstendenzRevertOverride')}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </OverviewCard>
  )
}
