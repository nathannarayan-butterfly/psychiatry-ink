import {
  ArrowLeft,
  Bold,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Highlighter,
  MessageSquarePlus,
  Pencil,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  Underline,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { KbCategory, KnowledgeEntry, KnowledgeEntrySection } from '../../data/knowledgeBaseSeedData'
import { KB_PRESET_CATEGORIES, kbCustomCategories } from '../../data/kbCategories'
import { useTranslation } from '../../context/TranslationContext'
import { useKnowledgeBaseAnnotations } from '../../hooks/useKnowledgeBaseAnnotations'
import { useKnowledgeBaseClinical } from '../../hooks/useKnowledgeBaseClinical'
import { useKnowledgeBasePermissions } from '../../hooks/useKnowledgeBasePermissions'
import { useKnowledgeBaseAiTier } from '../../hooks/useKnowledgeBaseAiTier'
import { isEnglishKbLanguage, pickKbLocalizedList, pickKbLocalizedText } from '../../types/knowledgeBase'
import {
  HIGHLIGHT_COLORS,
  type HighlightColor,
  type HighlightStyle,
} from '../../types/knowledgeBaseAnnotations'
import { formatSiteLocaleDate } from '../../utils/siteTimezone'
import {
  createEmptyKnowledgeEntrySection,
  entrySectionNavLabel,
  ensureKnowledgeEntrySections,
  localizedSectionContent,
  localizedSectionLabel,
} from '../../utils/kb/knowledgeEntrySections'
import { KbSectionNav, kbSectionDomId, type KbNavItem } from '../medication/kb/KbSectionNav'
import { showNotionToast } from '../notion/NotionToast'
import { HighlightedText, getTextSelectionOffsets } from './KnowledgeBaseHighlightedText'
import { KnowledgeBaseNotes } from './KnowledgeBaseNotes'
import {
  KnowledgeBaseReadingPanel,
  type ReadingPanelRequest,
} from './KnowledgeBaseReadingPanel'
import { KbClinicalBrowse } from './KbClinicalBrowse'

type KnowledgeBaseMode = 'reading' | 'editing'

function entrySnapshotsEqual(a: KnowledgeEntry, b: KnowledgeEntry): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function buildExportMarkdown(entry: KnowledgeEntry, language: string): string {
  const title = pickKbLocalizedText(entry.title, entry.titleEn, language) || entry.title
  const category = pickKbLocalizedText(entry.category, entry.categoryEn, language) || entry.category
  const tags = pickKbLocalizedList(entry.tags, entry.tagsEn, language)
  const sections = [...(entry.sections ?? [])].sort((a, b) => a.order - b.order)
  const body = sections
    .map((section) => {
      const label = localizedSectionLabel(section, language)
      const content = localizedSectionContent(section, language)
      if (!content.trim()) return ''
      return label.trim() ? `## ${label}\n\n${content}` : content
    })
    .filter(Boolean)
    .join('\n\n')
  return [`# ${title}`, `**${category}**`, tags.length ? `Tags: ${tags.join(', ')}` : '', body]
    .filter(Boolean)
    .join('\n\n')
}

function FinalizeConfirmDialog({
  onConfirm,
  onDiscard,
  onCancel,
}: {
  onConfirm: () => void
  onDiscard: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  return createPortal(
    <div className="kbp-overlay" role="dialog" aria-modal>
      <div className="kbp-dialog kbp-dialog--sm">
        <h2 className="kbp-dialog__title">{t('kbFinalizeTitle')}</h2>
        <p className="kbp-dialog__delete-text">{t('kbFinalizeMessage')}</p>
        <div className="kbp-dialog__actions">
          <button type="button" className="kbp-btn kbp-btn--primary" onClick={onConfirm}>
            {t('kbFinalizeYes')}
          </button>
          <button type="button" className="kbp-btn" onClick={onDiscard}>
            {t('kbFinalizeNo')}
          </button>
          <button type="button" className="kbp-btn" onClick={onCancel}>
            {t('kbPharmaCancel')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function DeleteConfirmDialog({
  title,
  onConfirm,
  onCancel,
}: {
  title: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  return createPortal(
    <div className="kbp-overlay" role="dialog" aria-modal>
      <div className="kbp-dialog kbp-dialog--sm">
        <p className="kbp-dialog__delete-text">
          {t('kbDeleteEntryConfirm')}
          <br />
          <strong>{title}</strong>
        </p>
        <div className="kbp-dialog__actions">
          <button type="button" className="kbp-btn kbp-btn--danger" onClick={onConfirm}>
            {t('kbDeleteEntry')}
          </button>
          <button type="button" className="kbp-btn" onClick={onCancel}>
            {t('kbPharmaCancel')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

interface ClinicalSectionItemProps {
  section: KnowledgeEntrySection
  language: string
  mode: KnowledgeBaseMode
  isActive: boolean
  isFirst: boolean
  isLast: boolean
  isCollapsed: boolean
  highlights: ReturnType<ReturnType<typeof useKnowledgeBaseAnnotations>['forSection']>['highlights']
  onActivate: () => void
  onToggleCollapse: () => void
  onContentChange: (content: string) => void
  onLabelChange: (label: string) => void
  onLabelEnChange: (labelEn: string) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
  onAddAnnotation: (
    sectionId: string,
    startOffset: number,
    endOffset: number,
    text: string,
    style: HighlightStyle,
    color?: HighlightColor,
  ) => void
  onRemoveHighlight: (highlightId: string) => void
  onCommentSelection: (text: string) => void
  onAskAiSelection: (text: string) => void
}

function ClinicalSectionItem({
  section,
  language,
  mode,
  isActive,
  isFirst,
  isLast,
  isCollapsed,
  highlights,
  onActivate,
  onToggleCollapse,
  onContentChange,
  onLabelChange,
  onLabelEnChange,
  onMoveUp,
  onMoveDown,
  onDelete,
  onAddAnnotation,
  onRemoveHighlight,
  onCommentSelection,
  onAskAiSelection,
}: ClinicalSectionItemProps) {
  const { t } = useTranslation()
  const editMode = mode === 'editing'
  const editEnglish = isEnglishKbLanguage(language)
  const readingContent = localizedSectionContent(section, language)
  const localizedLabel = localizedSectionLabel(section, language)
  const [labelDraft, setLabelDraft] = useState(
    () => (editEnglish ? (section.labelEn ?? section.label) : section.label),
  )

  useEffect(() => {
    setLabelDraft(editEnglish ? (section.labelEn ?? section.label) : section.label)
  }, [section.id, section.label, section.labelEn, editEnglish])
  const [selectionToolbar, setSelectionToolbar] = useState<{ top: number; left: number } | null>(null)
  const [pendingSelection, setPendingSelection] = useState<{ startOffset: number; endOffset: number; text: string } | null>(null)
  const [showHighlightColors, setShowHighlightColors] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)

  const closeSelectionToolbar = useCallback(() => {
    setSelectionToolbar(null)
    setPendingSelection(null)
    setShowHighlightColors(false)
  }, [])

  useEffect(() => {
    if (!selectionToolbar) return
    const handlePointerDown = (e: MouseEvent) => {
      if (toolbarRef.current?.contains(e.target as Node)) return
      closeSelectionToolbar()
    }
    const handleSelectionChange = () => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed) closeSelectionToolbar()
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('selectionchange', handleSelectionChange)
    }
  }, [selectionToolbar, closeSelectionToolbar])

  const handleReadingHeaderClick = () => {
    onActivate()
    onToggleCollapse()
  }

  const handleContentMouseUp = () => {
    if (editMode || !contentRef.current) return
    requestAnimationFrame(() => {
      const container = contentRef.current
      if (!container) return
      const offsets = getTextSelectionOffsets(container, readingContent)
      if (!offsets) {
        closeSelectionToolbar()
        return
      }
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) return
      const rect = sel.getRangeAt(0).getBoundingClientRect()
      onActivate()
      setPendingSelection(offsets)
      const TOOLBAR_GAP = 44
      const topCandidate = rect.top - TOOLBAR_GAP
      const top = topCandidate < 8 ? rect.bottom + 8 : topCandidate
      const left = Math.min(Math.max(rect.left + rect.width / 2, 80), window.innerWidth - 80)
      setSelectionToolbar({ top, left })
    })
  }

  const handleAnnotate = (style: HighlightStyle, color?: HighlightColor) => {
    if (!pendingSelection) return
    onAddAnnotation(
      section.id,
      pendingSelection.startOffset,
      pendingSelection.endOffset,
      pendingSelection.text,
      style,
      color,
    )
    closeSelectionToolbar()
    window.getSelection()?.removeAllRanges()
  }

  return (
    <div
      id={kbSectionDomId(section.id)}
      className={`kbp-section${isActive && !editMode ? ' kbp-section--active' : ''}`}
    >
      <div
        className="kbp-section__header"
        role={editMode ? undefined : 'button'}
        tabIndex={editMode ? undefined : 0}
        onClick={editMode ? undefined : handleReadingHeaderClick}
        onKeyDown={editMode ? undefined : (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleReadingHeaderClick()
          }
        }}
      >
        {editMode ? (
          <div className="kbp-section__header-edit">
            <div className="kbp-section__reorder-btns">
              <button type="button" className="kbp-icon-btn kbp-icon-btn--xs" onClick={onMoveUp} disabled={isFirst} aria-label="Nach oben">
                <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
              <button type="button" className="kbp-icon-btn kbp-icon-btn--xs" onClick={onMoveDown} disabled={isLast} aria-label="Nach unten">
                <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
            <input
              className="kbp-section__label-input"
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              onBlur={() => {
                const trimmed = labelDraft.trim()
                if (!trimmed) return
                if (editEnglish) onLabelEnChange(trimmed)
                else onLabelChange(trimmed)
              }}
              placeholder={t('kbPharmaSectionLabelPlaceholder')}
            />
            <button type="button" className="kbp-icon-btn kbp-icon-btn--xs kbp-icon-btn--danger" onClick={onDelete} title={t('kbPharmaSectionDelete')}>
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>
        ) : (
          <div className="kbp-section__header-view">
            <span className="kbp-section__title-wrap">
              <span className="kbp-section__label">
                <span className="kbp-section__title">{localizedLabel}</span>
              </span>
            </span>
            <ChevronDown
              className={`kbp-section__chevron h-3.5 w-3.5${isCollapsed ? '' : ' kbp-section__chevron--open'}`}
              strokeWidth={1.75}
              aria-hidden
            />
          </div>
        )}
      </div>

      {(!isCollapsed || editMode) && (
        <div className="kbp-section__body">
          {editMode ? (
            <textarea
              className="kbp-section__textarea"
              value={section.content}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder={t('kbFieldContentPlaceholder')}
              rows={6}
            />
          ) : (
            <div ref={contentRef} className="kbp-section__reading-content" onMouseUp={handleContentMouseUp}>
              {readingContent.trim() ? (
                <HighlightedText content={readingContent} highlights={highlights} onRemoveHighlight={onRemoveHighlight} />
              ) : (
                <p className="kbp-section__text kbp-section__text--empty">{t('kbPharmaSectionEmpty')}</p>
              )}
              {selectionToolbar
                ? createPortal(
                    <div
                      ref={toolbarRef}
                      className="kbp-selection-toolbar"
                      style={{ top: selectionToolbar.top, left: selectionToolbar.left }}
                      onMouseDown={(e) => e.preventDefault()}
                      role="toolbar"
                      aria-label={t('kbReadingSelectionToolbar')}
                    >
                      <button type="button" className="kbp-selection-toolbar__btn" onClick={() => { onCommentSelection(pendingSelection?.text ?? ''); closeSelectionToolbar() }} title={t('kbReadingComment')}>
                        <MessageSquarePlus className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                      <span className="kbp-selection-toolbar__hl">
                        <button type="button" className="kbp-selection-toolbar__btn" onClick={() => setShowHighlightColors((o) => !o)} title={t('kbReadingHighlight')}>
                          <Highlighter className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </button>
                        {showHighlightColors ? (
                          <span className="kbp-swatches" role="group">
                            {HIGHLIGHT_COLORS.map((color) => (
                              <button key={color} type="button" className={`kbp-swatch kbp-swatch--${color}`} onClick={() => handleAnnotate('highlight', color)} />
                            ))}
                          </span>
                        ) : null}
                      </span>
                      <button type="button" className="kbp-selection-toolbar__btn" onClick={() => handleAnnotate('underline')} title={t('kbReadingUnderline')}>
                        <Underline className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                      <button type="button" className="kbp-selection-toolbar__btn" onClick={() => handleAnnotate('bold')} title={t('kbReadingBold')}>
                        <Bold className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        className="kbp-selection-toolbar__btn kbp-selection-toolbar__btn--ai"
                        onClick={() => { onAskAiSelection(pendingSelection?.text ?? ''); closeSelectionToolbar() }}
                        title={t('kbReadingAskAiAction')}
                      >
                        <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    </div>,
                    document.body,
                  )
                : null}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface ClinicalEntryDetailViewProps {
  entry: KnowledgeEntry
  language: string
  onBack: () => void
  onUpdate: (entry: KnowledgeEntry) => void
  onDuplicate: () => void
  onDelete: () => void
}

function ClinicalEntryDetailView({
  entry,
  language,
  onBack,
  onUpdate,
  onDuplicate,
  onDelete,
}: ClinicalEntryDetailViewProps) {
  const { t } = useTranslation()
  const permissions = useKnowledgeBasePermissions()
  const annotations = useKnowledgeBaseAnnotations(entry.id)
  const [aiTier] = useKnowledgeBaseAiTier()
  const [mode, setMode] = useState<KnowledgeBaseMode>('reading')
  const [draft, setDraft] = useState(() => ensureKnowledgeEntrySections(entry))
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false)
  const [finalizeAction, setFinalizeAction] = useState<'save' | 'exit'>('save')
  const [panelCollapsed, setPanelCollapsed] = useState(true)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => new Set())
  const [panelRequest, setPanelRequest] = useState<ReadingPanelRequest | null>(null)

  const sortedSections = useMemo(
    () => [...(mode === 'editing' ? draft.sections ?? [] : ensureKnowledgeEntrySections(entry).sections ?? [])].sort((a, b) => a.order - b.order),
    [draft.sections, entry, mode],
  )

  const [activeSectionId, setActiveSectionId] = useState<string>(() => sortedSections[0]?.id ?? '')

  useEffect(() => {
    if (mode === 'reading') setDraft(ensureKnowledgeEntrySections(entry))
  }, [entry, mode])

  useEffect(() => {
    if (!sortedSections.some((s) => s.id === activeSectionId)) {
      setActiveSectionId(sortedSections[0]?.id ?? '')
    }
  }, [sortedSections, activeSectionId])

  const editMode = mode === 'editing'
  const isDraftDirty = editMode && !entrySnapshotsEqual(draft, ensureKnowledgeEntrySections(entry))
  const activeEntry = editMode ? draft : ensureKnowledgeEntrySections(entry)
  const displayTitle = pickKbLocalizedText(activeEntry.title, activeEntry.titleEn, language) || activeEntry.title
  const displayCategory = pickKbLocalizedText(activeEntry.category, activeEntry.categoryEn, language) || activeEntry.category
  const displayTags = pickKbLocalizedList(activeEntry.tags, activeEntry.tagsEn, language)

  const navItems: KbNavItem[] = sortedSections.map((section, index) => ({
    id: section.id,
    label: entrySectionNavLabel(section, language),
    number: String(index + 1),
    group: 'weitere' as const,
  }))

  const activeSection = sortedSections.find((s) => s.id === activeSectionId) ?? sortedSections[0] ?? null
  const panelSectionLabel = activeSection ? entrySectionNavLabel(activeSection, language) : t('kbReadingPanelTitle')
  const panelSectionData = activeSection ? localizedSectionContent(activeSection, language) : ''

  const finalizeDraft = () => {
    onUpdate(draft)
    setMode('reading')
    setShowFinalizeConfirm(false)
    showNotionToast(t('kbFinalizeSaved'))
  }

  const handleBack = () => {
    if (isDraftDirty) {
      setFinalizeAction('exit')
      setShowFinalizeConfirm(true)
      return
    }
    onBack()
  }

  const updateSection = (sectionId: string, patch: Partial<KnowledgeEntrySection>) => {
    setDraft((prev) => ({
      ...prev,
      sections: (prev.sections ?? []).map((s) => (s.id === sectionId ? { ...s, ...patch } : s)),
    }))
  }

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    setDraft((prev) => {
      const sections = [...(prev.sections ?? [])].sort((a, b) => a.order - b.order)
      const idx = sections.findIndex((s) => s.id === sectionId)
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (idx < 0 || swapIdx < 0 || swapIdx >= sections.length) return prev
      const reordered = sections.map((s, i) => {
        if (i === idx) return { ...sections[swapIdx], order: s.order }
        if (i === swapIdx) return { ...sections[idx], order: sections[swapIdx].order }
        return s
      })
      return { ...prev, sections: reordered.sort((a, b) => a.order - b.order) }
    })
  }

  const exportMarkdown = async () => {
    const md = buildExportMarkdown(activeEntry, language)
    try {
      await navigator.clipboard.writeText(md)
      showNotionToast(t('kbClinicalExportCopied'))
    } catch {
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${displayTitle.replace(/[^\w\-]+/g, '-').slice(0, 80)}.md`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div className={`kbp-detail-view${editMode ? ' kbp-detail-view--editing' : ' kbp-detail-view--reading'}`}>
      {showDeleteConfirm ? (
        <DeleteConfirmDialog title={displayTitle} onConfirm={() => { setShowDeleteConfirm(false); onDelete() }} onCancel={() => setShowDeleteConfirm(false)} />
      ) : null}
      {showFinalizeConfirm ? (
        <FinalizeConfirmDialog
          onConfirm={() => {
            finalizeDraft()
            if (finalizeAction === 'exit') onBack()
          }}
          onDiscard={() => {
            setDraft(ensureKnowledgeEntrySections(entry))
            setMode('reading')
            setShowFinalizeConfirm(false)
            if (finalizeAction === 'exit') onBack()
          }}
          onCancel={() => setShowFinalizeConfirm(false)}
        />
      ) : null}

      <div className="kbp-detail-topbar">
        <button type="button" className="kbp-back-btn" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          {t('kbClinicalBackToList')}
        </button>
        <div className="kbp-detail-topbar__actions">
          <div className="kbp-mode-toggle" role="group" aria-label={t('kbModeToggleLabel')}>
            <button type="button" className={`kbp-mode-toggle__btn${mode === 'reading' ? ' kbp-mode-toggle__btn--active' : ''}`} onClick={() => { if (isDraftDirty) { setFinalizeAction('exit'); setShowFinalizeConfirm(true) } else setMode('reading') }}>
              <BookOpen className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              {t('kbModeReading')}
            </button>
            <button type="button" className={`kbp-mode-toggle__btn${mode === 'editing' ? ' kbp-mode-toggle__btn--active' : ''}`} onClick={() => { if (!permissions.canEdit) { showNotionToast(t('kbModeEditDenied')); return }; setDraft({ ...ensureKnowledgeEntrySections(entry), sections: (entry.sections ?? ensureKnowledgeEntrySections(entry).sections ?? []).map((s) => ({ ...s })) }); setMode('editing') }} disabled={!permissions.canEdit}>
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              {t('kbModeEditing')}
            </button>
          </div>
          {!editMode ? (
            <>
              <button type="button" className="kbp-icon-btn" onClick={() => void exportMarkdown()} title={t('kbClinicalExport')}>
                <Download className="h-4 w-4" strokeWidth={1.75} />
              </button>
              <button type="button" className="kbp-icon-btn" onClick={onDuplicate} title={t('kbPharmaDuplicate')}>
                <Copy className="h-4 w-4" strokeWidth={1.75} />
              </button>
              <button type="button" className="kbp-icon-btn kbp-icon-btn--danger" onClick={() => setShowDeleteConfirm(true)} title={t('kbDeleteEntry')}>
                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </>
          ) : (
            <>
              <button type="button" className="kbp-btn kbp-btn--primary" onClick={() => { if (isDraftDirty) { setFinalizeAction('save'); setShowFinalizeConfirm(true) } else setMode('reading') }}>
                {t('kbPharmaApply')}
              </button>
              <button type="button" className="kbp-btn" onClick={() => { if (isDraftDirty) { setFinalizeAction('exit'); setShowFinalizeConfirm(true) } else setMode('reading') }}>
                {isDraftDirty ? t('kbDraftDiscard') : t('kbPharmaCancel')}
              </button>
            </>
          )}
        </div>
      </div>

      <div className={`kbp-detail-layout${editMode ? ' kbp-detail-layout--editing' : ' kbp-detail-layout--reading'}${!editMode && panelCollapsed ? ' kbp-detail-layout--panel-collapsed' : ''}`}>
        {!editMode ? (
          <KbSectionNav items={navItems} activeId={activeSectionId} onActivate={setActiveSectionId} language={language} variant="sidebar" />
        ) : null}
        <div className={`kbp-detail-main${!editMode ? ' kbp-detail-main--reading' : ''}`}>
          <div className="kbp-detail-main__content">
            <div className="kbp-drug-header">
              <div className="kbp-drug-header__identity">
                <h2 className="kbp-drug-header__name">{displayTitle}</h2>
              </div>
              <div className="kbp-drug-header__meta">
                <span className="kbp-drug-header__classification">{displayCategory}</span>
                {activeEntry.enContentSource === 'machine' ? (
                  <span className="kbp-machine-translation-badge" title={t('kbClinicalMachineTranslationHint')}>
                    {t('kbClinicalMachineTranslationBadge')}
                  </span>
                ) : null}
              </div>
              {displayTags.length > 0 ? (
                <div className="kb-entry__tags kbp-clinical-tags">
                  <Tag className="kb-entry__tags-icon h-3 w-3" aria-hidden />
                  {displayTags.map((tag) => (
                    <span key={tag} className="kb-entry__tag">{tag}</span>
                  ))}
                </div>
              ) : null}
              <p className="kbp-drug-header__updated">
                {t('kbPharmaLastUpdated')}: {formatSiteLocaleDate(activeEntry.updatedAt ?? activeEntry.createdAt, language as 'de' | 'en' | 'fr' | 'es')}
              </p>
            </div>

            <div className="kbp-sections">
              {sortedSections.map((section, index) => {
                const sectionAnnotations = annotations.forSection(section.id)
                return (
                  <ClinicalSectionItem
                    key={section.id}
                    section={section}
                    language={language}
                    mode={mode}
                    isActive={activeSectionId === section.id}
                    isFirst={index === 0}
                    isLast={index === sortedSections.length - 1}
                    isCollapsed={collapsedSections.has(section.id)}
                    highlights={sectionAnnotations.highlights}
                    onActivate={() => setActiveSectionId(section.id)}
                    onToggleCollapse={() =>
                      setCollapsedSections((prev) => {
                        const next = new Set(prev)
                        if (next.has(section.id)) next.delete(section.id)
                        else next.add(section.id)
                        return next
                      })
                    }
                    onContentChange={(content) => updateSection(section.id, { content })}
                    onLabelChange={(label) => updateSection(section.id, { label })}
                    onLabelEnChange={(labelEn) => updateSection(section.id, { labelEn: labelEn || undefined })}
                    onMoveUp={() => moveSection(section.id, 'up')}
                    onMoveDown={() => moveSection(section.id, 'down')}
                    onDelete={() =>
                      setDraft((prev) => ({
                        ...prev,
                        sections: (prev.sections ?? []).filter((s) => s.id !== section.id),
                      }))
                    }
                    onAddAnnotation={(sectionId, start, end, text, style, color) =>
                      annotations.addHighlight({
                        sectionId,
                        startOffset: start,
                        endOffset: end,
                        text,
                        style,
                        color,
                      })
                    }
                    onRemoveHighlight={annotations.removeHighlight}
                    onCommentSelection={(text) => {
                      setActiveSectionId(section.id)
                      setPanelCollapsed(false)
                      setPanelRequest({ nonce: Date.now(), tab: 'comments', commentText: `„${text}“\n` })
                    }}
                    onAskAiSelection={(text) => {
                      setActiveSectionId(section.id)
                      setPanelCollapsed(false)
                      setPanelRequest({ nonce: Date.now(), tab: 'askAi', question: text, autoSend: true })
                    }}
                  />
                )
              })}
              {editMode ? (
                <button
                  type="button"
                  className="kbp-add-section-btn"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      sections: [
                        ...(prev.sections ?? []),
                        createEmptyKnowledgeEntrySection(prev.id, (prev.sections ?? []).length, language),
                      ],
                    }))
                  }
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                  {t('kbPharmaAddSection')}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {!editMode ? (
          <div className="kbp-right-rail">
            {!panelCollapsed ? (
              <div className="kbp-reading-column">
                <KnowledgeBaseReadingPanel
                  medicationId={entry.id}
                  medicationName={displayTitle}
                  sectionId={activeSection?.id ?? entry.id}
                  sectionLabel={panelSectionLabel}
                  sectionData={panelSectionData}
                  language={language}
                  collapsed={false}
                  onToggleCollapse={() => setPanelCollapsed((prev) => !prev)}
                  request={panelRequest}
                  tier={aiTier}
                />
                <KnowledgeBaseNotes medicationId={entry.id} language={language} />
              </div>
            ) : null}
            {panelCollapsed ? (
              <KnowledgeBaseReadingPanel
                medicationId={entry.id}
                medicationName={displayTitle}
                sectionId={activeSection?.id ?? entry.id}
                sectionLabel={panelSectionLabel}
                sectionData={panelSectionData}
                language={language}
                collapsed
                onToggleCollapse={() => setPanelCollapsed((prev) => !prev)}
                request={panelRequest}
                tier={aiTier}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function AddClinicalEntryDialog({
  existingCategories,
  onSave,
  onCancel,
}: {
  existingCategories: string[]
  onSave: (entry: Omit<KnowledgeEntry, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<KbCategory>('Klinik')
  const [customCategory, setCustomCategory] = useState('')
  const [useCustomCategory, setUseCustomCategory] = useState(false)
  const [content, setContent] = useState('')
  const [tagsInput, setTagsInput] = useState('')

  const selectableCategories = useMemo(
    () => [...KB_PRESET_CATEGORIES, ...existingCategories],
    [existingCategories],
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const tags = tagsInput.split(',').map((s) => s.trim()).filter(Boolean)
    const finalCategory = useCustomCategory
      ? ((customCategory.trim() || 'Sonstiges') as KbCategory)
      : category
    onSave({
      title: title.trim(),
      category: finalCategory,
      content: content.trim(),
      tags,
      sections: [],
    })
  }

  const customInvalid = useCustomCategory && !customCategory.trim()

  return (
    <div className="kb-dialog-overlay" role="dialog" aria-modal onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="kb-dialog">
        <div className="kb-dialog__header">
          <h2 className="kb-dialog__title">{t('kbAddEntry')}</h2>
          <button type="button" className="kb-dialog__close" onClick={onCancel}><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="kb-dialog__form">
          <div className="kb-dialog__field">
            <label className="kb-dialog__label">{t('kbFieldTitle')}</label>
            <input className="kb-dialog__input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="kb-dialog__field">
            <label className="kb-dialog__label">{t('kbFieldCategory')}</label>
            <div className="kb-dialog__category-row">
              <select
                className="kb-dialog__select"
                value={useCustomCategory ? '__custom__' : category}
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    setUseCustomCategory(true)
                  } else {
                    setUseCustomCategory(false)
                    setCategory(e.target.value as KbCategory)
                  }
                }}
              >
                {selectableCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="__custom__">{t('kbCategoryCustom')}</option>
              </select>
              {useCustomCategory ? (
                <input
                  type="text"
                  className="kb-dialog__input"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder={t('kbCategoryCustomPlaceholder')}
                  aria-label={t('kbCategoryCustomPlaceholder')}
                  autoFocus
                />
              ) : null}
            </div>
          </div>
          <div className="kb-dialog__field kb-dialog__field--grow">
            <label className="kb-dialog__label">{t('kbFieldContent')}</label>
            <textarea className="kb-dialog__textarea" value={content} onChange={(e) => setContent(e.target.value)} required />
          </div>
          <div className="kb-dialog__field">
            <label className="kb-dialog__label">{t('kbFieldTags')}</label>
            <input className="kb-dialog__input" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />
          </div>
          <div className="kb-dialog__actions">
            <button type="button" className="new-patient-dialog__btn new-patient-dialog__btn--cancel" onClick={onCancel}>{t('newPatientAbbrechen')}</button>
            <button type="submit" className="new-patient-dialog__btn new-patient-dialog__btn--create" disabled={!title.trim() || !content.trim() || customInvalid}>{t('kbSaveEntry')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export interface KnowledgeBaseClinicalProps {
  collectionId?: string
  collectionName?: string
  onClose: () => void
  onCloseAll?: () => void
}

export function KnowledgeBaseClinical({ collectionId, collectionName, onClose, onCloseAll }: KnowledgeBaseClinicalProps) {
  const { t, language } = useTranslation()
  const { entries, addEntry, updateEntry, deleteEntry, duplicateEntry } = useKnowledgeBaseClinical(collectionId)
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)

  const selectedEntry = selectedEntryId ? entries.find((e) => e.id === selectedEntryId) ?? null : null

  const handleDuplicate = useCallback(() => {
    if (!selectedEntryId) return
    const copy = duplicateEntry(selectedEntryId)
    if (copy) setSelectedEntryId(copy.id)
  }, [duplicateEntry, selectedEntryId])

  const handleDelete = useCallback(() => {
    if (!selectedEntryId) return
    deleteEntry(selectedEntryId)
    setSelectedEntryId(null)
  }, [deleteEntry, selectedEntryId])

  return (
    <div className="kbp-page text-ink">
      <div className="kbp-topbar">
        <button type="button" className="kbp-back-btn" onClick={selectedEntry ? () => setSelectedEntryId(null) : onClose} aria-label={t('kbPharmaBackToKb')}>
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          {selectedEntry ? t('kbClinicalBackToList') : t('kbPharmaBackToKb')}
        </button>
        <div className="kbp-topbar__left">
          <h1 className="kbp-topbar__title">{collectionName ?? t('kbClinicalTitle')}</h1>
          <span className="kbp-topbar__subtitle">{t('kbClinicalSubtitle')}</span>
        </div>
        <button type="button" className="kbp-icon-btn" onClick={onCloseAll ?? onClose} aria-label={t('kbPharmaClose')}>
          <X className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </div>

      <div className={`kbp-content${selectedEntry ? ' kbp-content--detail' : ''}`}>
        {selectedEntry ? (
          <ClinicalEntryDetailView
            entry={selectedEntry}
            language={language}
            onBack={() => setSelectedEntryId(null)}
            onUpdate={updateEntry}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />
        ) : (
          <KbClinicalBrowse
            entries={entries}
            onSelect={setSelectedEntryId}
            onAdd={() => setShowAddDialog(true)}
            language={language}
          />
        )}
      </div>

      <p className="kbp-license-strip">{t('kbPharmaCommunityLicense')}</p>

      {showAddDialog ? (
        <AddClinicalEntryDialog
          existingCategories={kbCustomCategories(entries)}
          onSave={(input) => {
            const created = addEntry(input)
            setShowAddDialog(false)
            setSelectedEntryId(created.id)
          }}
          onCancel={() => setShowAddDialog(false)}
        />
      ) : null}
    </div>
  )
}
