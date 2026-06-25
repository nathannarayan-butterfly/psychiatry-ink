import { useMemo } from 'react'
import { useTranslation } from '../../../context/TranslationContext'
import { OverviewAiBadge } from './OverviewAiBadge'
import { useDiagnosisDisplayTitles } from '../../../hooks/useDiagnosisDisplayTitles'
import { buildDiagnosisTitleRequest } from '../../../utils/diagnosisDisplayRequests'
import type { UiTranslationKey } from '../../../data/uiTranslations'
import type { ButterflySummaryItem } from '../../../utils/overview/butterflySummary'
import { OverviewCard, OverviewEmpty } from './OverviewCard'

interface ButterflyCriteriaCardProps {
  items: ButterflySummaryItem[]
  onOpenDiagnose: () => void
}

const VERDICT_I18N: Record<ButterflySummaryItem['verdict'], UiTranslationKey> = {
  criteria_met: 'overviewButterflyVerdictCriteriaMet',
  not_met: 'overviewButterflyVerdictNotMet',
  insufficient_data: 'overviewButterflyVerdictInsufficientData',
  unavailable: 'overviewButterflyVerdictUnavailable',
}

export function ButterflyCriteriaCard({ items, onOpenDiagnose }: ButterflyCriteriaCardProps) {
  const { t, language } = useTranslation()
  const openCount = items.reduce((sum, item) => sum + item.openCriteriaCount, 0)
  const badge =
    openCount > 0
      ? {
          label: t('overviewButterflyOpenBadge').replace('{count}', String(openCount)),
          tone: 'info' as const,
        }
      : undefined

  const titleRequests = useMemo(
    () =>
      items.map((item) =>
        buildDiagnosisTitleRequest({
          key: item.id,
          coding: {
            code: item.code,
            label: item.enteredLabel,
            overridden: item.overridden,
          },
          version: item.version,
        }),
      ),
    [items],
  )

  const { titlesByKey } = useDiagnosisDisplayTitles(titleRequests, language, items.length > 0)

  return (
    <OverviewCard
      title={t('overviewWidgetButterflyCriteria')}
      className="ov-col-6"
      badge={badge}
      action={{ label: t('overviewButterflyOpenDiagnose'), onClick: onOpenDiagnose }}
    >
      <OverviewAiBadge />
      {items.length === 0 ? (
        <OverviewEmpty>{t('overviewButterflyEmpty')}</OverviewEmpty>
      ) : (
        <ul className="ov-feed">
          {items.map((item) => {
            const displayLabel = titlesByKey.get(item.id) ?? item.label ?? item.code
            return (
              <li key={item.id} className="ov-feed__item">
                <div className="ov-feed__head">
                  <span className="ov-feed__date">
                    {item.code ? `${item.code} · ` : ''}
                    {displayLabel}
                  </span>
                  <span className={`ov-pill ov-pill--${item.tone}`}>
                    {t(VERDICT_I18N[item.verdict])}
                  </span>
                </div>
                {item.headline ? <p className="ov-feed__text">{item.headline}</p> : null}
              </li>
            )
          })}
        </ul>
      )}
    </OverviewCard>
  )
}
