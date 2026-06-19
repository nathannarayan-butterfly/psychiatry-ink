import { MedicationSectionNav } from '../medication/MedicationSectionNav'
import { TherapySectionNav } from '../medication/TherapySectionNav'
import { DiagnosticsSectionNav } from '../diagnostik/DiagnosticsSectionNav'
import { NotionDiarySidebar } from './NotionDiarySidebar'
import { CaseSidebarQuickNav } from './CaseSidebarQuickNav'
import { DokumenteSectionNav } from './DokumenteSectionNav'
import { DiscussSectionNav } from '../discuss-case/DiscussSectionNav'
import type { TopNavTabId } from './CaseTopNav'
import type { NotionPageId } from './notionPages'
import type { SavedDoc } from '../../utils/savedDocs'

interface CaseSidebarContentProps {
  activeTab: TopNavTabId
  onOpenWorkspacePage?: (pageId: NotionPageId) => void
  onOpenTemplateFromPatient?: () => void
  onAddAnforderung?: () => void
  /** Workspace tab — diary sidebar widgets (date, timers, recent docs, etc.). */
  workspaceSidebar?: {
    storageCaseId: string
    panelGraphicEnabled: boolean
    onClosePanelGraphic: () => void
    onNavigateToLabor?: () => void
    savedDocs?: SavedDoc[]
    onViewSavedDoc?: (doc: SavedDoc) => void
    onRemoveSavedDoc?: (id: string) => void
    openDocumentLabel?: string
    onCloseDocument?: () => void
    onAddAnforderung?: () => void
    anforderungenReadOnly?: boolean
  }
}

/** Tab-specific content below clinical areas in the global case sidebar panel. */
export function CaseSidebarContent({
  activeTab,
  onOpenWorkspacePage,
  onOpenTemplateFromPatient,
  onAddAnforderung,
  workspaceSidebar,
}: CaseSidebarContentProps) {
  switch (activeTab) {
    // Übersicht has no quick-nav: documentation is started from the Workspace
    // context (its sidebar fallback and the workspace command/context menu).
    case 'overview':
      return null

    case 'dokumente':
      return <DokumenteSectionNav />

    case 'discuss':
      return <DiscussSectionNav />

    case 'verlauf':
    case 'diagnose':
    case 'konsil':
      return null

    case 'labor':
      return <DiagnosticsSectionNav />

    case 'medikation':
      return <MedicationSectionNav />

    case 'therapie':
      return <TherapySectionNav />

    case 'workspace':
      if (workspaceSidebar) {
        return (
          <NotionDiarySidebar
            panelGraphicEnabled={workspaceSidebar.panelGraphicEnabled}
            onClosePanelGraphic={workspaceSidebar.onClosePanelGraphic}
            caseId={workspaceSidebar.storageCaseId}
            onNavigateToLabor={workspaceSidebar.onNavigateToLabor}
            savedDocs={workspaceSidebar.savedDocs}
            onViewSavedDoc={workspaceSidebar.onViewSavedDoc}
            onRemoveSavedDoc={workspaceSidebar.onRemoveSavedDoc}
            openDocumentLabel={workspaceSidebar.openDocumentLabel}
            onCloseDocument={workspaceSidebar.onCloseDocument}
            onAddAnforderung={workspaceSidebar.onAddAnforderung}
            anforderungenReadOnly={workspaceSidebar.anforderungenReadOnly}
          />
        )
      }
      return (
        <CaseSidebarQuickNav
          onOpenWorkspacePage={onOpenWorkspacePage}
          onOpenTemplateFromPatient={onOpenTemplateFromPatient}
          onAddAnforderung={onAddAnforderung}
        />
      )

    default:
      return (
        <CaseSidebarQuickNav
          onOpenWorkspacePage={onOpenWorkspacePage}
          onOpenTemplateFromPatient={onOpenTemplateFromPatient}
          onAddAnforderung={onAddAnforderung}
        />
      )
  }
}
