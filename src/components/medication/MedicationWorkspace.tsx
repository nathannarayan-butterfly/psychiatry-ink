import { Plus } from 'lucide-react'
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { useMedicationSectionNavOptional } from '../../contexts/MedicationSectionNavContext'
import { translateMedicationUi } from '../../data/medicationUiTranslations'
import { useKnowledgeBaseUserId } from '../../hooks/useKnowledgeBaseUserId'
import { useMedicationPlan } from '../../hooks/useMedicationPlan'
import type { MedicationEntry } from '../../types/medicationPlan'
import type { MedicationDraft } from '../../utils/medication/planOps'
import { derivePlanTimeline, visibleMedications } from '../../utils/medication/planOps'
import { MedicationDeleteDialog } from './MedicationDeleteDialog'
import { MedicationEditDialog } from './MedicationEditDialog'
import {
  MEDICATION_SECTIONS,
  MedicationLowerSections,
  type MedicationSectionKey,
} from './MedicationLowerSections'
import { MEDICATION_SECTION_META } from './medicationSectionMeta'
import { MedicationEntryHistoryDialog } from './MedicationEntryHistoryDialog'
import { MedicationInsightStrip } from './MedicationInsightStrip'
import { MedicationPlanDashboard } from './MedicationPlanDashboard'
import { MedicationPlanHistory } from './MedicationPlanHistory'
import { PriorTherapiesPanel } from './PriorTherapiesPanel'
import { MedicationRow } from './MedicationRow'
import { MedicationToolbar } from './MedicationToolbar'

interface MedicationWorkspaceProps {
  caseId: string
  disabled?: boolean
  /** Hide the hero's primary "add" button (e.g. when a parent owns the trigger). */
  showToolbarAdd?: boolean
}

/** Imperative handle so a parent (e.g. a cross-tab trigger) can open the add dialog. */
export interface MedicationWorkspaceHandle {
  openAdd: () => void
}

