import { useCallback, useEffect, useState } from 'react'
import { BookOpen, FileText, Loader2, Plus, Printer } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { translateMedicationUi } from '../../data/medicationUiTranslations'
import type { MedicationEntry } from '../../types/medicationPlan'
import type { MedicationEducationScope } from '../../types/medicationEducation'
import {
  getLatestAcceptedMedicationEducation,
  MEDICATION_EDUCATION_DOCS_CHANGED_EVENT,
  resolveMedicationEducationScopeId,
} from '../../utils/medicationEducation/storage'
import {
  buildMedicationEducationPrintHtml,
  exportMedicationEducationPdf,
  previewMedicationEducation,
} from '../../utils/medicationEducation/export'
import { getMedicationEducationSections } from '../../data/medicationEducationSections'
import { MedicationEducationWorkspace } from './MedicationEducationWorkspace'

interface MedicationEducationPanelProps {
  caseId: string
  activeMedications: MedicationEntry[]
  selectedMedicationId: string | null
  disabled?: boolean
}

export function MedicationEducationPanel({
  caseId,
  activeMedications,
  selectedMedicationId,
  disabled = false,
}: MedicationEducationPanelProps) {
  const { language } = useTranslation()
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [workspaceScope, setWorkspaceScope] = useState<MedicationEducationScope>('full_combination')
  const [workspaceMedIds, setWorkspaceMedIds] = useState<string[]>([])
  const [latestId, setLatestId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const refreshLatest = useCallback(async () => {
    const scopeId = resolveMedicationEducationScopeId(caseId)
    const latest = await getLatestAcceptedMedicationEducation(scopeId)
    setLatestId(latest?.id ?? null)
  }, [caseId])

  useEffect(() => {
    void refreshLatest()
    const handler = () => void refreshLatest()
    window.addEventListener(MEDICATION_EDUCATION_DOCS_CHANGED_EVENT, handler)
    return () => window.removeEventListener(MEDICATION_EDUCATION_DOCS_CHANGED_EVENT, handler)
  }, [refreshLatest])

  const openWorkspace = useCallback((scope: MedicationEducationScope, medIds: string[]) => {
    setWorkspaceScope(scope)
    setWorkspaceMedIds(medIds)
    setWorkspaceOpen(true)
  }, [])

  const handleShowLatest = useCallback(async () => {
    setLoading(true)
    try {
      const scopeId = resolveMedicationEducationScopeId(caseId)
      const latest = await getLatestAcceptedMedicationEducation(scopeId)
      if (!latest) return
      const defs = getMedicationEducationSections(latest.scope, { includePregnancy: true })
      const labels: Record<string, string> = {}
      for (const d of defs) labels[d.id] = language === 'en' ? d.labelEn : d.labelDe
      const html = buildMedicationEducationPrintHtml(latest, labels, latest.title)
      previewMedicationEducation(html)
    } finally {
      setLoading(false)
    }
  }, [caseId, language])

  const handleExportLatestPdf = useCallback(async () => {
    const scopeId = resolveMedicationEducationScopeId(caseId)
    const latest = await getLatestAcceptedMedicationEducation(scopeId)
    if (!latest) return
    const defs = getMedicationEducationSections(latest.scope, { includePregnancy: true })
    const labels: Record<string, string> = {}
    for (const d of defs) labels[d.id] = language === 'en' ? d.labelEn : d.labelDe
    const html = buildMedicationEducationPrintHtml(latest, labels, latest.title)
    exportMedicationEducationPdf(html)
  }, [caseId, language])

  const selectedIds = selectedMedicationId ? [selectedMedicationId] : []
  const hasMeds = activeMedications.length > 0

  if (workspaceOpen) {
    return (
      <MedicationEducationWorkspace
        caseId={caseId}
        disabled={disabled}
        initialScope={workspaceScope}
        initialMedicationIds={workspaceMedIds}
        onClose={() => setWorkspaceOpen(false)}
      />
    )
  }

  return (
    <section className="medication-education-panel" aria-label={translateMedicationUi(language, 'medEducationPanelTitle')}>
      <header className="medication-education-panel__header">
        <BookOpen size={18} strokeWidth={1.75} aria-hidden />
        <h3>{translateMedicationUi(language, 'medEducationPanelTitle')}</h3>
      </header>
      <p className="medication-education-panel__desc">
        {translateMedicationUi(language, 'medEducationPanelDesc')}
      </p>
      <div className="medication-education-panel__actions">
        <button
          type="button"
          className="medication-education-panel__btn"
          disabled={disabled || !hasMeds}
          onClick={() => openWorkspace('full_combination', activeMedications.map((m) => m.id))}
        >
          <Plus size={14} aria-hidden />
          {translateMedicationUi(language, 'medEducationCreateFull')}
        </button>
        <button
          type="button"
          className="medication-education-panel__btn"
          disabled={disabled || selectedIds.length === 0}
          onClick={() => openWorkspace('selected', selectedIds)}
        >
          <Plus size={14} aria-hidden />
          {translateMedicationUi(language, 'medEducationCreateSelected')}
        </button>
        {selectedMedicationId ? (
          <button
            type="button"
            className="medication-education-panel__btn"
            disabled={disabled}
            onClick={() => openWorkspace('single', [selectedMedicationId])}
          >
            {translateMedicationUi(language, 'medEducationCreateSingle')}
          </button>
        ) : null}
        <button
          type="button"
          className="medication-education-panel__btn"
          disabled={!latestId || loading}
          onClick={() => void handleShowLatest()}
        >
          {loading ? <Loader2 size={14} className="spin" /> : <FileText size={14} aria-hidden />}
          {translateMedicationUi(language, 'medEducationShowLatest')}
        </button>
        <button
          type="button"
          className="medication-education-panel__btn"
          disabled={!latestId}
          onClick={() => void handleExportLatestPdf()}
        >
          <Printer size={14} aria-hidden />
          {translateMedicationUi(language, 'medEducationExportPdf')}
        </button>
      </div>
    </section>
  )
}

/** Compact row actions for individual medication cards. */
export function MedicationEducationRowMenu({
  caseId,
  entry,
  disabled,
}: {
  caseId: string
  entry: MedicationEntry
  disabled?: boolean
}) {
  const { language } = useTranslation()
  const [open, setOpen] = useState(false)

  if (open) {
    return (
      <MedicationEducationWorkspace
        caseId={caseId}
        disabled={disabled}
        initialScope="single"
        initialMedicationIds={[entry.id]}
        onClose={() => setOpen(false)}
      />
    )
  }

  return (
    <button
      type="button"
      className="medication-row__education-btn"
      disabled={disabled}
      title={translateMedicationUi(language, 'medEducationRowAction')}
      onClick={(e) => {
        e.stopPropagation()
        setOpen(true)
      }}
    >
      <BookOpen size={14} strokeWidth={1.75} aria-hidden />
    </button>
  )
}
