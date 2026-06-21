import { useCallback, useMemo, useState } from 'react'
import {
  Copy,
  FileDown,
  FileText,
  FolderOpen,
  Loader2,
  Plus,
  Printer,
} from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { DEFAULT_CASE_ID } from '../../utils/caseContext'
import { getArztbriefSections } from '../../data/arztbriefSections'
import { useArztbriefDocument } from '../../hooks/useArztbriefDocument'
import {
  copyArztbriefText,
  exportArztbriefDocx,
  exportArztbriefPdf,
  printArztbrief,
} from '../../utils/arztbrief/export'
import { fetchArztbriefPatientData } from '../../utils/arztbrief/fetchPatientData'
import { isClinicalIntelligenceDebugMode } from '../../utils/featureFlags'
import { ArztbriefNewDialog } from './ArztbriefNewDialog'
import { ArztbriefSectionCard } from './ArztbriefSectionCard'

interface ArztbriefWorkspaceProps {
  caseId: string
  disabled?: boolean
}

export function ArztbriefWorkspace({ caseId, disabled = false }: ArztbriefWorkspaceProps) {
  const { t, language } = useTranslation()
  const patientScoped = caseId !== DEFAULT_CASE_ID
  const ab = useArztbriefDocument(caseId, patientScoped)

  const [newOpen, setNewOpen] = useState(false)
  const [newDocType, setNewDocType] = useState<'kurzbrief' | 'langbrief'>('kurzbrief')
  const [draftsOpen, setDraftsOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [coveragePreview, setCoveragePreview] = useState<{
    coverage: Array<{ labelDe: string; labelEn: string; available: boolean }>
    missingSummary: string[]
  } | null>(null)

  const sectionLabels = useMemo(() => {
    if (!ab.draft) return {}
    const defs = getArztbriefSections(ab.draft.documentType)
    const labels: Record<string, string> = {}
    for (const def of defs) {
      labels[def.id] = language === 'en' ? def.labelEn : def.labelDe
    }
    return labels
  }, [ab.draft, language])

  const openNewDialog = useCallback(
    async (preset: 'kurzbrief' | 'langbrief') => {
      setNewDocType(preset)
      if (patientScoped) {
        const fetched = await fetchArztbriefPatientData(caseId, preset)
        setCoveragePreview({ coverage: fetched.coverage, missingSummary: fetched.missingSummary })
      } else {
        setCoveragePreview({ coverage: [], missingSummary: [] })
      }
      setNewOpen(true)
    },
    [caseId, patientScoped],
  )

  const handleCreate = useCallback(
    async (documentType: 'kurzbrief' | 'langbrief', mode: import('../../types/aiUsage').AiMode) => {
      await ab.createNew(documentType, mode)
      const first = getArztbriefSections(documentType)[0]?.id
      setExpandedId(first ?? null)
    },
    [ab],
  )

  const handleCopy = useCallback(async () => {
    if (!ab.draft) return
    await copyArztbriefText(ab.finalText)
  }, [ab])

  const debugMode = isClinicalIntelligenceDebugMode()

  return (
    <div className="arztbrief-workspace workspace-panel">
      <header className="arztbrief-workspace__header workspace-panel__header">
        <div className="workspace-panel__title-block">
          <h1 className="workspace-panel__title">{t('arztbriefWorkspaceTitle')}</h1>
          <p className="workspace-panel__subtitle">
            {patientScoped ? t('arztbriefWorkspacePatientHint') : t('arztbriefWorkspaceBlankHint')}
          </p>
        </div>
        <div className="arztbrief-workspace__toolbar">
          <button type="button" className="arztbrief-btn" disabled={disabled} onClick={() => void openNewDialog('kurzbrief')}>
            <Plus size={14} />
            {t('arztbriefNewKurz')}
          </button>
          <button
            type="button"
            className="arztbrief-btn"
            disabled={disabled}
            onClick={() => void openNewDialog('langbrief')}
          >
            <FileText size={14} />
            {t('arztbriefNewLang')}
          </button>
          <button type="button" className="arztbrief-btn" onClick={() => setDraftsOpen((v) => !v)}>
            <FolderOpen size={14} />
            {t('arztbriefOpenDrafts')}
          </button>
          {ab.drafts.length > 0 && ab.draft ? (
            <button
              type="button"
              className="arztbrief-btn"
              onClick={() => void ab.duplicatePrevious(ab.draft!.id)}
            >
              {t('arztbriefDuplicate')}
            </button>
          ) : null}
          {ab.draft ? (
            <>
              <button
                type="button"
                className="arztbrief-btn"
                onClick={() => exportArztbriefPdf(ab.draft!, sectionLabels)}
              >
                <FileDown size={14} />
                {t('arztbriefExportPdf')}
              </button>
              <button
                type="button"
                className="arztbrief-btn"
                onClick={() => exportArztbriefDocx(ab.draft!, sectionLabels)}
              >
                <FileDown size={14} />
                {t('arztbriefExportDocx')}
              </button>
              <button
                type="button"
                className="arztbrief-btn"
                onClick={() => printArztbrief(ab.draft!, sectionLabels)}
              >
                <Printer size={14} />
                {t('arztbriefPrint')}
              </button>
              <button type="button" className="arztbrief-btn" onClick={() => void handleCopy()}>
                <Copy size={14} />
                {t('arztbriefCopy')}
              </button>
            </>
          ) : null}
        </div>
      </header>

      {draftsOpen ? (
        <div className="arztbrief-drafts">
          {ab.drafts.length === 0 ? (
            <p>{t('arztbriefNoDrafts')}</p>
          ) : (
            <ul>
              {ab.drafts.map((d) => (
                <li key={d.id}>
                  <button type="button" onClick={() => void ab.openDraft(d.id)}>
                    {d.title} — {new Date(d.updatedAt).toLocaleString()}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {ab.error ? <p className="arztbrief-error" role="alert">{ab.error}</p> : null}

      {ab.loading ? (
        <div className="arztbrief-loading">
          <Loader2 className="spin" size={24} />
        </div>
      ) : null}

      {!ab.draft && !ab.loading ? (
        <div className="arztbrief-empty workspace-panel__empty">
          <p>{t('arztbriefEmpty')}</p>
          <button type="button" className="arztbrief-btn arztbrief-btn--primary" onClick={() => void openNewDialog('kurzbrief')}>
            {t('arztbriefStart')}
          </button>
        </div>
      ) : null}

      {ab.draft ? (
        <div className="arztbrief-workspace__body workspace-panel__body">
          <div className="arztbrief-meta">
            <strong>{ab.draft.title}</strong>
            <span>{t(`arztbriefStatus_${ab.draft.status}`)}</span>
            <button type="button" className="arztbrief-btn arztbrief-btn--ghost" onClick={() => void ab.saveFinal()}>
              {t('arztbriefSave')}
            </button>
          </div>

          {getArztbriefSections(ab.draft.documentType).map((def) => {
            const section = ab.draft!.sections[def.id]
            if (!section) return null
            return (
              <ArztbriefSectionCard
                key={def.id}
                documentType={ab.draft!.documentType}
                section={section}
                expanded={expandedId === def.id}
                onToggleExpand={() => setExpandedId((c) => (c === def.id ? null : def.id))}
                onChange={(content) => void ab.updateSection(def.id, content)}
                onGenerate={() => void ab.generateSection(def.id)}
                onAccept={() => void ab.accept(def.id)}
                onRevert={() => void ab.revert(def.id)}
                onToggleIncluded={() => void ab.toggleIncluded(def.id)}
                generating={ab.generatingSectionId === def.id}
                estimatedCredits={ab.estimateSectionCredits()}
              />
            )
          })}

          {debugMode && ab.lastDebug ? (
            <details className="arztbrief-debug">
              <summary>{t('arztbriefDebugTitle')}</summary>
              <pre>{JSON.stringify(ab.lastDebug, null, 2)}</pre>
            </details>
          ) : null}
        </div>
      ) : null}

      <ArztbriefNewDialog
        open={newOpen}
        initialDocumentType={newDocType}
        onClose={() => setNewOpen(false)}
        onCreate={(type, mode) => void handleCreate(type, mode)}
        coverage={coveragePreview?.coverage}
        missingSummary={coveragePreview?.missingSummary}
      />
    </div>
  )
}
