import { useState, useEffect } from 'react'
import type { LucideIcon } from 'lucide-react'
import { FileText, Wrench } from 'lucide-react'
import { useTranslation } from '../context/TranslationContext'
import type { DocumentType } from '../types'
import type { UtilityToolId } from '../types/timeline'
import { DocumentToolCarousel } from './DocumentToolCarousel'
import { PanelDateCard } from './PanelDateCard'
import { PanelGraphic } from './PanelGraphic'
import { ToolBox } from './ToolBox'

type BottomPanelMode = 'documentation' | 'tools'

interface BottomToolPanelProps {
  documentTypes: DocumentType[]
  selectedDocumentType: string
  onSelect: (typeId: string) => void
  activeUtilityTool: UtilityToolId | null
  onSelectUtilityTool: (tool: UtilityToolId | null) => void
  showPanelGraphic?: boolean
  onClosePanelGraphic?: () => void
}

function PanelRailButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className="panel-rail-btn flex min-h-0 flex-1 items-center justify-center rounded-md border border-border/50 bg-editor-surface transition-colors"
    >
      <Icon
        className={`h-5 w-5 ${active ? 'text-accent' : 'text-ink'}`}
        strokeWidth={1.5}
        aria-hidden
      />
    </button>
  )
}

export function BottomToolPanel({
  documentTypes,
  selectedDocumentType,
  onSelect,
  activeUtilityTool,
  onSelectUtilityTool,
  showPanelGraphic = false,
  onClosePanelGraphic,
}: BottomToolPanelProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<BottomPanelMode>('documentation')

  useEffect(() => {
    if (activeUtilityTool) setMode('tools')
  }, [activeUtilityTool])

  const handleDocumentationSelect = (typeId: string) => {
    onSelectUtilityTool(null)
    onSelect(typeId)
  }

  const handleTimelineSelect = () => {
    onSelectUtilityTool(activeUtilityTool === 'timeline' ? null : 'timeline')
  }

  const handleLabSelect = () => {
    onSelectUtilityTool(activeUtilityTool === 'lab' ? null : 'lab')
  }

  return (
    <section className="bottom-tool-panel w-full min-w-0 overflow-visible">
      <div className="bottom-panel-shell flex min-h-[var(--bottom-panel-min-height)] min-w-0 gap-2 p-0.5 sm:min-h-[var(--bottom-panel-min-height-sm)] sm:gap-2">
        <nav
          className="workspace-float-block flex w-11 shrink-0 flex-col gap-1 p-1 sm:w-12"
          aria-label={t('bottomPanelNav')}
        >
          <PanelRailButton
            icon={FileText}
            label={t('documentationPanel')}
            active={mode === 'documentation'}
            onClick={() => setMode('documentation')}
          />
          <PanelRailButton
            icon={Wrench}
            label={t('toolsPanel')}
            active={mode === 'tools'}
            onClick={() => setMode('tools')}
          />
        </nav>

        <div
          className={`bottom-panel__content workspace-float-block flex min-w-0 items-stretch p-1 sm:p-1.5 ${
            showPanelGraphic ? 'bottom-panel__content--with-graphic' : ''
          }`}
        >
          {mode === 'documentation' ? (
            <DocumentToolCarousel
              documentTypes={documentTypes}
              selectedDocumentType={selectedDocumentType}
              onSelect={handleDocumentationSelect}
            />
          ) : (
            <div className="grid h-full min-h-0 w-full flex-1 grid-cols-2 grid-rows-2 gap-1 p-0 sm:gap-1.5">
              <ToolBox
                id="timeline"
                label={t('timelineCreator')}
                icon="git-branch"
                isActive={activeUtilityTool === 'timeline'}
                onClick={handleTimelineSelect}
              />
              <ToolBox
                id="lab"
                label={t('labVisualisation')}
                icon="flask"
                isActive={activeUtilityTool === 'lab'}
                onClick={handleLabSelect}
              />
            </div>
          )}
        </div>

        {mode === 'documentation' ? <PanelDateCard /> : null}

        {showPanelGraphic ? (
          <div className="bottom-panel__graphic workspace-float-block flex min-w-0 items-stretch overflow-hidden p-1">
            <PanelGraphic onClose={() => onClosePanelGraphic?.()} />
          </div>
        ) : null}
      </div>
    </section>
  )
}
