import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { translateMedicationUi } from '../../data/medicationUiTranslations'
import { useMedicationPlan } from '../../hooks/useMedicationPlan'
import type { MedicationEntry } from '../../types/medicationPlan'
import type { MedicationDraft } from '../../utils/medication/planOps'
import { MedicationEditDialog } from './MedicationEditDialog'
import { MedicationLowerSections } from './MedicationLowerSections'
import { MedicationRow } from './MedicationRow'
import { MedicationToolbar } from './MedicationToolbar'
import { MedicationHistoryPanel, PlanNavigator } from './PlanNavigator'
import { SideEffectDialog } from './SideEffectDialog'

interface MedicationWorkspaceProps {
  caseId: string
  disabled?: boolean
}

export function MedicationWorkspace({ caseId, disabled = false }: MedicationWorkspaceProps) {
  const { language } = useTranslation()
  const med = useMedicationPlan(caseId)
  const printRef = useRef<HTMLDivElement>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<MedicationEntry | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sideEffectOpen, setSideEffectOpen] = useState(false)
  const [sideEffectMedId, setSideEffectMedId] = useState<string | undefined>()
  const [showPlanHistory, setShowPlanHistory] = useState(false)

  const medications = med.currentPlan?.medications ?? []
  const hasMedications = medications.length > 0
  const hasPlanHistory = useMemo(
    () =>
      med.state.plans.length > 1 ||
      med.state.plans.some((plan) => plan.medications.length > 0),
    [med.state.plans],
  )
  const selectedEntry = useMemo(
    () => medications.find((item) => item.id === selectedId) ?? null,
    [medications, selectedId],
  )

  const openAdd = useCallback(() => {
    setEditingEntry(null)
    setEditOpen(true)
  }, [])

  const openEdit = useCallback((entry: MedicationEntry) => {
    setEditingEntry(entry)
    setEditOpen(true)
  }, [])

  const handleSaveDraft = useCallback(
    (draft: MedicationDraft) => {
      if (editingEntry) {
        med.updateMedication(editingEntry.id, draft)
      } else {
        med.addMedication(draft)
      }
    },
    [editingEntry, med],
  )

  const handleExport = useCallback(() => {
    const payload = {
      exportedAt: new Date().toISOString(),
      caseId,
      state: med.state,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${translateMedicationUi(language, 'medExportFilename')}-${caseId.slice(0, 8)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }, [caseId, language, med.state])

  const handlePrint = useCallback(() => {
    const content = printRef.current
    if (!content) {
      window.print()
      return
    }
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>${translateMedicationUi(language, 'medPageTitle')}</title>
      <style>
        body { font-family: system-ui, sans-serif; font-size: 13px; padding: 1.5rem; }
        h1 { font-size: 1rem; margin-bottom: 1rem; }
        .med { border-bottom: 1px solid #ddd; padding: 0.5rem 0; }
      </style></head><body>
      <h1>${translateMedicationUi(language, 'medPageTitle')}</h1>
      ${content.innerHTML}
      </body></html>`)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    printWindow.close()
  }, [language])

  const jumpToCurrentPlan = useCallback(() => {
    const current = med.state.plans.find((plan) => plan.isCurrent)
    if (current) med.selectPlan(current.id)
  }, [med])

  return (
    <div className="medication-workspace">
      <div className="medication-workspace__disclaimer">
        <p>{translateMedicationUi(language, 'medDisclaimerDemo')}</p>
      </div>

      <div className="medication-workspace__columns">
        <div className="medication-workspace__main">
          <MedicationToolbar
            disabled={disabled}
            hasMedications={hasMedications}
            hasPlanHistory={hasPlanHistory}
            onAdd={openAdd}
            onEdit={() => selectedEntry && openEdit(selectedEntry)}
            editDisabled={!selectedEntry}
            onExport={handleExport}
            onPrint={handlePrint}
            onCopyPlan={med.copyPlan}
            onViewHistory={() => setShowPlanHistory((open) => !open)}
          />

          <PlanNavigator
            plans={med.state.plans}
            currentPlanId={med.state.currentPlanId}
            showHistory={showPlanHistory && hasPlanHistory}
            onSelectPlan={med.selectPlan}
            onJumpToCurrent={jumpToCurrentPlan}
          />

          {showPlanHistory && hasPlanHistory ? (
            <MedicationHistoryPanel plans={med.state.plans} />
          ) : null}

          <div className="medication-workspace__list" ref={printRef}>
            {!hasMedications ? (
              <div className="medication-workspace__empty">
                <p className="medication-workspace__empty-text">{translateMedicationUi(language, 'medEmpty')}</p>
                <p className="medication-workspace__empty-hint">{translateMedicationUi(language, 'medEmptyHint')}</p>
              </div>
            ) : (
              medications.map((entry) => (
                <MedicationRow
                  key={entry.id}
                  entry={entry}
                  disabled={disabled}
                  selected={selectedId === entry.id}
                  onSelect={() => setSelectedId(entry.id)}
                  onEdit={() => openEdit(entry)}
                  onAddSideEffect={() => {
                    setSideEffectMedId(entry.id)
                    setSideEffectOpen(true)
                  }}
                />
              ))
            )}
          </div>

          <MedicationLowerSections
            state={med.state}
            medications={medications}
            disabled={disabled}
            onReportSideEffect={med.reportSideEffect}
            onLabNotesChange={med.updateLabNotes}
            variant="main"
          />
        </div>

        <aside className="medication-workspace__aside">
          <MedicationLowerSections
            state={med.state}
            medications={medications}
            disabled={disabled}
            onReportSideEffect={med.reportSideEffect}
            onLabNotesChange={med.updateLabNotes}
            variant="aside"
          />
        </aside>
      </div>

      <MedicationEditDialog
        open={editOpen}
        editingEntry={editingEntry}
        disabled={disabled}
        onClose={() => setEditOpen(false)}
        onSave={handleSaveDraft}
      />

      <SideEffectDialog
        open={sideEffectOpen}
        medications={medications}
        preselectedMedicationId={sideEffectMedId}
        disabled={disabled}
        onClose={() => setSideEffectOpen(false)}
        onSave={med.reportSideEffect}
      />
    </div>
  )
}