export const MedicationWorkspace = forwardRef<MedicationWorkspaceHandle, MedicationWorkspaceProps>(
  function MedicationWorkspace({ caseId, disabled = false, showToolbarAdd = true }, ref) {
  const { language } = useTranslation()
  const sectionNav = useMedicationSectionNavOptional()
  const [localSection, setLocalSection] = useState<MedicationSectionKey>('plan')
  const selectedSection = sectionNav?.activeSection ?? localSection
  const deletedBy = useKnowledgeBaseUserId()
  const med = useMedicationPlan(caseId)
  const printRef = useRef<HTMLDivElement>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<MedicationEntry | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingEntry, setDeletingEntry] = useState<MedicationEntry | null>(null)
  const [historyMode, setHistoryMode] = useState(false)
  const [historyEntry, setHistoryEntry] = useState<MedicationEntry | null>(null)

  const selectSection = useCallback(
    (key: MedicationSectionKey) => {
      if (key === 'plan') setHistoryMode(false)
      if (sectionNav) sectionNav.setActiveSection(key)
      else setLocalSection(key)
    },
    [sectionNav],
  )

  const medications = useMemo(
    () => visibleMedications(med.currentPlan?.medications ?? []),
    [med.currentPlan?.medications],
  )
  const hasMedications = medications.length > 0
  const planTimeline = useMemo(
    () => derivePlanTimeline(med.currentPlan?.medications ?? []),
    [med.currentPlan?.medications],
  )
  // Only meaningful once there is at least one prior plan state to look back at.
  const hasPlanHistory = planTimeline.length > 1
  const selectedEntry = useMemo(
    () => medications.find((item) => item.id === selectedId) ?? null,
    [medications, selectedId],
  )

  const openAdd = useCallback(() => {
    setEditingEntry(null)
    setEditOpen(true)
  }, [])

  useImperativeHandle(ref, () => ({ openAdd }), [openAdd])

  const openEdit = useCallback((entry: MedicationEntry) => {
    setEditingEntry(entry)
    setEditOpen(true)
  }, [])

  const openDelete = useCallback((entry: MedicationEntry) => {
    setDeletingEntry(entry)
    setDeleteOpen(true)
  }, [])

  const handleDeleteConfirm = useCallback(
    (medicationId: string, input: Parameters<typeof med.deleteMedication>[1]) => {
      med.deleteMedication(medicationId, input)
      if (selectedId === medicationId) setSelectedId(null)
    },
    [med, selectedId],
  )

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

  const isPlan = selectedSection === 'plan'

  const planHero = (
    <div className="medication-plan" id="med-section-plan">
      <header className="medication-hero">
        <div className="medication-hero__intro">
          <span className="medication-hero__eyebrow">
            {translateMedicationUi(language, 'medHeroEyebrow')}
          </span>
          <h2 className="medication-hero__title">{translateMedicationUi(language, 'medPageTitle')}</h2>
          <p className="medication-hero__desc">{translateMedicationUi(language, 'medDescPlan')}</p>
        </div>
        <div className="medication-hero__actions">
          {showToolbarAdd ? (
            <button
              type="button"
              className="medication-hero__add"
              disabled={disabled}
              onClick={openAdd}
            >
              <Plus size={15} strokeWidth={2.2} aria-hidden />
              {translateMedicationUi(language, 'medAddMedication')}
            </button>
          ) : null}
        </div>
      </header>

      {!historyMode && hasMedications ? (
        <MedicationInsightStrip medications={medications} />
      ) : null}

      {historyMode ? (
        <MedicationPlanHistory timeline={planTimeline} onBackToCurrent={() => setHistoryMode(false)} />
      ) : (
        <>
          <MedicationToolbar
            disabled={disabled}
            hasMedications={hasMedications}
            showAdd={false}
            onAdd={openAdd}
            onEdit={() => selectedEntry && openEdit(selectedEntry)}
            editDisabled={!selectedEntry}
            onExport={handleExport}
            onPrint={handlePrint}
            onCopyPlan={med.copyPlan}
            hasPlanHistory={hasPlanHistory}
            historyMode={historyMode}
            onToggleHistory={() => setHistoryMode((open) => !open)}
          />

          <div className="medication-plan__list" ref={printRef}>
            {!hasMedications ? (
              <div className="medication-workspace__empty">
                <p className="medication-workspace__empty-text">
                  {translateMedicationUi(language, 'medEmpty')}
                </p>
                <p className="medication-workspace__empty-hint">
                  {translateMedicationUi(language, 'medEmptyHint')}
                </p>
                {showToolbarAdd ? (
                  <button
                    type="button"
                    className="medication-hero__add"
                    disabled={disabled}
                    onClick={openAdd}
                  >
                    <Plus size={15} strokeWidth={2.2} aria-hidden />
                    {translateMedicationUi(language, 'medAddMedication')}
                  </button>
                ) : null}
              </div>
            ) : (
              medications.map((entry) => (
                <MedicationRow
                  key={entry.id}
                  entry={entry}
                  disabled={disabled}
                  selected={selectedId === entry.id}
                  onSelect={() => setSelectedId(entry.id)}
                  onHistory={() => setHistoryEntry(entry)}
                  onEdit={() => openEdit(entry)}
                  onDelete={() => openDelete(entry)}
                />
              ))
            )}
          </div>

          {hasMedications ? (
            <MedicationPlanDashboard medications={medications} onOpenSection={selectSection} />
          ) : null}

          <PriorTherapiesPanel caseId={caseId} medications={medications} />


          {hasMedications ? (
            <section className="medication-explore" aria-label={translateMedicationUi(language, 'medExploreSections')}>
              <p className="medication-explore__label">
                {translateMedicationUi(language, 'medExploreSections')}
              </p>
              <div className="medication-explore__grid">
                {MEDICATION_SECTIONS.filter((section) => section.key !== 'plan').map((section) => {
                  const meta = MEDICATION_SECTION_META[section.key]
                  const Icon = meta.Icon
                  return (
                    <button
                      key={section.key}
                      type="button"
                      className="medication-explore__card"
                      data-section={section.key}
                      onClick={() => selectSection(section.key)}
                    >
                      <span className="medication-explore__icon" aria-hidden="true">
                        <Icon size={18} strokeWidth={1.85} />
                      </span>
                      <span className="medication-explore__text">
                        <span className="medication-explore__title">
                          {translateMedicationUi(language, meta.labelKey)}
                        </span>
                        <span className="medication-explore__desc">
                          {translateMedicationUi(language, meta.descKey)}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          ) : null}

          <p className="medication-workspace__disclaimer-note">
            {translateMedicationUi(language, 'medDisclaimerDemo')}
          </p>
        </>
      )}
    </div>
  )

  return (
    <div className="medication-workspace medication-workspace--flagship">
      {!sectionNav ? (
        <nav className="medication-tabs" aria-label={translateMedicationUi(language, 'medSectionsLabel')}>
          {MEDICATION_SECTIONS.map((section) => {
            const meta = MEDICATION_SECTION_META[section.key]
            const Icon = meta.Icon
            const isActive = selectedSection === section.key
            return (
              <button
                key={section.key}
                type="button"
                className={`medication-tabs__tab${isActive ? ' medication-tabs__tab--active' : ''}`}
                onClick={() => selectSection(section.key)}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={14} strokeWidth={1.9} aria-hidden />
                {translateMedicationUi(language, section.labelKey)}
              </button>
            )
          })}
        </nav>
      ) : null}

      {isPlan ? (
        planHero
      ) : (
        <MedicationLowerSections
          caseId={caseId}
          state={med.state}
          medications={medications}
          disabled={disabled}
          onReportSideEffect={med.reportSideEffect}
          onLabNotesChange={med.updateLabNotes}
          mode="detail"
          activeSection={selectedSection}
          onBack={() => selectSection('plan')}
        />
      )}

      <MedicationEditDialog
        open={editOpen}
        editingEntry={editingEntry}
        disabled={disabled}
        onClose={() => setEditOpen(false)}
        onSave={handleSaveDraft}
      />

      <MedicationDeleteDialog
        open={deleteOpen}
        entry={deletingEntry}
        disabled={disabled}
        deletedBy={deletedBy}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
      />

      <MedicationEntryHistoryDialog
        open={historyEntry !== null}
        entry={historyEntry}
        onClose={() => setHistoryEntry(null)}
      />
    </div>
  )
})
