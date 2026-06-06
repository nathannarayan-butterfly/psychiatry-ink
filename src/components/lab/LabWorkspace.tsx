import { Plus } from 'lucide-react'

import { useTranslation } from '../../context/TranslationContext'
import type { LabToolState } from '../../hooks/useLabTool'
import { LabChart } from './LabChart'
import { LabEntriesTable } from './LabEntriesTable'
import { LabEntryDialog } from './LabEntryDialog'
import { LabToolbar } from './LabToolbar'
import { MedicationMarkerDialog } from './MedicationMarkerDialog'

interface LabWorkspaceProps {
  lab: LabToolState
  onClose: () => void
}

export function LabWorkspace({ lab, onClose }: LabWorkspaceProps) {
  const { t } = useTranslation()
  const hasEntries = lab.entries.length > 0

  return (
    <section className="lab-workspace workspace-card flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="workspace-header workspace-header--lab shrink-0">
        <div className="workspace-header__title-row">
          <h1 className="workspace-header__title">{t('labVisualisation')}</h1>
        </div>
        <div className="workspace-header__sub-row flex flex-wrap items-center gap-2">
          <LabToolbar lab={lab} />
          <button type="button" className="lab-workspace__close" onClick={onClose}>
            {t('labBackToDocumentation')}
          </button>
        </div>
      </header>

      <div className="lab-workspace__body flex min-h-0 flex-1 flex-col overflow-hidden">
        {!hasEntries ? (
          <div className="lab-workspace__empty">
            <p>{t('labEmpty')}</p>
            <button type="button" className="lab-workspace__action" onClick={lab.openAddLabDialog}>
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              {t('labAddEntry')}
            </button>
          </div>
        ) : (
          <>
            <div className="lab-workspace__chart">
              <LabChart
                entries={lab.chartEntries}
                markers={lab.filteredMarkers}
                parameter={lab.selectedParameter}
              />
            </div>
            <div className="lab-workspace__table">
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
