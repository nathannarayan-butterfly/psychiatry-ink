import { useCallback, useState } from 'react'
import { DiagnosenWidget } from './DiagnosenWidget'
import { IsdmAnalysisPanel } from '../workspace/IsdmAnalysisPanel'

interface DiagnosePageProps {
  caseId: string
  /** Persist diagnoses into the encrypted clinical case file when edited. */
  onDiagnosesChanged?: () => void
}

/** Dedicated clinical-area page listing the patient's coded diagnoses (ICD-10/11, DSM). */
export function DiagnosePage({ caseId, onDiagnosesChanged }: DiagnosePageProps) {
  const [diagnosesVersion, setDiagnosesVersion] = useState(0)

  const handleDiagnosesChanged = useCallback(() => {
    setDiagnosesVersion((value) => value + 1)
    onDiagnosesChanged?.()
  }, [onDiagnosesChanged])

  return (
    <div className="diagnose-page">
      <DiagnosenWidget caseId={caseId} variant="panel" onDiagnosesChanged={handleDiagnosesChanged} />
      <IsdmAnalysisPanel caseId={caseId} diagnosesVersion={diagnosesVersion} />
    </div>
  )
}
