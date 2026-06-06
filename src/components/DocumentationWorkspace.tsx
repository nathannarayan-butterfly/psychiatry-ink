import { useEffect, useState } from 'react'
import { ChevronRight, Copy, Save } from 'lucide-react'

import { useTranslation } from '../context/TranslationContext'

import type { DictationPhase } from '../types/dictation'

import type {
  AiModelTier,
  DocumentChecklistItem,
  DocumentSection,
  DocumentVariantMode,
} from '../types'
import type { AiToolKey } from '../data/aiTools'
import type { ResolvedAiContext } from '../types/aiManager'

import { AiToolRail } from './AiToolRail'
import { AiToolsPanel } from './AiToolsPanel'
import { ChecklistPanel } from './ChecklistPanel'
import { SectionHintPanel } from './SectionHintPanel'

import { IconButton } from './IconButton'
import { PanelSeamToggle } from './PanelSeamToggle'

import { SectionRail } from './SectionRail'

import { WorkspaceEditorOverlay } from './WorkspaceEditorOverlay'

interface ComponentVariantOption {
  id: string
  label: string
}

interface DocumentationWorkspaceProps {
  documentTypeLabel?: string

  componentVariants?: ComponentVariantOption[]

  activeVariantId?: string

  onVariantSelect?: (variantId: string) => void

  showSectionRail: boolean

  sections: DocumentSection[]

  activeSectionId: string | null

  editorContent: string

  aiToolsExpanded: boolean

  aiContext: ResolvedAiContext

  aiAutoMode: boolean

  aiModelTier: AiModelTier

  selectedAiTool: AiToolKey | null

  dictationPhase: DictationPhase

  dictationDurationMs: number

  dictationPlaybackMs: number

  isPlayingBack: boolean

  isDictationActive: boolean

  isGenerating: boolean

  generationScope: 'segment' | 'document'

  documentEditorContent: string

  documentScopeFilledSectionCount: number

  onSectionSelect: (sectionId: string) => void

  onEditorChange: (value: string) => void

  onEditorPaste?: () => void

  onSaveSection: () => void

  onGoToNextSection: () => void

  onToggleAiAuto: () => void

  onSelectAiModelTier: (tier: AiModelTier) => void

  onSelectAiTool: (key: AiToolKey) => void

  onExpandAiTools: () => void

  onCollapseAiTools: () => void

  onCopy: () => void

  onCopyAllSections: () => void

  documentMode?: DocumentVariantMode

  activeChecklistItems?: DocumentChecklistItem[]

  activeChecklistSelections?: Record<string, boolean>

  showNormalBefundButton?: boolean

  onToggleChecklistItem?: (itemId: string, checked: boolean) => void

  onInsertNormalBefund?: () => void

  onApplySectionExample?: () => void

  onMockAction: (action: string) => void
}

