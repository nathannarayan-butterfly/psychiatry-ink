import type { BefundType } from '../../types/befund'
import {
  DiagnostikBefundeMain,
  DiagnostikBefundeSidebar,
  type useDiagnostikBefunde,
} from './DiagnostikBefundeSection'

interface DiagnostikStructuredBefundPanelProps {
  caseId: string
  /** Shared archive view from {@link useDiagnostikBefunde}. */
  befunde: ReturnType<typeof useDiagnostikBefunde>
  /** Befund types this panel documents (e.g. ['ecg'] or ['roentgen']). */
  types: BefundType[]
}

/**
 * Canonical structured-befund layout — a befund list rail beside the detail /
 * create area — shared by every structured Diagnostik befund (EKG, Röntgen, …)
 * so they render identically instead of each section hand-rolling its own.
 */
export function DiagnostikStructuredBefundPanel({
  caseId,
  befunde,
  types,
}: DiagnostikStructuredBefundPanelProps) {
  return (
    <div className="diagnostik-structured">
      <div className="diagnostik-structured__list">
        <DiagnostikBefundeSidebar
          caseId={caseId}
          records={befunde.records}
          selectedId={befunde.selectedId}
          onSelect={befunde.setSelectedId}
          types={types}
        />
      </div>
      <DiagnostikBefundeMain
        caseId={caseId}
        records={befunde.records}
        selectedId={befunde.selectedId}
        onSelect={befunde.setSelectedId}
        onRecordsChange={befunde.refresh}
        types={types}
      />
    </div>
  )
}
