import { useCallback, useState } from 'react'
import { Check, Save, X } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import { useTimelineTool } from '../../../hooks/useTimelineTool'
import { NotionTimelineCanvas } from '../NotionTimelineCanvas'
import { saveStandaloneNote } from '../../../utils/standaloneNotes'
import { showNotionToast } from '../NotionToast'
import '../../../styles/standalone-workspace.css'

/**
 * Dedicated scratch namespace for the patient-less timeline builder. Keyed
 * storage that is NEVER a patient case — `useTimelineTool` persists its ad-hoc
 * events under this id only, so no patient case is read or written.
 */
const SCRATCH_CASE_ID = 'standalone-timeline'

interface StandaloneTimelineWidgetProps {
  /** Storage id of the (default) case any saved note is filed under (notes panel). */
  caseId: string
  onClose: () => void
}

/**
 * Patient-less timeline builder. Renders the existing
 * {@link NotionTimelineCanvas} on an ad-hoc in-memory event list (a dedicated
 * scratch namespace, never a patient case): the clinician adds events and gets
 * the same timeline view the patient Timeline page uses. A textual list of the
 * events can be saved to the standalone notes (under the real patient-less
 * `caseId` so it shows in the notes panel).
 */
export function StandaloneTimelineWidget({ caseId, onClose }: StandaloneTimelineWidgetProps) {
  const { t } = useTranslation()
  const timeline = useTimelineTool(SCRATCH_CASE_ID)
  const [saved, setSaved] = useState(false)

  const saveToNotes = useCallback(() => {
    if (timeline.entries.length === 0) return
    const sorted = [...timeline.entries].sort((a, b) => a.sortKey - b.sortKey)
    const lines: string[] = [t('standaloneTimelineNoteHeading'), '']
    for (const entry of sorted) {
      const sub = entry.subheading ? ` — ${entry.subheading}` : ''
      // Title is optional; entries without one are listed by date alone.
      const title = entry.heading.trim()
      lines.push(title ? `- ${entry.displayDate}: ${title}${sub}` : `- ${entry.displayDate}${sub}`)
    }
    saveStandaloneNote(caseId, {
      kind: 'timeline',
      title: t('standaloneTimelineNoteTitle'),
      content: lines.join('\n').trim(),
      category: 'formulare',
    })
    setSaved(true)
    showNotionToast(t('standaloneSavedToNotes'))
    window.setTimeout(() => setSaved(false), 2000)
  }, [timeline.entries, caseId, t])

  return (
    <div className="swx-canvas-host" aria-label={t('standaloneTimelineTitle')}>
      <div className="swx-canvas-host__bar">
        <h2 className="swx-canvas-host__title">{t('standaloneTimelineTitle')}</h2>
        <div className="swx-canvas-host__actions">
          <button
            type="button"
            className="wai-btn wai-btn--ghost"
            onClick={saveToNotes}
            disabled={timeline.entries.length === 0}
          >
            {saved ? (
              <Check className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            ) : (
              <Save className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            )}
            {saved ? t('standaloneSavedToNotes') : t('standaloneSaveToNotes')}
          </button>
          <button
            type="button"
            className="wai-panel__close"
            onClick={onClose}
            aria-label={t('dokumenteClose')}
          >
            <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      </div>
      <NotionTimelineCanvas caseId={SCRATCH_CASE_ID} timeline={timeline} />
    </div>
  )
}
