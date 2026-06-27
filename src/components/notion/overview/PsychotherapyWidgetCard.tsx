import { Brain } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import {
  translateProgressStatus,
  translatePsychotherapyStatus,
  translatePsychotherapyUi as tp,
} from '../../../data/psychotherapyUiTranslations'
import type { PsychotherapySummary } from '../../../types/psychotherapy'
import { OverviewCard, OverviewEmpty } from './OverviewCard'

interface PsychotherapyWidgetCardProps {
  summary: PsychotherapySummary
  hasPlan: boolean
  onOpenTherapie: () => void
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value?.trim()) return null
  return (
    <div className="ov-kv">
      <span className="ov-kv__label">{label}</span>
      <span className="ov-kv__value">{value}</span>
    </div>
  )
}

export function PsychotherapyWidgetCard({
  summary,
  hasPlan,
  onOpenTherapie,
}: PsychotherapyWidgetCardProps) {
  const { language, t } = useTranslation()
  const progressLabel = summary.progressStatus
    ? translateProgressStatus(language, summary.progressStatus)
    : undefined
  const statusLabel = summary.status ? translatePsychotherapyStatus(language, summary.status) : undefined

  return (
    <OverviewCard
      title={t('overviewWidgetPsychotherapy')}
      icon={<Brain size={15} />}
      className="ov-col-6"
      badge={statusLabel ? { label: statusLabel, tone: 'neutral' } : undefined}
      action={{ label: t('overviewToTherapie'), onClick: onOpenTherapie }}
    >
      {!hasPlan ? (
        <OverviewEmpty>{tp(language, 'ptEmptyTitle')}</OverviewEmpty>
      ) : (
        <div className="ov-kv-list">
          <Row label={tp(language, 'ptCurrentStage')} value={summary.currentStage} />
          <Row label={tp(language, 'ptMainGoal')} value={summary.mainGoal} />
          <Row label={tp(language, 'ptMethod')} value={summary.method} />
          <Row label={tp(language, 'ptFrequency')} value={summary.frequency} />
          <Row label={tp(language, 'ptLastSession')} value={summary.lastSessionDate} />
          <Row label={tp(language, 'ptNextFocus')} value={summary.nextFocus} />
          <Row label={tp(language, 'ptProgress')} value={progressLabel} />
        </div>
      )}
    </OverviewCard>
  )
}
