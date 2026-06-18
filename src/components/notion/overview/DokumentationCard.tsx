import { FileText } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import { OverviewCard, OverviewEmpty } from './OverviewCard'
import type { DokumentationSummaryData } from '../../../utils/overview/dokumentationSummary'

interface DokumentationCardProps {
  data: DokumentationSummaryData
  onOpenDokumente: () => void
}

export function DokumentationCard({ data, onOpenDokumente }: DokumentationCardProps) {
  const { t } = useTranslation()
  const badge =
    data.draftCount > 0
      ? { label: `${data.draftCount} Entwurf${data.draftCount === 1 ? '' : 'e'}`, tone: 'info' as const }
      : undefined

  return (
    <OverviewCard
      title="Dokumentation"
      icon={<FileText size={15} />}
      className="ov-col-6"
      badge={badge}
      action={{ label: 'Zu Dokumente', onClick: onOpenDokumente }}
    >
      {data.totalCount === 0 ? (
        <OverviewEmpty>Keine gespeicherten Dokumente.</OverviewEmpty>
      ) : (
        <ul className="ov-feed">
          {data.recent.map((entry) => (
            <li key={entry.id} className="ov-feed__item">
              <div className="ov-feed__head">
                <span className="ov-feed__date">{entry.dateLabel}</span>
                <span className="ov-feed__tag">{t(entry.categoryKey)}</span>
                {entry.isDraft ? <span className="ov-feed__tag ov-feed__tag--draft">Entwurf</span> : null}
              </div>
              <p className="ov-feed__text">{entry.title}</p>
            </li>
          ))}
        </ul>
      )}
    </OverviewCard>
  )
}
