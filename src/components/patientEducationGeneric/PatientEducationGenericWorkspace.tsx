import { useCallback, useMemo, useState } from 'react'
import { ArrowLeft, Check, Plus, Printer, Save, Sparkles, Trash2, X } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { usePatientEducationGenericDocument } from '../../hooks/usePatientEducationGenericDocument'
import {
  getGenericEducationSections,
  genericEducationSubjectKindLabel,
} from '../../data/patientEducationGenericSections'
import { translateMedicationUi } from '../../data/medicationUiTranslations'
import {
  assembleGenericEducationText,
  copyGenericEducationText,
  exportGenericEducationDocxDocument,
  exportGenericEducationPdfDocument,
  exportGenericEducationPlainText,
  printGenericEducationDocument,
} from '../../utils/patientEducationGeneric/export'
import { MedicationEducationExportMenu } from '../medicationEducation/MedicationEducationExportMenu'
import { MedicationEducationReferencesPanel } from '../medicationEducation/MedicationEducationReferencesPanel'
import { MedicationEducationGenerationDialog } from '../medicationEducation/MedicationEducationGenerationDialog'
import { PatientEducationGenericNewDialog } from './PatientEducationGenericNewDialog'
import { PatientEducationGenericSectionCard } from './PatientEducationGenericSectionCard'
import { PatientEducationConsentPreview } from './PatientEducationConsentPreview'

interface PatientEducationGenericWorkspaceProps {
  onClose?: () => void
  /**
   * When provided, an extra toolbar action lets the clinician save the current
   * (patient-facing) assembled education text elsewhere — used by the patient-
   * less standalone workspace to persist the result as a standalone note. The
   * assembled text excludes clinician-only references (same as copy/export).
   */
  onSaveToNotes?: (text: string, title: string) => void
}

