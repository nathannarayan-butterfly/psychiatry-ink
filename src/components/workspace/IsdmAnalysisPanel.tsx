import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { getIsdmDomainLabel, getIsdmSafetyDisclaimer } from '../../data/isdmLabels'
import type { EnglishVariant, UiLanguage } from '../../types/settings'
import type { IsdmClinicalAnalysis, IsdmPhenomenologyDomain } from '../../types/isdm'
import { ISDM_PHENOMENOLOGY_DOMAINS } from '../../types/isdm'
import { loadIsdmAnalysis } from '../../utils/isdm/storage'
import { scheduleIsdmRebuild } from '../../utils/isdm'

interface IsdmAnalysisPanelProps {
  caseId: string
}

function formatUpdatedAt(iso: string, language: UiLanguage): string {
  try {
    const date = new Date(iso)
    return date.toLocaleString(language === 'de' ? 'de-DE' : language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export function IsdmAnalysisPanel({ caseId }: IsdmAnalysisPanelProps) {
  const { t, language, englishVariant } = useTranslation()
  const [analysis, setAnalysis] = useState<IsdmClinicalAnalysis | null>(() =>
    loadIsdmAnalysis(caseId),
  )
  const [refreshing, setRefreshing] = useState(false)

  const refreshAnalysis = useCallback(() => {
    setAnalysis(loadIsdmAnalysis(caseId))
  }, [caseId])

  useEffect(() => {
    setRefreshing(true)
    scheduleIsdmRebuild(caseId, 'profile')
    const timer = window.setTimeout(() => {
      refreshAnalysis()
      setRefreshing(false)
    }, 400)
    return () => window.clearTimeout(timer)
  }, [caseId, refreshAnalysis])

  const domainsWithFindings = ISDM_PHENOMENOLOGY_DOMAINS.filter((domain) => {
    const findings = analysis?.phenomenology[domain as IsdmPhenomenologyDomain] ?? []
    return findings.length > 0
  })

  return (
    <div className="isdm-analysis-panel" role="region" aria-label={t('isdmPanelTitle')}>
      <div className="isdm-analysis-panel__disclaimer" role="note">
        <p className="isdm-analysis-panel__disclaimer-text">
          {getIsdmSafetyDisclaimer(language, englishVariant as EnglishVariant)}
        </p>
      </div>

      <div className="isdm-analysis-panel__meta">
        <h2 className="isdm-analysis-panel__title">{t('isdmPanelTitle')}</h2>
        {analysis?.updatedAt ? (
          <p className="isdm-analysis-panel__updated">
            {t('isdmPanelLastUpdated')} {formatUpdatedAt(analysis.updatedAt, language)}
            {refreshing ? ` · ${t('isdmPanelRefreshing')}` : ''}
          </p>
        ) : (
          <p className="isdm-analysis-panel__updated">
            {refreshing ? t('isdmPanelRefreshing') : t('isdmPanelNoAnalysis')}
          </p>
        )}
      </div>

      {analysis ? (
        <div className="isdm-analysis-panel__sections">
          <section className="isdm-analysis-panel__section">
            <h3 className="isdm-analysis-panel__section-title">{t('isdmPanelPhenomenology')}</h3>
            {domainsWithFindings.length === 0 ? (
              <p className="isdm-analysis-panel__empty">{t('isdmPanelNoFindings')}</p>
            ) : (
              <ul className="isdm-analysis-panel__domain-list">
                {domainsWithFindings.map((domain) => (
                  <li key={domain} className="isdm-analysis-panel__domain">
                    <p className="isdm-analysis-panel__domain-label">
                      {getIsdmDomainLabel(domain, language, englishVariant as EnglishVariant)}
                    </p>
                    <ul className="isdm-analysis-panel__finding-list">
                      {(analysis.phenomenology[domain] ?? []).map((finding) => (
                        <li key={finding.id} className="isdm-analysis-panel__finding">
                          <span className="isdm-analysis-panel__finding-label">{finding.label}</span>
                          <span className="isdm-analysis-panel__finding-meta">
                            {finding.polarity}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="isdm-analysis-panel__section">
            <h3 className="isdm-analysis-panel__section-title">{t('isdmPanelSyndromeClusters')}</h3>
            {analysis.syndromeClusters.length === 0 ? (
              <p className="isdm-analysis-panel__empty">{t('isdmPanelNoClusters')}</p>
            ) : (
              <ul className="isdm-analysis-panel__cluster-list">
                {analysis.syndromeClusters.map((cluster) => (
                  <li key={cluster.id} className="isdm-analysis-panel__cluster">
                    <p className="isdm-analysis-panel__cluster-label">{cluster.label}</p>
                    <p className="isdm-analysis-panel__cluster-rationale">{cluster.rationale}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="isdm-analysis-panel__section">
            <h3 className="isdm-analysis-panel__section-title">{t('isdmPanelHypotheses')}</h3>
            <p className="isdm-analysis-panel__review-note">{t('isdmPanelClinicianReview')}</p>
            {analysis.diagnosticMappings.length === 0 ? (
              <p className="isdm-analysis-panel__empty">{t('isdmPanelNoHypotheses')}</p>
            ) : (
              <ul className="isdm-analysis-panel__hypothesis-list">
                {analysis.diagnosticMappings.map((mapping) => (
                  <li key={mapping.id} className="isdm-analysis-panel__hypothesis">
                    <p className="isdm-analysis-panel__hypothesis-label">{mapping.label}</p>
                    {mapping.codingSystems.icd10 ? (
                      <p className="isdm-analysis-panel__hypothesis-code">
                        ICD-10: {mapping.codingSystems.icd10.code} — {mapping.codingSystems.icd10.label}
                      </p>
                    ) : null}
                    {mapping.criteriaMissing.length > 0 ? (
                      <p className="isdm-analysis-panel__hypothesis-gap">
                        {t('isdmPanelCriteriaMissing')}: {mapping.criteriaMissing.join(', ')}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="isdm-analysis-panel__section">
            <h3 className="isdm-analysis-panel__section-title">{t('isdmPanelInterviewGaps')}</h3>
            {analysis.interviewGaps.length === 0 ? (
              <p className="isdm-analysis-panel__empty">{t('isdmPanelNoGaps')}</p>
            ) : (
              <ul className="isdm-analysis-panel__gap-list">
                {analysis.interviewGaps.map((gap) => (
                  <li key={gap.id} className="isdm-analysis-panel__gap">
                    <p className="isdm-analysis-panel__gap-question">{gap.question}</p>
                    <p className="isdm-analysis-panel__gap-rationale">{gap.rationale}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  )
}
