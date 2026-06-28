import { useCallback, useState } from 'react'
import { Check, Save, X } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import { useLabTool } from '../../../hooks/useLabTool'
import { NotionLabCanvas } from '../NotionLabCanvas'
import { saveStandaloneNote } from '../../../utils/standaloneNotes'
import { showNotionToast } from '../NotionToast'
import '../../../styles/standalone-workspace.css'

/**
 * Dedicated scratch namespace for the patient-less lab visualisation. Keyed
 * storage that is NEVER a patient case — `useLabTool` persists its ad-hoc graphs
 * under this id only, so no patient lab data is read or written.
 */
const SCRATCH_CASE_ID = 'standalone-labviz'

interface StandaloneLabVizWidgetProps {
  /** Storage id of the (default) case any saved note is filed under (notes panel). */
  caseId: string
  onClose: () => void
}

/**
 * Patient-less lab visualisation tool. Renders the existing
 * {@link NotionLabCanvas} on an ad-hoc in-memory dataset (a dedicated scratch
 * namespace, never a patient case): the clinician adds/edits lab values and
 * optional serial timepoints and gets the same chart/trend view the patient
 * Labor page uses. A textual summary of the current graph can be saved to the
 * standalone notes (under the real patient-less `caseId` so it shows in the
 * notes panel).
 */
export function StandaloneLabVizWidget({ caseId, onClose }: StandaloneLabVizWidgetProps) {
  const { t } = useTranslation()
  const lab = useLabTool(SCRATCH_CASE_ID)
  const [saved, setSaved] = useState(false)

  const saveToNotes = useCallback(() => {
    if (lab.entries.length === 0) return
    const byParameter = new Map<string, typeof lab.entries>()
    for (const entry of lab.entries) {
      const key = entry.parameter.trim() || '—'
      const list = byParameter.get(key) ?? []
      list.push(entry)
      byParameter.set(key, list)
    }
    const lines: string[] = [t('standaloneLabVizNoteHeading')]
    if (lab.activeLabGraphTitle) lines.push(lab.activeLabGraphTitle)
    for (const [parameter, list] of byParameter) {
      lines.push('', `${parameter}:`)
      const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date))
      for (const entry of sorted) {
        const unit = entry.unit ? ` ${entry.unit}` : ''
        const ref =
          entry.referenceLow !== null || entry.referenceHigh !== null
            ? ` (Ref ${entry.referenceLow ?? '–'}–${entry.referenceHigh ?? '–'})`
            : ''
        lines.push(`- ${entry.date}: ${entry.value}${unit}${ref}`)
      }
    }
    saveStandaloneNote(caseId, {
      kind: 'labviz',
      title: t('standaloneLabVizNoteTitle'),
      content: lines.join('\n').trim(),
      category: 'laborbefunde',
    })
    setSaved(true)
    showNotionToast(t('standaloneSavedToNotes'))
    window.setTimeout(() => setSaved(false), 2000)
  }, [lab.entries, lab.activeLabGraphTitle, caseId, t])

  return (
    <div className="swx-canvas-host" aria-label={t('standaloneLabVizTitle')}>
      <div className="swx-canvas-host__bar">
        <h2 className="swx-canvas-host__title">{t('standaloneLabVizTitle')}</h2>
        <div className="swx-canvas-host__actions">
          <button
            type="button"
            className="wai-btn wai-btn--ghost"
            onClick={saveToNotes}
            disabled={lab.entries.length === 0}
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
      <NotionLabCanvas
        caseId={SCRATCH_CASE_ID}
        pageId="visualisation"
        lab={lab}
        pageLabel={t('standaloneLabVizTitle')}
      />
    </div>
  )
}
