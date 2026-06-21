import { useCallback, useMemo, useState } from 'react'
import { Check, Loader2, Plus, Save, Sparkles } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { useMedicationEducationDocument } from '../../hooks/useMedicationEducationDocument'
import { getMedicationEducationSections } from '../../data/medicationEducationSections'
import { translateMedicationUi } from '../../data/medicationUiTranslations'
import {
  assembleMedicationEducationText,
  copyMedicationEducationText,
  exportMedicationEducationDocxDocument,
  exportMedicationEducationPdfDocument,
  exportMedicationEducationPlainText,
  printMedicationEducationDocument,
} from '../../utils/medicationEducation/export'
import { loadMedicationPlanState } from '../../utils/medication/storage'
import { activeMedications } from '../../utils/medication/planOps'
import { isClinicalIntelligenceDebugMode } from '../../utils/featureFlags'
import { MedicationEducationNewDialog } from './MedicationEducationNewDialog'
import { MedicationEducationSectionCard } from './MedicationEducationSectionCard'
import { MedicationEducationGenerationDialog } from './MedicationEducationGenerationDialog'
import { MedicationEducationExportMenu } from './MedicationEducationExportMenu'
import { MedicationEducationReferencesPanel } from './MedicationEducationReferencesPanel'
import type { MedicationEducationScope } from '../../types/medicationEducation'

interface MedicationEducationWorkspaceProps {
  caseId: string
  disabled?: boolean
  initialScope?: MedicationEducationScope
  initialMedicationIds?: string[]
  onClose?: () => void
}