export function DocumentationWorkspace({
  documentTypeLabel,
  componentVariants,
  activeVariantId,
  onVariantSelect,
  showSectionRail,
  sections,
  activeSectionId,
  editorContent,
  aiToolsExpanded,
  aiContext,
  aiAutoMode,
  aiModelTier,
  selectedAiTool,
  dictationPhase,
  dictationDurationMs,
  dictationPlaybackMs,
  isPlayingBack,
  isDictationActive,
  isGenerating,
  generationScope,
  documentEditorContent,
  documentScopeFilledSectionCount,
  onSectionSelect,
  onEditorChange,
  onEditorPaste,
  onSaveSection,
  onGoToNextSection,
  onToggleAiAuto,
  onSelectAiModelTier,
  onSelectAiTool,
  onExpandAiTools,
  onCollapseAiTools,
  onCopy,
  onCopyAllSections,
  documentMode,
  activeChecklistItems = [],
  activeChecklistSelections = {},
  showNormalBefundButton = false,
  onToggleChecklistItem,
  onInsertNormalBefund,
  onApplySectionExample,
  onMockAction,
}: DocumentationWorkspaceProps) {
  const { t } = useTranslation()
  const [sectionRailVisible, setSectionRailVisible] = useState(true)
  const activeSection = sections.find((section) => section.id === activeSectionId)
  const activeSectionIndex = sections.findIndex((section) => section.id === activeSectionId)
  const hasNextSection =
    activeSectionIndex >= 0 && activeSectionIndex < sections.length - 1
  const resolvedDocumentLabel = documentTypeLabel ?? t('documentFallback')
  const showVariantToggle =
    Boolean(componentVariants && componentVariants.length > 1 && activeVariantId && onVariantSelect)
  const showChecklistPanel =
    documentMode === 'checklist' && activeChecklistItems.length > 0 && onToggleChecklistItem
  const showRailPanel = showSectionRail && sectionRailVisible
  const isDocumentScope = showSectionRail && generationScope === 'document'
  const displayEditorContent = isDocumentScope ? documentEditorContent : editorContent

  const editorLocked = isDictationActive || isGenerating
  const aiControlsLocked =
    isGenerating ||
    dictationPhase === 'recording' ||
    dictationPhase === 'transcribing'

  useEffect(() => {
    setSectionRailVisible(true)
  }, [showSectionRail, documentTypeLabel])

  return (
    <div className="documentation-workspace flex h-full min-h-0 w-full flex-1 flex-col">
      <div
        className={`workspace-card workspace-card--with-ai-rail relative flex min-h-0 min-w-0 flex-1 flex-col rounded-md ${
          showRailPanel && aiToolsExpanded ? 'workspace-card--dual-sidebars' : ''
        }`}
      >
        <header className="workspace-header shrink-0">
          <div className="workspace-header__title flex min-w-0 items-center gap-2 px-3 sm:px-5">
            <h2 className="min-w-0 flex-1 truncate text-xs font-medium text-ink sm:text-sm">
              {resolvedDocumentLabel}
            </h2>

            {!showSectionRail ? (
              <IconButton
                bordered
                icon={<Copy strokeWidth={1.5} />}
                label={t('copy')}
                onClick={onCopy}
                className="h-7 w-7 shrink-0"
              />
            ) : null}
          </div>

          <div className="workspace-header__sub flex min-h-[1.75rem] items-center gap-2 px-3 sm:px-5">
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
              {showVariantToggle ? (
                <div
                  className="workspace-header__segment shrink-0"
                  role="group"
                  aria-label={t('componentVariant')}
                >
                  {componentVariants?.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => onVariantSelect?.(variant.id)}
                      aria-pressed={variant.id === activeVariantId}
                      className={`workspace-header__segment-btn ${
                        variant.id === activeVariantId
                          ? 'workspace-header__segment-btn--active'
                          : ''
                      }`}
                    >
                      {variant.label}
                    </button>
                  ))}
                </div>
              ) : showSectionRail && activeSection ? (
                <p className="workspace-header__subtext min-w-0 truncate">
                  <span className="text-muted">
                    {t('workspaceSectionProgress')
                      .replace('{current}', String(activeSectionIndex + 1))
                      .replace('{total}', String(sections.length))}
                  </span>
                  <span className="mx-1.5 text-border">·</span>
                  <span className="text-ink/80">{activeSection.label}</span>
                  {documentMode === 'checklist' ? (
                    <>
                      <span className="mx-1.5 text-border">·</span>
                      <span className="text-muted">{t('workspaceModeChecklist')}</span>
                    </>
                  ) : null}
                </p>
              ) : (
                <p className="workspace-header__subtext">{t('workspaceModeFreeText')}</p>
              )}
            </div>

            {showNormalBefundButton && onInsertNormalBefund ? (
              <button
                type="button"
                onClick={onInsertNormalBefund}
                disabled={editorLocked}
                className="workspace-header__action shrink-0 rounded-sm border border-border/70 bg-surface px-2 py-0.5 text-[10px] font-medium text-ink transition-colors hover:border-border hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50 sm:text-xs"
              >
                {t('insertNormalBefund')}
              </button>
            ) : null}
          </div>
        </header>

        <div className="workspace-body flex min-h-0 min-w-0 flex-1">
          {showRailPanel ? (
            <div className="workspace-panel-anchor workspace-panel-anchor--left relative shrink-0">
              <SectionRail
                sections={sections}
                activeSectionId={activeSectionId}
                onSelect={onSectionSelect}
                onCopyAll={onCopyAllSections}
                onPrint={() => onMockAction(t('print'))}
                onExport={() => onMockAction(t('export'))}
              />
              <PanelSeamToggle
                side="left"
                direction="collapse"
                label={t('hideSectionRail')}
                onClick={() => setSectionRailVisible(false)}
              />
            </div>
          ) : null}

          <div className="workspace-main relative flex min-h-0 min-w-0 flex-1 flex-col">
            {showSectionRail && !sectionRailVisible ? (
              <PanelSeamToggle
                side="left"
                direction="expand"
                label={t('showSectionRail')}
                onClick={() => setSectionRailVisible(true)}
                onMainEdge
              />
            ) : null}
            {showSectionRail && activeSection ? (
              <div className="workspace-section-header flex shrink-0 items-center justify-between gap-2 px-3 py-2 sm:px-5">
                <div className="workspace-section-label flex min-w-0 flex-1 items-center gap-1.5">
                  <p className="min-w-0 truncate text-xs text-muted">
                    {isDocumentScope ? (
                      <>
                        <span className="text-ink">{t('documentScopeOverview')}</span>
                        <span className="mx-1.5 text-border">·</span>
                        <span>
                          {t('documentScopeSegmentCount')
                            .replace('{filled}', String(documentScopeFilledSectionCount))
                            .replace('{total}', String(sections.length))}
                        </span>
                      </>
                    ) : (
                      <>
                        {t('sectionPrefix')}{' '}
                        <span className="text-ink">{activeSection.label}</span>
                      </>
                    )}
                    <span
                      className={`generation-scope-badge ml-1.5 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${
                        generationScope === 'document'
                          ? 'border-border-strong bg-surface text-ink'
                          : 'border-border/60 bg-surface text-muted'
                      }`}
                      title={
                        generationScope === 'document'
                          ? t('generationScopeDocumentHint')
                          : t('generationScopeSegmentHint')
                      }
                    >
                      {generationScope === 'document'
                        ? t('generationScopeDocument')
                        : t('generationScopeSegment')}
                    </span>
                  </p>
                </div>

                <p
                  className="hidden min-w-0 max-w-[36%] truncate text-xs font-medium text-ink max-[39.999rem]:block"
                  title={isDocumentScope ? t('documentScopeOverview') : activeSection.label}
                >
                  {isDocumentScope ? t('generationScopeDocument') : activeSection.label}
                </p>

                <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
                  {isDocumentScope ? (
                    <IconButton
                      bordered
                      icon={<Copy strokeWidth={1.5} />}
                      label={t('copyAllSections')}
                      onClick={onCopyAllSections}
                    />
                  ) : (
                    <>
                      <IconButton
                        bordered
                        icon={<ChevronRight strokeWidth={1.5} />}
                        label={t('nextSection')}
                        onClick={onGoToNextSection}
                        disabled={!hasNextSection || editorLocked}
                        className="h-7 w-7 sm:h-8 sm:w-8"
                      />

                      <IconButton
                        bordered
                        icon={<Save strokeWidth={1.5} />}
                        label={t('saveSection')}
                        onClick={onSaveSection}
                      />

                      <IconButton
                        bordered
                        icon={<Copy strokeWidth={1.5} />}
                        label={t('copySegment')}
                        onClick={onCopy}
                      />
                    </>
                  )}
                </div>
              </div>
            ) : null}

            {isDocumentScope ? (
              <p className="document-scope-hint workspace-float-block mx-3 mb-2 shrink-0 px-3 py-2 text-[11px] leading-snug text-ink sm:mx-5 sm:px-4 sm:text-xs">
                {t('documentScopeEditorHint')}
              </p>
            ) : null}

            {showSectionRail &&
            activeSection &&
            !isDocumentScope &&
            (activeSection.description || activeSection.exampleHint) ? (
              <SectionHintPanel
                description={activeSection.description}
                exampleHint={activeSection.exampleHint}
                disabled={editorLocked}
                onApplyExample={onApplySectionExample}
              />
            ) : null}

            <div className="workspace-editor relative flex min-h-0 flex-1 flex-col">
              {showChecklistPanel ? (
                <ChecklistPanel
                  items={activeChecklistItems}
                  selections={activeChecklistSelections}
                  disabled={editorLocked}
                  onToggle={onToggleChecklistItem}
                />
              ) : null}

              <textarea
                className={`workspace-textarea ${isDocumentScope ? 'workspace-textarea--document-scope' : ''}`}
                value={displayEditorContent}
                onChange={(event) => onEditorChange(event.target.value)}
                onPaste={() => onEditorPaste?.()}
                placeholder={
                  isDocumentScope
                    ? t('documentScopeEditorPlaceholder')
                    : t('editorPlaceholder')
                }
                spellCheck={!isDocumentScope}
                readOnly={editorLocked || isDocumentScope}
              />

              <WorkspaceEditorOverlay
                dictationPhase={dictationPhase}
                durationMs={dictationDurationMs}
                playbackMs={dictationPlaybackMs}
                isPlayingBack={isPlayingBack}
                isGenerating={isGenerating}
              />
            </div>
          </div>

          {aiToolsExpanded ? (
            <div className="workspace-panel-anchor workspace-panel-anchor--right relative shrink-0">
              <PanelSeamToggle
                side="right"
                direction="collapse"
                label={t('aiToolsCollapse')}
                onClick={onCollapseAiTools}
              />
              <AiToolsPanel
                aiAutoMode={aiAutoMode}
                aiModelTier={aiModelTier}
                toolStates={aiContext.tools}
                selectedToolKey={selectedAiTool}
                disabled={aiControlsLocked}
                onToggleAuto={onToggleAiAuto}
                onSelectModelTier={onSelectAiModelTier}
                onToolAction={onSelectAiTool}
              />
            </div>
          ) : (
            <div className="workspace-panel-anchor workspace-panel-anchor--right relative shrink-0">
              <PanelSeamToggle
                side="right"
                direction="expand"
                label={t('aiToolsExpand')}
                onClick={onExpandAiTools}
              />
              <AiToolRail
                aiAutoMode={aiAutoMode}
                aiModelTier={aiModelTier}
                toolStates={aiContext.tools}
                selectedToolKey={selectedAiTool}
                disabled={aiControlsLocked}
                onToggleAuto={onToggleAiAuto}
                onSelectModelTier={onSelectAiModelTier}
                onToolAction={onSelectAiTool}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
