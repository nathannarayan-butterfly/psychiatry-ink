import { useCallback, useState } from 'react'
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
import { getDischargeSummarySections } from '../../data/dischargeSummarySections'
import { useDischargeSummaryDocument } from '../../hooks/useDischargeSummaryDocument'
import {
  copyDischargeSummaryText,
  exportDischargeSummaryDocx,
  exportDischargeSummaryPdf,
  printDischargeSummary,
} from '../../utils/dischargeSummary/export'
import { fetchDischargeSummaryPatientData } from '../../utils/dischargeSummary/fetchPatientData'
import { isClinicalIntelligenceDebugMode } from '../../utils/featureFlags'
import type {
  DischargeSummaryDocumentType,
  DischargeSummaryRegion,
} from '../../types/dischargeSummary'
import type { AiMode } from '../../types/aiUsage'
import { DischargeSummaryNewDialog } from './DischargeSummaryNewDialog'
import { DischargeSummarySectionCard } from './DischargeSummarySectionCard'

interface DischargeSummaryWorkspaceProps {
  caseId: string
  disabled?: boolean
}

export function DischargeSummaryWorkspace({
  caseId,
  disabled = false,
}: DischargeSummaryWorkspaceProps) {
  const { t } = useTranslation()
  const patientScoped = caseId !== DEFAULT_CASE_ID
  const ds = useDischargeSummaryDocument(caseId, patientScoped)

  const [newOpen, setNewOpen] = useState(false)
  const [newDocType, setNewDocType] = useState<DischargeSummaryDocumentType>('short_discharge_summary')
  const [draftsOpen, setDraftsOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [coveragePreview, setCoveragePreview] = useState<{
    coverage: Array<{ labelEn: string; available: boolean }>
    missingSummary: string[]
  } | null>(null)

  const openNewDialog = useCallback(
    async (preset: DischargeSummaryDocumentType) => {
      setNewDocType(preset)
      if (patientScoped) {
        const fetched = await fetchDischargeSummaryPatientData(
          caseId,
          preset,
          'international',
        )
        setCoveragePreview({ coverage: fetched.coverage, missingSummary: fetched.missingSummary })
      } else {
        setCoveragePreview({ coverage: [], missingSummary: [] })
      }
      setNewOpen(true)
    },
    [caseId, patientScoped],
  )

  const handleCreate = useCallback(
    async (
      documentType: DischargeSummaryDocumentType,
      region: DischargeSummaryRegion,
      mode: AiMode,
    ) => {
      await ds.createNew(documentType, region, mode)
      const first = getDischargeSummarySections(documentType)[0]?.id
      setExpandedId(first ?? null)
    },
    [ds],
  )

  const handleCopy = useCallback(async () => {
    if (!ds.draft) return
    await copyDischargeSummaryText(ds.finalText)
  }, [ds])

  const debugMode = isClinicalIntelligenceDebugMode()

  return (
    <div className="arztbrief-workspace workspace-panel">
      <header className="arztbrief-workspace__header workspace-panel__header">
        <div className="workspace-panel__title-block">
          <h1 className="workspace-panel__title">{t('dischargeSummaryWorkspaceTitle')}</h1>
          <p className="workspace-panel__subtitle">
            {patientScoped
              ? t('dischargeSummaryWorkspacePatientHint')
              : t('dischargeSummaryWorkspaceBlankHint')}
          </p>
        </div>
        <div className="arztbrief-workspace__toolbar">
          <button
            type="button"
            className="arztbrief-btn"
            disabled={disabled}
            onClick={() => void openNewDialog('short_discharge_summary')}
          >
            <Plus size={14} />
            {t('dischargeSummaryNewShort')}
          </button>
          <button
            type="button"
            className="arztbrief-btn"
            disabled={disabled}
            onClick={() => void openNewDialog('full_psychiatric_discharge_summary')}
          >
            <FileText size={14} />
            {t('dischargeSummaryNewFull')}
          </button>
          <button type="button" className="arztbrief-btn" onClick={() => setDraftsOpen((v) => !v)}>
            <FolderOpen size={14} />
            {t('dischargeSummaryOpenDrafts')}
          </button>
          {ds.drafts.length > 0 && ds.draft ? (
            <button
              type="button"
              className="arztbrief-btn"
              onClick={() => void ds.duplicatePrevious(ds.draft!.id)}
            >
              {t('dischargeSummaryDuplicate')}
            </button>
          ) : null}
          {ds.draft ? (
            <>
              <button
                type="button"
                className="arztbrief-btn"
                onClick={() => exportDischargeSummaryPdf(ds.draft!, ds.sectionLabels)}
              >
                <FileDown size={14} />
                {t('dischargeSummaryExportPdf')}
              </button>
              <button
                type="button"
                className="arztbrief-btn"
                onClick={() => exportDischargeSummaryDocx(ds.draft!, ds.sectionLabels)}
              >
                <FileDown size={14} />
                {t('dischargeSummaryExportDocx')}
              </button>
              <button
                type="button"
                className="arztbrief-btn"
                onClick={() => printDischargeSummary(ds.draft!, ds.sectionLabels)}
              >
                <Printer size={14} />
                {t('dischargeSummaryPrint')}
              </button>
              <button type="button" className="arztbrief-btn" onClick={() => void handleCopy()}>
                <Copy size={14} />
                {t('dischargeSummaryCopy')}
              </button>
            </>
          ) : null}
        </div>
      </header>

      {draftsOpen ? (
        <div className="arztbrief-drafts">
          {ds.drafts.length === 0 ? (
            <p>{t('dischargeSummaryNoDrafts')}</p>
          ) : (
            <ul>
              {ds.drafts.map((d) => (
                <li key={d.id}>
                  <button type="button" onClick={() => void ds.openDraft(d.id)}>
                    {d.title} — {new Date(d.updatedAt).toLocaleString()}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {ds.error ? (
        <p className="arztbrief-error" role="alert">
          {ds.error}
        </p>
      ) : null}

      {ds.loading ? (
        <div className="arztbrief-loading">
          <Loader2 className="spin" size={24} />
        </div>
      ) : null}

      {!ds.draft && !ds.loading ? (
        <div className="arztbrief-empty workspace-panel__empty">
          <p>{t('dischargeSummaryEmpty')}</p>
          <button
            type="button"
            className="arztbrief-btn arztbrief-btn--primary"
            onClick={() => void openNewDialog('short_discharge_summary')}
          >
            {t('dischargeSummaryStart')}
          </button>
        </div>
      ) : null}

      {ds.draft ? (
        <div className="arztbrief-workspace__body workspace-panel__body">
          <div className="arztbrief-meta">
            <strong>{ds.draft.title}</strong>
            <span>{t(`dischargeSummaryStatus_${ds.draft.status}`)}</span>
            <span>{ds.draft.region}</span>
            <button
              type="button"
              className="arztbrief-btn arztbrief-btn--ghost"
              onClick={() => void ds.saveFinal()}
            >
              {t('dischargeSummarySave')}
            </button>
          </div>

          {getDischargeSummarySections(ds.draft.documentType).map((def) => {
            const section = ds.draft!.sections[def.id]
            if (!section) return null
            return (
              <DischargeSummarySectionCard
                key={def.id}
                documentType={ds.draft!.documentType}
                region={ds.draft!.region}
                section={section}
                label={ds.sectionLabels[def.id] ?? def.labelEn}
                expanded={expandedId === def.id}
                onToggleExpand={() => setExpandedId((c) => (c === def.id ? null : def.id))}
                onChange={(content) => void ds.updateSection(def.id, content)}
                onGenerate={() => void ds.generateSection(def.id)}
                onAccept={() => void ds.accept(def.id)}
                onRevert={() => void ds.revert(def.id)}
                onToggleIncluded={() => void ds.toggleIncluded(def.id)}
                generating={ds.generatingSectionId === def.id}
                estimatedCredits={ds.estimateSectionCredits()}
              />
            )
          })}

          {debugMode && ds.lastDebug ? (
            <details className="arztbrief-debug">
              <summary>{t('dischargeSummaryDebugTitle')}</summary>
              <pre>{JSON.stringify(ds.lastDebug, null, 2)}</pre>
            </details>
          ) : null}
        </div>
      ) : null}

      <DischargeSummaryNewDialog
        open={newOpen}
        initialDocumentType={newDocType}
        onClose={() => setNewOpen(false)}
        onCreate={(type, region, mode) => void handleCreate(type, region, mode)}
        coverage={coveragePreview?.coverage}
        missingSummary={coveragePreview?.missingSummary}
      />
    </div>
  )
}
