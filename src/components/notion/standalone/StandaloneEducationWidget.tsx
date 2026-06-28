import { useCallback } from 'react'
import { useTranslation } from '../../../context/TranslationContext'
import { PatientEducationGenericWorkspace } from '../../patientEducationGeneric/PatientEducationGenericWorkspace'
import { saveStandaloneNote } from '../../../utils/standaloneNotes'
import { showNotionToast } from '../NotionToast'
import '../../../styles/standalone-workspace.css'

interface StandaloneEducationWidgetProps {
  /** Storage id of the (default) case the saved note is filed under. */
  caseId: string
  onClose: () => void
}

/**
 * Patient-less patient-education tool. Wraps the existing
 * {@link PatientEducationGenericWorkspace}: the clinician types a TOPIC (no
 * patient case is read as a source) and generates each section explicitly with
 * AI. The "Save to notes" action persists the assembled, patient-facing text as
 * a standalone note via {@link saveStandaloneNote} (using
 * `assembleGenericEducationText`, which already excludes clinician-only
 * references). Nothing is written into a patient case section.
 */
export function StandaloneEducationWidget({ caseId, onClose }: StandaloneEducationWidgetProps) {
  const { t } = useTranslation()

  const handleSaveToNotes = useCallback(
    (text: string, title: string) => {
      if (!text.trim()) return
      saveStandaloneNote(caseId, {
        kind: 'patient-education',
        title: title || t('standaloneEducationTitle'),
        content: text,
        category: 'formulare',
      })
      showNotionToast(t('standaloneSavedToNotes'))
    },
    [caseId, t],
  )

  return (
    <div
      className="swx-fullscreen"
      role="dialog"
      aria-modal="true"
      aria-label={t('standaloneEducationTitle')}
    >
      <PatientEducationGenericWorkspace onClose={onClose} onSaveToNotes={handleSaveToNotes} />
    </div>
  )
}