export function PatientEducationGenericWorkspace({
  onClose,
  onSaveToNotes,
}: PatientEducationGenericWorkspaceProps) {
  const { t, language } = useTranslation()
  const pe = usePatientEducationGenericDocument()
  const [newOpen, setNewOpen] = useState(false)

  const sections = useMemo(() => getGenericEducationSections(), [])

  const hasPendingAiSections = useMemo(() => {
    if (!pe.doc) return false
    return Object.values(pe.doc.sections).some(
      (s) => s.status === 'ai_generated' && s.currentContent.trim().length > 0,
    )
  }, [pe.doc])

  const showGenerationDialog =
    pe.generationProgress.active && pe.generationProgress.sectionIds.length > 1

  const exportTitle = pe.doc?.title ?? translateMedicationUi(language, 'pegenTitle')
  const exportFilenameStem = useMemo(() => {
    const base = (pe.doc?.subject ?? 'patientenaufklaerung').toLowerCase()
    return base.replace(/[^\wäöüß]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'patientenaufklaerung'
  }, [pe.doc?.subject])

  const handleCreate = useCallback(
    (params: Parameters<typeof pe.createNew>[0]) => {
      const created = pe.createNew(params)
      if (created) void pe.generateAllAiSections(created)
    },
    [pe],
  )

  const handleCopy = useCallback(async () => {
    if (!pe.doc) return
    await copyGenericEducationText(assembleGenericEducationText(pe.doc, pe.sectionLabels))
  }, [pe.doc, pe.sectionLabels])

  const handlePrint = useCallback(() => {
    if (!pe.doc) return
    printGenericEducationDocument(pe.doc, pe.sectionLabels, exportTitle, language)
  }, [exportTitle, language, pe.doc, pe.sectionLabels])

  const handleExportPdf = useCallback(() => {
    if (!pe.doc) return
    exportGenericEducationPdfDocument(pe.doc, pe.sectionLabels, exportTitle, language)
  }, [exportTitle, language, pe.doc, pe.sectionLabels])

  const handleExportDocx = useCallback(() => {
    if (!pe.doc) return
    exportGenericEducationDocxDocument(pe.doc, pe.sectionLabels, exportTitle, language)
  }, [exportTitle, language, pe.doc, pe.sectionLabels])

  const handleExportTxt = useCallback(() => {
    if (!pe.doc) return
    const text = assembleGenericEducationText(pe.doc, pe.sectionLabels)
    exportGenericEducationPlainText(text, `${exportFilenameStem}.txt`)
  }, [exportFilenameStem, pe.doc, pe.sectionLabels])

  const handleSaveToNotes = useCallback(() => {
    if (!pe.doc || !onSaveToNotes) return
    const text = assembleGenericEducationText(pe.doc, pe.sectionLabels)
    onSaveToNotes(text, exportTitle)
  }, [exportTitle, onSaveToNotes, pe.doc, pe.sectionLabels])

  const subjectChip = pe.doc
    ? `${genericEducationSubjectKindLabel(pe.doc.subjectKind, language === 'en' ? 'en' : 'de')} · ${pe.doc.subject}`
    : null

  return (
    <div className="arztbrief-workspace workspace-panel medication-education-workspace patient-education-generic-workspace">
      <header className="arztbrief-workspace__header workspace-panel__header medication-education-workspace__header">
        <div className="medication-education-workspace__header-top">
          {onClose ? (
            <button
              type="button"
              className="medication-education-workspace__back icon-action-btn"
              onClick={onClose}
              title={translateMedicationUi(language, 'medEducationBack')}
              aria-label={translateMedicationUi(language, 'medEducationBack')}
            >
              <ArrowLeft size={16} strokeWidth={1.75} aria-hidden />
            </button>
          ) : null}
          <div className="workspace-panel__title-block medication-education-workspace__title-block">
            <h1 className="workspace-panel__title">{translateMedicationUi(language, 'pegenTitle')}</h1>
            <p className="workspace-panel__subtitle">
              {translateMedicationUi(language, 'pegenWorkspaceHint')}
            </p>
            {subjectChip ? (
              <span className="medication-education-workspace__scope">{subjectChip}</span>
            ) : null}
          </div>
          {onClose ? (
            <button
              type="button"
              className="medication-education-workspace__close icon-action-btn icon-action-btn--bordered"
              onClick={onClose}
              title={translateMedicationUi(language, 'medEducationClose')}
              aria-label={translateMedicationUi(language, 'medEducationClose')}
            >
              <X size={16} strokeWidth={1.75} aria-hidden />
            </button>
          ) : null}
        </div>
        <div
          className="arztbrief-workspace__toolbar medication-education-workspace__toolbar"
          role="toolbar"
          aria-label={translateMedicationUi(language, 'pegenTitle')}
        >
          <button type="button" className="arztbrief-btn" onClick={() => setNewOpen(true)}>
            <Plus size={14} aria-hidden />
            {translateMedicationUi(language, 'pegenNew')}
          </button>
          {pe.doc ? (
            <>
              <button
                type="button"
                className="arztbrief-btn"
                disabled={pe.generatingSectionId !== null}
                onClick={() => void pe.generateAllAiSections()}
              >
                <Sparkles size={14} aria-hidden />
                {translateMedicationUi(language, 'medEducationGenerateAll')}
              </button>
              {hasPendingAiSections ? (
                <button
                  type="button"
                  className="arztbrief-btn arztbrief-btn--primary"
                  onClick={() => void pe.acceptAll()}
                >
                  <Check size={14} aria-hidden />
                  {translateMedicationUi(language, 'medEducationAcceptAll')}
                </button>
              ) : null}
              <div className="medication-education-toolbar__secondary">
                <button
                  type="button"
                  className="icon-action-btn icon-action-btn--bordered"
                  onClick={handlePrint}
                  title={translateMedicationUi(language, 'medEducationPrint')}
                  aria-label={translateMedicationUi(language, 'medEducationPrint')}
                >
                  <Printer size={15} strokeWidth={1.75} aria-hidden />
                </button>
                <MedicationEducationExportMenu
                  disabled={!pe.doc}
                  onExportPdf={handleExportPdf}
                  onExportDocx={handleExportDocx}
                  onExportTxt={handleExportTxt}
                  onCopy={handleCopy}
                />
              </div>
              {onSaveToNotes ? (
                <button
                  type="button"
                  className="arztbrief-btn arztbrief-btn--primary"
                  onClick={handleSaveToNotes}
                >
                  <Save size={14} aria-hidden />
                  {t('standaloneSaveToNotes')}
                </button>
              ) : null}
              <button
                type="button"
                className="icon-action-btn icon-action-btn--bordered icon-action-btn--danger"
                onClick={() => pe.removeDoc(pe.doc!.id)}
                title={translateMedicationUi(language, 'pegenDeleteDraft')}
                aria-label={translateMedicationUi(language, 'pegenDeleteDraft')}
              >
                <Trash2 size={15} strokeWidth={1.75} aria-hidden />
              </button>
            </>
          ) : null}
        </div>
      </header>

      {pe.error ? <p className="arztbrief-workspace__error">{pe.error}</p> : null}

      {pe.doc && hasPendingAiSections ? (
        <p className="medication-education-kb-warning">
          {translateMedicationUi(language, 'pegenReviewBanner')}
        </p>
      ) : null}

      {!pe.doc ? (
        <div className="arztbrief-workspace__empty">
          <p>{translateMedicationUi(language, 'pegenEmpty')}</p>
          <p className="patient-education-generic-empty__hint">
            {translateMedicationUi(language, 'pegenEmptyHint')}
          </p>
          <button
            type="button"
            className="arztbrief-btn arztbrief-btn--primary"
            onClick={() => setNewOpen(true)}
          >
            {translateMedicationUi(language, 'pegenNew')}
          </button>

          {pe.docs.length > 0 ? (
            <div className="patient-education-generic-drafts">
              <p className="patient-education-generic-drafts__label">
                {translateMedicationUi(language, 'pegenSavedDrafts')}
              </p>
              <ul className="patient-education-generic-drafts__list">
                {pe.docs.map((d) => (
                  <li key={d.id} className="patient-education-generic-drafts__item">
                    <button
                      type="button"
                      className="patient-education-generic-drafts__open"
                      onClick={() => pe.openDoc(d.id)}
                    >
                      <span className="patient-education-generic-drafts__title">{d.subject}</span>
                      <span className="patient-education-generic-drafts__meta">
                        {genericEducationSubjectKindLabel(d.subjectKind, language === 'en' ? 'en' : 'de')}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="icon-action-btn icon-action-btn--bordered icon-action-btn--danger"
                      onClick={() => pe.removeDoc(d.id)}
                      title={translateMedicationUi(language, 'pegenDeleteDraft')}
                      aria-label={translateMedicationUi(language, 'pegenDeleteDraft')}
                    >
                      <Trash2 size={14} strokeWidth={1.75} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="medication-education-sections app-scroll-region">
          {sections.map((def) => {
            const section = pe.doc!.sections[def.id]
            if (!section) return null
            return (
              <PatientEducationGenericSectionCard
                key={def.id}
                label={language === 'en' ? def.labelEn : def.labelDe}
                aiCapable={def.aiCapable ?? false}
                section={section}
                onChange={(content) => void pe.updateSection(def.id, content)}
                onGenerate={() => void pe.generateSection(def.id)}
                onAccept={() => void pe.accept(def.id)}
                onRevert={() => void pe.revert(def.id)}
                onToggleIncluded={() => void pe.toggleIncluded(def.id)}
                generating={pe.generatingSectionId === def.id}
              />
            )
          })}
          <MedicationEducationReferencesPanel
            references={pe.doc!.references ?? []}
            sectionLabels={pe.sectionLabels}
          />
          <PatientEducationConsentPreview language={language} />
        </div>
      )}

      <PatientEducationGenericNewDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreate={handleCreate}
      />

      {showGenerationDialog ? (
        <MedicationEducationGenerationDialog
          progress={pe.generationProgress}
          sectionLabels={pe.sectionLabels}
        />
      ) : null}
    </div>
  )
}
