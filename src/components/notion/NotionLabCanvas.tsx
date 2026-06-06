import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import type { LabToolState } from '../../hooks/useLabTool'
import type { NotionPageId } from './notionPages'
import { LabChart } from '../lab/LabChart'
import { LabEntriesTable } from '../lab/LabEntriesTable'
import { LabEntryDialog } from '../lab/LabEntryDialog'
import { LabToolbar } from '../lab/LabToolbar'
import { MedicationMarkerDialog } from '../lab/MedicationMarkerDialog'
import { SavedItemsPanel } from '../shared/SavedItemsPanel'
import { NotionPageDateTimeRow } from './NotionPageDateTimeRow'

interface NotionLabCanvasProps {
  caseId: string
  pageId: NotionPageId
  lab: LabToolState
  pageLabel: string
  onVaultSave?: () => void
}

export function NotionLabCanvas({
  caseId,
  pageId,
  lab,
  pageLabel,
  onVaultSave,
}: NotionLabCanvasProps) {
  const { t } = useTranslation()
  const hasEntries = lab.entries.length > 0

  const savedItems = useMemo(
    () =>
      lab.savedLabGraphs.map((graph) => ({
        id: graph.id,
        title: graph.title,
        entryCount: graph.entries.length,
        updatedAt: graph.updatedAt,
      })),
    [lab.savedLabGraphs],
  )

  return (
    <section className="notion-lab-canvas">
      <header className="notion-lab-canvas__header">
        <div className="notion-lab-canvas__title-row">
          <h1 className="notion-lab-canvas__title">{pageLabel}</h1>
          <NotionPageDateTimeRow pageId={pageId} caseId={caseId} onChange={() => onVaultSave?.()} />
        </div>
        <LabToolbar lab={lab} />
      </header>

      <SavedItemsPanel
        items={savedItems}
        activeId={lab.activeLabGraphId}
        newLabel={t('newLabGraph')}
        openLabel={t('savedItemsOpen')}
        addDataLabel={t('savedItemsAddData')}
        emptyLabel={t('savedItemsNoLabGraphs')}
        entryCountLabel={t('savedItemsEntryCount')}
        lastEditedLabel={t('savedItemsLastEdited')}
        onOpen={lab.openLabGraph}
        onAddData={lab.openLabGraph}
        onCreateNew={lab.createNewLabGraph}
      />

      <div className="notion-lab-canvas__body">
        {!lab.activeLabGraphId ? (
          <div className="notion-lab-canvas__empty">
            <p>{t('savedItemsNoLabGraphs')}</p>
            <button type="button" className="notion-lab-canvas__action" onClick={lab.createNewLabGraph}>
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              {t('newLabGraph')}
            </button>
          </div>
        ) : !hasEntries ? (
          <div className="notion-lab-canvas__empty">
            <p>{t('labEmpty')}</p>
            <button type="button" className="notion-lab-canvas__action" onClick={lab.openAddLabDialog}>
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              {t('labAddEntry')}
            </button>
          </div>
        ) : (
          <>
            <div className="notion-lab-canvas__chart">
              <LabChart
                entries={lab.chartEntries}
                markers={lab.filteredMarkers}
                parameter={lab.selectedParameter}
              />
            </div>
            <div className="notion-lab-canvas__table">
              <LabEntriesTable lab={lab} entries={lab.tableEntries} />
            </div>
          </>
        )}
      </div>

      <LabEntryDialog lab={lab} />
      <MedicationMarkerDialog lab={lab} />
    </section>
  )
}
