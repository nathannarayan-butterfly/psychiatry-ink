import { useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import { useDiagnosisDisplayTitles } from '../../../hooks/useDiagnosisDisplayTitles'
import { buildDiagnosisTitleRequest } from '../../../utils/diagnosisDisplayRequests'
import type { ButterflySummaryItem } from '../../../utils/overview/butterflySummary'
import { OverviewCard, OverviewEmpty } from './OverviewCard'

interface ButterflyCriteriaCardProps {
  items: ButterflySummaryItem[]
  onOpenDiagnose: () => void
}

const VERDICT_LABEL: Record<ButterflySummaryItem['verdict'], string> = {
  criteria_met: 'Kriterien erfüllt',
  not_met: 'Kriterien nicht erfüllt',
  insufficient_data: 'Daten unvollständig',
  unavailable: 'Keine Kriterien',
}

export function ButterflyCriteriaCard({ items, onOpenDiagnose }: ButterflyCriteriaCardProps) {
  const { language } = useTranslation()
  const openCount = items.reduce((sum, item) => sum + item.openCriteriaCount, 0)
  const badge =
    openCount > 0 ? { label: `${openCount} offen`, tone: 'info' as const } : undefined

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
      title="Butterfly-Kriterien"
      icon={<Sparkles size={15} />}
      className="ov-col-6"
      badge={badge}
      action={{ label: 'Zur Diagnose', onClick: onOpenDiagnose }}
    >
      {items.length === 0 ? (
        <OverviewEmpty>Keine Diagnosen mit Kriterienunterstützung.</OverviewEmpty>
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
                    {VERDICT_LABEL[item.verdict]}
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
