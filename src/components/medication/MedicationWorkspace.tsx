import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import {
  medicationSectionDomId,
  useMedicationSectionNavOptional,
} from '../../contexts/MedicationSectionNavContext'
import { translateMedicationUi } from '../../data/medicationUiTranslations'
import { useKnowledgeBaseUserId } from '../../hooks/useKnowledgeBaseUserId'
import { useMedicationPlan } from '../../hooks/useMedicationPlan'
import type { MedicationEntry } from '../../types/medicationPlan'
import type { MedicationDraft } from '../../utils/medication/planOps'
import {
  activeMedications,
  derivePlanTimeline,
  visibleMedications,
} from '../../utils/medication/planOps'
import { loadBefunde } from '../../utils/laborArchive'
import { getParameterMonitoringRows } from '../../utils/overview/medicationMonitoring'
import { FONT_SANS } from '../../styles/typographyTokens'
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
import { SpiegelwerteSection } from '../notion/SpiegelwerteSection'
import { MedicationPlanDashboard } from './MedicationPlanDashboard'
import { MedicationPlanHistory } from './MedicationPlanHistory'
import { PriorTherapiesPanel } from './PriorTherapiesPanel'
import { MedicationRow } from './MedicationRow'
import { MedicationToolbar } from './MedicationToolbar'
import { MedicationEducationPanel } from '../medicationEducation/MedicationEducationPanel'

interface MedicationWorkspaceProps {
  caseId: string
  disabled?: boolean
  /** Hide the plan-list "add" button (e.g. when a parent owns the trigger). */
  showToolbarAdd?: boolean
  /** Standalone workspace (no patient chart) — alternate copy and slimmer panels. */
  context?: 'patient' | 'standalone'
}

/** Imperative handle so a parent (e.g. a cross-tab trigger) can open the add dialog. */
export interface MedicationWorkspaceHandle {
  openAdd: () => void
  openSideEffectsSection: () => void
}

