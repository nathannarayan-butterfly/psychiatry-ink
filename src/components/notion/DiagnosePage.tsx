import { useCallback, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { ClinicalPageEyebrow } from '../clinical/ClinicalPageEyebrow'
import { DiagnosenWidget } from './DiagnosenWidget'
import { IsdmAnalysisPanel } from '../workspace/IsdmAnalysisPanel'
import type { NotionPageId } from './notionPages'

interface DiagnosePageProps {
  caseId: string
  /** Persist diagnoses into the encrypted clinical case file when edited. */
  onDiagnosesChanged?: () => void
  /** Open a workspace documentation page (Butterfly deep-link to add a finding). */
  onJumpToSection?: (pageId: NotionPageId) => void
}

/** Dedicated clinical-area page listing the patient's coded diagnoses (ICD-10/11). */
export function DiagnosePage({ caseId, onDiagnosesChanged, onJumpToSection }: DiagnosePageProps) {
  const { t } = useTranslation()
  const [diagnosesVersion, setDiagnosesVersion] = useState(0)

  const handleDiagnosesChanged = useCallback(() => {
    setDiagnosesVersion((value) => value + 1)
    onDiagnosesChanged?.()
  }, [onDiagnosesChanged])

  return (
    <div className="diagnose-page cm-workspace">
      <ClinicalPageEyebrow label={t('topNavDiagnose')} />
      <DiagnosenWidget
        caseId={caseId}
        variant="panel"
        flat
        onDiagnosesChanged={handleDiagnosesChanged}
      />
      <IsdmAnalysisPanel
        caseId={caseId}
        diagnosesVersion={diagnosesVersion}
        onJumpToSection={onJumpToSection}
        flat
      />
    </div>
  )
}
