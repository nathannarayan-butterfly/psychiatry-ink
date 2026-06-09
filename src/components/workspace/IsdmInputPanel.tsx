import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import {
  getIsdmDomainGroupLabel,
  getIsdmDomainLabel,
  getIsdmPresenceLabel,
  getIsdmSafetyDisclaimer,
  ISDM_DOMAIN_GROUPS,
  ISDM_PRESENCE_OPTIONS,
} from '../../data/isdmLabels'
import type { EnglishVariant } from '../../types/settings'
import type {
  IsdmClinicalAnalysis,
  IsdmConfidence,
  IsdmDomainInput,
  IsdmInputState,
  IsdmPhenomenologyDomain,
} from '../../types/isdm'
import { ISDM_PHENOMENOLOGY_DOMAINS } from '../../types/isdm'
import { useIsdmInput } from '../../hooks/useIsdmInput'
import { loadIsdmAnalysis } from '../../utils/isdm/storage'

interface IsdmDomainRowProps {
  domain: IsdmPhenomenologyDomain
  value: IsdmDomainInput
  disabled?: boolean
  onChange: (patch: Partial<IsdmDomainInput>) => void
}

function IsdmDomainRow({ domain, value, disabled = false, onChange }: IsdmDomainRowProps) {
  const { t, language, englishVariant } = useTranslation()
  const variant = englishVariant as EnglishVariant
  const showSeverity = value.presence === 'present'

  return (
    <div className="isdm-input-panel__domain">
      <p className="isdm-input-panel__domain-label">
        {getIsdmDomainLabel(domain, language, variant)}
      </p>

      <div className="isdm-input-panel__presence" role="radiogroup" aria-label={t('isdmInputPresenceLabel')}>
        {ISDM_PRESENCE_OPTIONS.map((presence) => (
          <label key={presence} className="isdm-input-panel__presence-option">
            <input
              type="radio"
              name={`isdm-presence-${domain}`}
              value={presence}
              checked={value.presence === presence}
              disabled={disabled}
              onChange={() =>
                onChange({
                  presence,
                  severity: presence === 'present' ? (value.severity ?? 2) : undefined,
                })
              }
            />
            <span>{getIsdmPresenceLabel(presence, language, variant)}</span>
          </label>
        ))}
      </div>

      {showSeverity ? (
        <label className="isdm-input-panel__severity">
          <span className="isdm-input-panel__field-label">{t('isdmInputSeverityLabel')}</span>
          <select
            value={value.severity ?? 2}
            disabled={disabled}
            onChange={(event) =>
              onChange({ severity: Number(event.target.value) as IsdmConfidence })
            }
          >
            {[0, 1, 2, 3, 4].map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="isdm-input-panel__notes">
        <span className="isdm-input-panel__field-label">{t('isdmInputNotesLabel')}</span>
        <textarea
          rows={2}
          value={value.notes ?? ''}
          disabled={disabled}
          placeholder={t('isdmInputNotesPlaceholder')}
          onChange={(event) => onChange({ notes: event.target.value })}
        />
      </label>
    </div>
  )
}

interface IsdmInputPanelProps {
  caseId: string
  input: IsdmInputState
  disabled?: boolean
  onDomainChange: (domain: IsdmPhenomenologyDomain, patch: Partial<IsdmDomainInput>) => void
}

export function IsdmInputPanel({
  caseId: _caseId,
  input,
  disabled = false,
  onDomainChange,
}: IsdmInputPanelProps) {
  const { t, language, englishVariant } = useTranslation()
  const variant = englishVariant as EnglishVariant

  return (
    <div className="isdm-input-panel" role="form" aria-label={t('isdmInputTitle')}>
      <div className="isdm-input-panel__disclaimer" role="note">
        <p className="isdm-input-panel__disclaimer-text">
          {getIsdmSafetyDisclaimer(language, variant)}
        </p>
      </div>

      <h2 className="isdm-input-panel__title">{t('isdmInputTitle')}</h2>

      <div className="isdm-input-panel__groups">
        {ISDM_DOMAIN_GROUPS.map((group) => (
          <details key={group.id} className="isdm-input-panel__group" open>
            <summary className="isdm-input-panel__group-summary">
              {getIsdmDomainGroupLabel(group.id, language, variant)}
            </summary>
            <div className="isdm-input-panel__group-body">
              {group.domains.map((domain) => (
                <IsdmDomainRow
                  key={domain}
                  domain={domain}
                  value={input.domains[domain]}
                  disabled={disabled}
                  onChange={(patch) => onDomainChange(domain, patch)}
                />
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}

function formatUpdatedAt(iso: string, language: string): string {
  try {
    const locale =
      language === 'de'
        ? 'de-DE'
        : language === 'fr'
          ? 'fr-FR'
          : language === 'es'
            ? 'es-ES'
            : 'en-GB'
    return new Date(iso).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}

interface IsdmAnalysisSummaryProps {
  analysis: IsdmClinicalAnalysis | null
  refreshing?: boolean
}

export function IsdmAnalysisSummary({ analysis, refreshing = false }: IsdmAnalysisSummaryProps) {
  const { t, language } = useTranslation()

  if (!analysis) {
    return (
      <div className="isdm-analysis-summary" role="region" aria-label={t('isdmSummaryTitle')}>
        <p className="isdm-analysis-summary__empty">
          {refreshing ? t('isdmPanelRefreshing') : t('isdmPanelNoAnalysis')}
        </p>
      </div>
    )
  }

  const domainsWithFindings = ISDM_PHENOMENOLOGY_DOMAINS.filter(
    (domain) => (analysis.phenomenology[domain] ?? []).length > 0,
  ).length

  return (
    <div className="isdm-analysis-summary" role="region" aria-label={t('isdmSummaryTitle')}>
      <h3 className="isdm-analysis-summary__title">{t('isdmSummaryTitle')}</h3>
      <p className="isdm-analysis-summary__meta">
        {`${t('isdmPanelLastUpdated')} ${formatUpdatedAt(analysis.updatedAt, language)}`}
        {refreshing ? ` · ${t('isdmPanelRefreshing')}` : ''}
      </p>

      <dl className="isdm-analysis-summary__stats">
        <div>
          <dt>{t('isdmSummaryDomains')}</dt>
          <dd>
            {domainsWithFindings}/{ISDM_PHENOMENOLOGY_DOMAINS.length}
          </dd>
        </div>
        <div>
          <dt>{t('isdmSummaryUncertainty')}</dt>
          <dd>{analysis.overallUncertainty}</dd>
        </div>
        <div>
          <dt>{t('isdmPanelSyndromeClusters')}</dt>
          <dd>{analysis.syndromeClusters.length}</dd>
        </div>
        <div>
          <dt>{t('isdmPanelInterviewGaps')}</dt>
          <dd>{analysis.interviewGaps.length}</dd>
        </div>
      </dl>

      {analysis.syndromeClusters.length > 0 ? (
        <ul className="isdm-analysis-summary__clusters">
          {analysis.syndromeClusters.slice(0, 4).map((cluster) => (
            <li key={cluster.id}>{cluster.label}</li>
          ))}
        </ul>
      ) : null}

      <p className="isdm-analysis-summary__review">{t('isdmPanelClinicianReview')}</p>
    </div>
  )
}

interface IsdmPsychopathWorkspaceProps {
  caseId: string
  disabled?: boolean
}

export function IsdmPsychopathWorkspace({ caseId, disabled = false }: IsdmPsychopathWorkspaceProps) {
  const { input, updateDomain } = useIsdmInput(caseId)
  const [analysis, setAnalysis] = useState<IsdmClinicalAnalysis | null>(() =>
    loadIsdmAnalysis(caseId),
  )
  const [refreshing, setRefreshing] = useState(false)

  const refreshAnalysis = useCallback(() => {
    setAnalysis(loadIsdmAnalysis(caseId))
    setRefreshing(false)
  }, [caseId])

  useEffect(() => {
    setRefreshing(true)
    const timer = window.setTimeout(refreshAnalysis, 1400)
    return () => window.clearTimeout(timer)
  }, [caseId, input.updatedAt, refreshAnalysis])

  return (
    <div className="isdm-psychopath-workspace">
      <IsdmInputPanel
        caseId={caseId}
        input={input}
        disabled={disabled}
        onDomainChange={updateDomain}
      />
      <IsdmAnalysisSummary analysis={analysis} refreshing={refreshing} />
    </div>
  )
}