export const MedicationWorkspace = forwardRef<MedicationWorkspaceHandle, MedicationWorkspaceProps>(
  function MedicationWorkspace({ caseId, disabled = false, showToolbarAdd = true, context = 'patient' }, ref) {
  const isStandalone = context === 'standalone'
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

  const allVisibleMedications = useMemo(
    () => visibleMedications(med.currentPlan?.medications ?? []),
    [med.currentPlan?.medications],
  )
  const activePlanMedications = useMemo(
    () => activeMedications(allVisibleMedications),
    [allVisibleMedications],
  )
  const hasActiveMedications = activePlanMedications.length > 0
  const hasAnyVisibleMedications = allVisibleMedications.length > 0
  const planTimeline = useMemo(
    () => derivePlanTimeline(med.currentPlan?.medications ?? []),
    [med.currentPlan?.medications],
  )
  // Meaningful when there is a prior plan state, or when non-active meds exist only in history.
  const hasNonActiveMedications = allVisibleMedications.some(
    (med) => med.status === 'discontinued' || med.status === 'paused',
  )
  const hasPlanHistory =
    planTimeline.length > 1 || (planTimeline.length > 0 && hasNonActiveMedications)
  const parameterMonitoring = useMemo(
    () =>
      getParameterMonitoringRows({
        medications: activePlanMedications,
        befunde: loadBefunde(caseId),
        language,
      }),
    [caseId, activePlanMedications, language],
  )
  const selectedEntry = useMemo(
    () => activePlanMedications.find((item) => item.id === selectedId) ?? null,
    [activePlanMedications, selectedId],
  )

  const openAdd = useCallback(() => {
    setEditingEntry(null)
    setEditOpen(true)
  }, [])

  const openSideEffectsSection = useCallback(() => {
    selectSection('sideEffects')
    requestAnimationFrame(() => {
      const target = document.getElementById(medicationSectionDomId('sideEffects'))
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [selectSection])

  useImperativeHandle(ref, () => ({ openAdd, openSideEffectsSection }), [openAdd, openSideEffectsSection])

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
        body { font-family: ${FONT_SANS}; font-size: 13px; padding: 1.5rem; }
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
  const isEducation = selectedSection === 'education'
  const educationMeta = MEDICATION_SECTION_META.education
  const EducationIcon = educationMeta.Icon

  const planHero = (
    <div className="medication-plan" id="med-section-plan">
      <header className="medication-hero">
        <div className="medication-hero__intro">
          <span className="medication-hero__eyebrow">
            {translateMedicationUi(
              language,
              isStandalone ? 'medStandaloneHeroEyebrow' : 'medHeroEyebrow',
            )}
          </span>
          <h2 className="medication-hero__title">
            {translateMedicationUi(
              language,
              isStandalone ? 'medStandalonePageTitle' : 'medPageTitle',
            )}
          </h2>
        </div>
      </header>

      {!historyMode && hasActiveMedications ? (
        <MedicationInsightStrip
          medications={activePlanMedications}
          curatedTargetReceptors={med.state.curatedTargetReceptors}
        />
      ) : null}

      {historyMode ? (
        <MedicationPlanHistory timeline={planTimeline} onBackToCurrent={() => setHistoryMode(false)} />
      ) : (
        <>
          <MedicationToolbar
            disabled={disabled}
            hasMedications={hasAnyVisibleMedications}
            showAdd={showToolbarAdd}
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
            {!hasActiveMedications ? (
              <div className="medication-workspace__empty">
                <p className="medication-workspace__empty-text">
                  {hasAnyVisibleMedications
                    ? translateMedicationUi(
                        language,
                        isStandalone ? 'medStandaloneEmptyNoActive' : 'medEmptyNoActive',
                      )
                    : translateMedicationUi(
                        language,
                        isStandalone ? 'medStandaloneEmpty' : 'medEmpty',
                      )}
                </p>
                <p className="medication-workspace__empty-hint">
                  {hasAnyVisibleMedications
                    ? translateMedicationUi(
                        language,
                        isStandalone ? 'medStandaloneEmptyNoActiveHint' : 'medEmptyNoActiveHint',
                      )
                    : translateMedicationUi(
                        language,
                        isStandalone ? 'medStandaloneEmptyHint' : 'medEmptyHint',
                      )}
                </p>
              </div>
            ) : (
              activePlanMedications.map((entry) => (
                <MedicationRow
                  key={entry.id}
                  entry={entry}
                  caseId={isStandalone ? undefined : caseId}
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

          {hasActiveMedications ? (
            <MedicationPlanDashboard
              caseId={caseId}
              medications={activePlanMedications}
              parameterMonitoring={parameterMonitoring}
              curatedTargetReceptors={med.state.curatedTargetReceptors}
              onCuratedTargetReceptorsChange={med.updateCuratedTargetReceptors}
              disabled={disabled}
              onOpenSection={selectSection}
            />
          ) : null}

          {/* The full Medikamente-page widgets — drug levels (Spiegel), prior
              therapies and patient education — are surfaced in the workspace
              medication context too, not only in the patient chart (Item 4).
              Each reads from the active caseId and degrades gracefully when the
              workspace has no linked patient. */}
          <SpiegelwerteSection caseId={caseId} />

          <PriorTherapiesPanel caseId={caseId} medications={allVisibleMedications} />

          {hasActiveMedications ? (
            <MedicationEducationPanel
              caseId={caseId}
              activeMedications={activePlanMedications}
              selectedMedicationId={selectedId}
              disabled={disabled}
            />
          ) : null}

          {hasActiveMedications ? (
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
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  )

  return (
    <div
      className={[
        'medication-workspace medication-workspace--flagship',
        isStandalone ? 'medication-workspace--standalone' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
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
      ) : isEducation ? (
        <section
          className="medication-section-detail"
          data-section="education"
          id={medicationSectionDomId('education')}
        >
          <header className="medication-section-detail__head">
            <button
              type="button"
              className="medication-section-detail__back"
              onClick={() => selectSection('plan')}
            >
              <ArrowLeft size={14} aria-hidden />
              {translateMedicationUi(language, 'medBackToPlan')}
            </button>
            <div className="medication-section-detail__title-row">
              <span className="medication-section-detail__icon" aria-hidden="true">
                <EducationIcon size={20} strokeWidth={1.85} />
              </span>
              <div className="medication-section-detail__heading">
                <h2 className="medication-section-detail__title">
                  {translateMedicationUi(language, educationMeta.labelKey)}
                </h2>
              </div>
            </div>
          </header>
          <div className="medication-section-detail__body medication-lower-section__body">
            <MedicationEducationPanel
              caseId={caseId}
              activeMedications={activePlanMedications}
              selectedMedicationId={selectedId}
              disabled={disabled}
            />
          </div>
        </section>
      ) : (
        <MedicationLowerSections
          caseId={caseId}
          state={med.state}
          medications={allVisibleMedications}
          disabled={disabled}
          onReportSideEffect={med.reportSideEffect}
          onUpdateSideEffectReport={med.updateSideEffect}
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
