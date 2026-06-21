import { useCallback, useMemo, useState } from 'react'
import { Copy, FileDown, Loader2, Plus, Printer, Save, Sparkles } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { useMedicationEducationDocument } from '../../hooks/useMedicationEducationDocument'
import { getMedicationEducationSections } from '../../data/medicationEducationSections'
import { translateMedicationUi } from '../../data/medicationUiTranslations'
import {
  assembleMedicationEducationText,
  buildMedicationEducationPrintHtml,
  copyMedicationEducationText,
  exportMedicationEducationPdf,
  exportMedicationEducationPlainText,
} from '../../utils/medicationEducation/export'
import { isClinicalIntelligenceDebugMode } from '../../utils/featureFlags'
import { MedicationEducationNewDialog } from './MedicationEducationNewDialog'
import { MedicationEducationSectionCard } from './MedicationEducationSectionCard'
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
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const debugMode = isClinicalIntelligenceDebugMode()

  const sections = useMemo(() => {
    if (!me.doc) return []
    return getMedicationEducationSections(me.doc.scope, { includePregnancy: true })
  }, [me.doc])

  const handleCreate = useCallback(
    async (params: Parameters<typeof me.createNew>[0]) => {
      const created = await me.createNew({
        ...params,
        medicationIds: initialMedicationIds,
        primaryMedicationId: initialScope === 'single' ? initialMedicationIds[0] : undefined,
      })
      if (created) {
        setExpandedId(getMedicationEducationSections(created.scope)[0]?.id ?? null)
        await me.generateAllAiSections(created)
      }
    },
    [initialMedicationIds, initialScope, me],
  )

  const exportTitle = me.doc?.title ?? translateMedicationUi(language, 'medEducationWorkspaceTitle')

  const handleCopy = useCallback(async () => {
    if (!me.doc) return
    const text = assembleMedicationEducationText(me.doc, me.sectionLabels)
    await copyMedicationEducationText(text)
  }, [me.doc, me.sectionLabels])

  const handlePrint = useCallback(() => {
    if (!me.doc) return
    const html = buildMedicationEducationPrintHtml(me.doc, me.sectionLabels, exportTitle)
    exportMedicationEducationPdf(html)
  }, [exportTitle, me.doc, me.sectionLabels])

  const handleExportTxt = useCallback(() => {
    if (!me.doc) return
    const text = assembleMedicationEducationText(me.doc, me.sectionLabels)
    exportMedicationEducationPlainText(text, `patientenaufklaerung-${caseId.slice(0, 8)}.txt`)
  }, [caseId, me.doc, me.sectionLabels])

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
        <div className="arztbrief-workspace__toolbar">
          <button type="button" className="arztbrief-btn" disabled={disabled} onClick={() => setNewOpen(true)}>
            <Plus size={14} />
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
                <Sparkles size={14} />
                {translateMedicationUi(language, 'medEducationGenerateAll')}
              </button>
              <button type="button" className="arztbrief-btn" disabled={!me.doc} onClick={() => void handleCopy()}>
                <Copy size={14} />
                {translateMedicationUi(language, 'medEducationCopy')}
              </button>
              <button type="button" className="arztbrief-btn" disabled={!me.doc} onClick={handlePrint}>
                <Printer size={14} />
                {translateMedicationUi(language, 'medEducationPrint')}
              </button>
              <button type="button" className="arztbrief-btn" disabled={!me.doc} onClick={handleExportTxt}>
                <FileDown size={14} />
                {translateMedicationUi(language, 'medEducationExportTxt')}
              </button>
              <button
                type="button"
                className="arztbrief-btn arztbrief-btn--primary"
                disabled={disabled || !me.doc}
                onClick={() => void me.finalize()}
              >
                <Save size={14} />
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

      {me.doc?.requiresKbValidation ? (
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
        <div className="arztbrief-workspace__sections">
          {sections.map((def) => {
            const section = me.doc!.sections[def.id]
            if (!section) return null
            return (
              <MedicationEducationSectionCard
                key={def.id}
                scope={me.doc!.scope}
                section={section}
                expanded={expandedId === def.id}
                onToggleExpand={() => setExpandedId((id) => (id === def.id ? null : def.id))}
                onChange={(content) => void me.updateSection(def.id, content)}
                onGenerate={() => void me.generateSection(def.id)}
                onAccept={() => void me.accept(def.id)}
                onRevert={() => void me.revert(def.id)}
                onToggleIncluded={() => void me.toggleIncluded(def.id)}
                generating={me.generatingSectionId === def.id}
              />
            )
          })}
        </div>
      )}

      <MedicationEducationNewDialog
        open={newOpen}
        initialScope={initialScope}
        selectedMedicationIds={initialMedicationIds}
        onClose={() => setNewOpen(false)}
        onCreate={(params) => void handleCreate({ ...params, medicationIds: initialMedicationIds })}
        loadSafetyPanel={() =>
          me.buildPreGenerationPanel({
            scope: initialScope,
            medicationIds: initialMedicationIds,
          })
        }
      />
    </div>
  )
}
