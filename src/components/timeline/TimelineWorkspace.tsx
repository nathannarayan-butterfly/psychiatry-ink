import { Download, Eye, FileUp, Plus, Printer, Save } from 'lucide-react'
import { useMemo } from 'react'

import { useTranslation } from '../../context/TranslationContext'
import type { TimelineLayout } from '../../types/timeline'
import type { TimelineToolState } from '../../hooks/useTimelineTool'
import { IconButton } from '../IconButton'
import { PdfImportButton } from '../shared/PdfImportButton'
import { SavedItemsPanel } from '../shared/SavedItemsPanel'
import { TimelineEntryDialog } from './TimelineEntryDialog'
import { TimelineListView } from './TimelineListView'
import { TimelineViewer } from './TimelineViewer'
import { NotionPageDateTimeRow } from '../notion/NotionPageDateTimeRow'

interface TimelineWorkspaceProps {
  timeline: TimelineToolState
  caseId?: string
  onClose: () => void
  onVaultSave?: () => void
}

const layoutOptions: TimelineLayout[] = ['horizontal', 'snake', 'list']

const layoutLabelKey: Record<TimelineLayout, 'timelineLayoutHorizontal' | 'timelineLayoutSnake' | 'timelineLayoutList'> = {
  horizontal: 'timelineLayoutHorizontal',
  snake: 'timelineLayoutSnake',
  list: 'timelineLayoutList',
}

export function TimelineWorkspace({
  timeline,
  caseId,
  onClose,
  onVaultSave,
}: TimelineWorkspaceProps) {
  const { t } = useTranslation()
  const hiddenCount = timeline.entries.filter((entry) => !entry.visible).length
  const priorityLabels = {
    low: t('timelinePriorityLow'),
    medium: t('timelinePriorityMedium'),
    high: t('timelinePriorityHigh'),
    critical: t('timelinePriorityCritical'),
  } as const
  const entryActionLabels = {
    editLabel: t('timelineEditEntry'),
    hideLabel: t('timelineHideEntry'),
    showLabel: t('timelineShowEntry'),
    deleteLabel: t('timelineRemoveEntry'),
  }

  const savedItems = useMemo(
    () =>
      timeline.savedTimelines.map((item) => ({
        id: item.id,
        title: item.title,
        entryCount: item.entries.length,
        updatedAt: item.updatedAt,
      })),
    [timeline.savedTimelines],
  )

  return (
    <section className="timeline-workspace workspace-card flex min-h-0 flex-1 flex-col overflow-hidden">
      <SavedItemsPanel
        items={savedItems}
        activeId={timeline.activeTimelineId}
        newLabel={t('newTimeline')}
        openLabel={t('savedItemsOpen')}
        addDataLabel={t('savedItemsAddData')}
        emptyLabel={t('savedItemsNoTimelines')}
        entryCountLabel={t('savedItemsEntryCount')}
        lastEditedLabel={t('savedItemsLastEdited')}
        onOpen={timeline.openTimeline}
        onAddData={timeline.openTimeline}
        onCreateNew={timeline.createNewTimeline}
      />

      <header className="workspace-header workspace-header--timeline shrink-0">
        <div className="workspace-header__title-row">
          <div className="workspace-header__title-group">
            <h1 className="workspace-header__title">{t('timelineCreator')}</h1>
            {caseId ? (
              <NotionPageDateTimeRow
                pageId="timeline"
                caseId={caseId}
                onChange={() => onVaultSave?.()}
              />
            ) : null}
          </div>
          <div className="timeline-workspace__toolbar">
            <PdfImportButton
              label={t('importPdf')}
              className="icon-btn-bordered glass-surface glass-interactive inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/60 p-0 text-ink"
              onImport={(file) => void timeline.importTimelinePdf(file)}
            >
              <FileUp className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            </PdfImportButton>
            <IconButton
              bordered
              icon={<Save className="h-3.5 w-3.5" strokeWidth={1.5} />}
              label={t('timelineSaveSession')}
              onClick={timeline.saveSession}
              className={timeline.sessionSaved ? 'timeline-workspace__icon-btn--saved' : ''}
            />
            <IconButton
              bordered
              icon={<Download className="h-3.5 w-3.5" strokeWidth={1.5} />}
              label={t('exportPdf')}
              onClick={timeline.exportTimeline}
            />
            <IconButton
              bordered
              icon={<Printer className="h-3.5 w-3.5" strokeWidth={1.5} />}
              label={t('print')}
              onClick={() => timeline.printTimelineView(t('timelineCreator'))}
            />
          </div>
        </div>
        <div className="workspace-header__sub-row flex flex-wrap items-center gap-2">
          <p className="text-[12px] text-muted">{t('timelineImportPdfHint')}</p>
          <div className="workspace-header__segment shrink-0">
            {layoutOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={`workspace-header__segment-btn ${
                  timeline.layout === option ? 'workspace-header__segment-btn--active' : ''
                }`}
                onClick={() => timeline.setLayout(option)}
              >
                {t(layoutLabelKey[option])}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="timeline-workspace__action"
            onClick={timeline.openAddDialog}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            {t('timelineAddEntry')}
          </button>
          {hiddenCount > 0 ? (
            <button type="button" className="timeline-workspace__action" onClick={timeline.showAllEntries}>
              <Eye className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              {t('timelineShowAll').replace('{count}', String(hiddenCount))}
            </button>
          ) : null}
          <button type="button" className="timeline-workspace__close" onClick={onClose}>
            {t('timelineBackToDocumentation')}
          </button>
        </div>
      </header>

      <div className="timeline-workspace__body flex min-h-0 flex-1 flex-col overflow-hidden">
        {timeline.importError ? (
          <p className="timeline-workspace__error" role="alert">
            {t('pdfImportError')}
          </p>
        ) : null}
        {!timeline.activeTimelineId ? (
          <div className="timeline-workspace__empty">
            <p>{t('savedItemsNoTimelines')}</p>
            <button type="button" className="timeline-workspace__action" onClick={timeline.createNewTimeline}>
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              {t('newTimeline')}
            </button>
          </div>
        ) : timeline.entries.length === 0 ? (
          <div className="timeline-workspace__empty">
            <p>{t('timelineEmpty')}</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button type="button" className="timeline-workspace__action" onClick={timeline.openAddDialog}>
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                {t('timelineAddEntry')}
              </button>
              <PdfImportButton
                label={t('importPdf')}
                className="timeline-workspace__action inline-flex items-center gap-1.5"
                onImport={(file) => void timeline.importTimelinePdf(file)}
              >
                <FileUp className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                {t('importPdf')}
              </PdfImportButton>
            </div>
          </div>
        ) : timeline.layout === 'list' ? (
          <TimelineListView
            entries={timeline.entries}
            onEditEntry={timeline.openEditDialog}
            onDeleteEntry={timeline.removeEntry}
            onToggleEntryVisibility={timeline.toggleEntryVisibility}
            priorityLabels={priorityLabels}
            {...entryActionLabels}
          />
        ) : (
          <TimelineViewer
            entries={timeline.entries}
            layout={timeline.layout}
            onEditEntry={timeline.openEditDialog}
            onDeleteEntry={timeline.removeEntry}
            onToggleEntryVisibility={timeline.toggleEntryVisibility}
            {...entryActionLabels}
          />
        )}
      </div>

      <TimelineEntryDialog timeline={timeline} />
    </section>
  )
}
