import type { TimelineToolState } from '../../hooks/useTimelineTool'
import { TimelineWorkspace } from '../timeline/TimelineWorkspace'

interface NotionTimelineCanvasProps {
  caseId: string
  timeline: TimelineToolState
  onVaultSave?: () => void
}

export function NotionTimelineCanvas({
  caseId,
  timeline,
  onVaultSave,
}: NotionTimelineCanvasProps) {
  return (
    <section className="notion-timeline-canvas">
      <TimelineWorkspace
        timeline={timeline}
        caseId={caseId}
        onClose={() => {}}
        onVaultSave={onVaultSave}
      />
    </section>
  )
}
