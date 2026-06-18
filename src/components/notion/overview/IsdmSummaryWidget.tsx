import type { IsdmClinicalAnalysis } from '../../../types/isdm'
import { IsdmAnalysisSummary } from '../../workspace/IsdmInputPanel'
import { OverviewCardShell } from './OverviewCard'

interface IsdmSummaryWidgetProps {
  analysis: IsdmClinicalAnalysis | null
  onOpenDiagnose: () => void
}

export function IsdmSummaryWidget({ analysis, onOpenDiagnose }: IsdmSummaryWidgetProps) {
  return (
    <OverviewCardShell className="ov-isdm-widget">
      <div className="ov-isdm-widget__head">
        <button type="button" className="ov-card__action" onClick={onOpenDiagnose}>
          Zur Diagnose
          <span aria-hidden>→</span>
        </button>
      </div>
      <IsdmAnalysisSummary analysis={analysis} />
    </OverviewCardShell>
  )
}