export function MedicationEducationWorkspace({
  caseId,
  disabled = false,
  initialScope = 'full_combination',
  initialMedicationIds = [],
  onClose,
}: MedicationEducationWorkspaceProps) {
  const { language } = useTranslation()
  const me = useMedicationEducationDocument(caseId)
  const [newOpen, setNewOpen] = useState(!me.doc)
  const debugMode = isClinicalIntelligenceDebugMode()

  const availableMedications = useMemo(() => {
    const planState = loadMedicationPlanState(caseId)
    const currentPlan = planState?.plans.find((p) => p.id === planState.currentPlanId)
    return activeMedications(currentPlan?.medications ?? [])
  }, [caseId])

  const sections = useMemo(() => {
    if (!me.doc) return []
    return getMedicationEducationSections(me.doc.scope, { includePregnancy: true })
  }, [me.doc])

  const generationSectionLabels = useMemo(() => {
    const scope = me.doc?.scope ?? initialScope
    const labels: Record<string, string> = {}
    for (const s of getMedicationEducationSections(scope, { includePregnancy: true })) {
      labels[s.id] = language === 'en' ? s.labelEn : s.labelDe
    }
    return labels
  }, [initialScope, language, me.doc?.scope])

  const hasPendingAiSections = useMemo(() => {
    if (!me.doc) return false
    return Object.values(me.doc.sections).some(
      (s) => s.status === 'ai_generated' && s.currentContent.trim().length > 0,
    )
  }, [me.doc])

  const showKbValidationBanner = Boolean(me.doc?.requiresKbValidation && hasPendingAiSections)

  const showGenerationDialog =
    me.generationProgress.active && me.generationProgress.sectionIds.length > 1

  const handleCreate = useCallback(
    async (params: Parameters<typeof me.createNew>[0]) => {
      const created = await me.createNew(params)
      if (created) {
        await me.generateAllAiSections(created)
      }
    },
    [me],
  )

  const exportTitle = me.doc?.title ?? translateMedicationUi(language, 'medEducationWorkspaceTitle')
  const exportFilenameStem = `patientenaufklaerung-${caseId.slice(0, 8)}`

  const handleCopy = useCallback(async () => {
    if (!me.doc) return
    const text = assembleMedicationEducationText(me.doc, me.sectionLabels)
    await copyMedicationEducationText(text)
  }, [me.doc, me.sectionLabels])

  const handlePrint = useCallback(() => {
    if (!me.doc) return
    printMedicationEducationDocument(me.doc, me.sectionLabels, exportTitle)
  }, [exportTitle, me.doc, me.sectionLabels])

  const handleExportPdf = useCallback(() => {
    if (!me.doc) return
    exportMedicationEducationPdfDocument(me.doc, me.sectionLabels, exportTitle)
  }, [exportTitle, me.doc, me.sectionLabels])

  const handleExportDocx = useCallback(() => {
    if (!me.doc) return
    exportMedicationEducationDocxDocument(me.doc, me.sectionLabels, exportTitle)
  }, [exportTitle, me.doc, me.sectionLabels])

  const handleExportTxt = useCallback(() => {
    if (!me.doc) return
    const text = assembleMedicationEducationText(me.doc, me.sectionLabels)
    exportMedicationEducationPlainText(text, `${exportFilenameStem}.txt`)
  }, [exportFilenameStem, me.doc, me.sectionLabels])

  const resolveMedicationIdsForScope = useCallback(
    (scope: MedicationEducationScope, singleMedicationId: string | null) => {
      if (scope === 'full_combination') {
        return availableMedications.map((m) => m.id)
      }
      if (scope === 'single') {
        return singleMedicationId ? [singleMedicationId] : []
      }
      return initialMedicationIds.length > 0
        ? initialMedicationIds
        : availableMedications.map((m) => m.id)
    },
    [availableMedications, initialMedicationIds],
  )

  return (
    <div className="arztbrief-workspace workspace-panel medication-education-workspace">
      <header className="arztbrief-workspace__header workspace-panel__header">
        <div className="workspace-panel__title-block">
          <h1 className="workspace-panel__title">
            {translateMedicationUi(language, 'medEducationWorkspaceTitle')}
          </h1>
          <p className="workspace-panel__subtitle">
            {translateMedicationUi(language, 'medEducationWorkspaceHint')}
          </p>
        </div>
        <div
          className="arztbrief-workspace__toolbar"
          role="toolbar"
          aria-label={translateMedicationUi(language, 'medEducationToolbarLabel')}
        >
          <button type="button" className="arztbrief-btn" disabled={disabled} onClick={() => setNewOpen(true)}>
            <Plus size={14} aria-hidden />
            {translateMedicationUi(language, 'medEducationNew')}
          </button>
          {me.doc ? (
            <>
              <button
                type="button"
                className="arztbrief-btn"
                disabled={disabled || me.generatingSectionId !== null}
                onClick={() => void me.generateAllAiSections()}
              >
                <Sparkles size={14} aria-hidden />
                {translateMedicationUi(language, 'medEducationGenerateAll')}
              </button>
              {hasPendingAiSections ? (
                <button
                  type="button"
                  className="arztbrief-btn arztbrief-btn--primary"
                  disabled={disabled}
                  onClick={() => void me.acceptAll()}
                >
                  <Check size={14} aria-hidden />
                  {translateMedicationUi(language, 'medEducationAcceptAll')}
                </button>
              ) : null}
              <MedicationEducationExportMenu
                disabled={!me.doc}
                onExportPdf={handleExportPdf}
                onExportDocx={handleExportDocx}
                onExportTxt={handleExportTxt}
                onCopy={handleCopy}
                onPrint={handlePrint}
              />
              <button
                type="button"
                className="arztbrief-btn arztbrief-btn--primary"
                disabled={disabled || !me.doc}
                onClick={() => void me.finalize()}
              >
                <Save size={14} aria-hidden />
                {translateMedicationUi(language, 'medEducationFinalize')}
              </button>
            </>
          ) : null}
          {onClose ? (
            <button type="button" className="arztbrief-btn arztbrief-btn--ghost" onClick={onClose}>
              {translateMedicationUi(language, 'medEducationClose')}
            </button>
          ) : null}
        </div>
      </header>

      {me.error ? <p className="arztbrief-workspace__error">{me.error}</p> : null}

      {me.doc?.isOutdated ? (
        <p className="medication-education-outdated">
          {translateMedicationUi(language, 'medEducationOutdatedWarning')}
        </p>
      ) : null}

      {showKbValidationBanner ? (
        <p className="medication-education-kb-warning">
          {translateMedicationUi(language, 'medEducationKbValidationRequired')}
        </p>
      ) : null}

      {debugMode && me.lastDebug ? (
        <details className="medication-education-debug">
          <summary>Debug (dev)</summary>
          <pre>{JSON.stringify(me.lastDebug, null, 2)}</pre>
        </details>
      ) : null}

      {me.loading ? (
        <p className="arztbrief-workspace__loading">
          <Loader2 size={16} className="spin" aria-hidden />
        </p>
      ) : null}

      {!me.doc ? (
        <div className="arztbrief-workspace__empty">
          <p>{translateMedicationUi(language, 'medEducationEmpty')}</p>
          <button type="button" className="arztbrief-btn arztbrief-btn--primary" onClick={() => setNewOpen(true)}>
            {translateMedicationUi(language, 'medEducationNew')}
          </button>
        </div>
      ) : (
        <div className="medication-education-sections">
          {sections.map((def) => {
            const section = me.doc!.sections[def.id]
            if (!section) return null
            return (
              <MedicationEducationSectionCard
                key={def.id}
                scope={me.doc!.scope}
                section={section}
                onChange={(content) => void me.updateSection(def.id, content)}
                onGenerate={() => void me.generateSection(def.id)}
                onAccept={() => void me.accept(def.id)}
                onRevert={() => void me.revert(def.id)}
                onToggleIncluded={() => void me.toggleIncluded(def.id)}
                generating={me.generatingSectionId === def.id}
              />
            )
          })}
          <MedicationEducationReferencesPanel
            references={me.doc!.references ?? []}
            sectionLabels={me.sectionLabels}
          />
        </div>
      )}

      <MedicationEducationNewDialog
        open={newOpen}
        initialScope={initialScope}
        initialMedicationIds={initialMedicationIds}
        availableMedications={availableMedications}
        onClose={() => setNewOpen(false)}
        onCreate={(params) => void handleCreate(params)}
        loadSafetyPanel={({ scope, medicationIds }) =>
          me.buildPreGenerationPanel({ scope, medicationIds })
        }
        resolveMedicationIds={resolveMedicationIdsForScope}
      />

      {showGenerationDialog ? (
        <MedicationEducationGenerationDialog
          progress={me.generationProgress}
          sectionLabels={generationSectionLabels}
        />
      ) : null}
    </div>
  )
}
