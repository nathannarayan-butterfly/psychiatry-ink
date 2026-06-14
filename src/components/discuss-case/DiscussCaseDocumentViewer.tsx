import { useCallback, useMemo, useRef, useState } from 'react'
import type {
  DiscussCaseAnnotation,
  DiscussCaseParticipant,
  DiscussPackageContent,
  DiscussQuoteExcerpt,
} from '../../types/discussCase'
import { buildHighlightSegments } from '../../utils/discussCase/buildHighlightSegments'
import { getParticipantColor } from '../../utils/discussCase/participantColors'
import {
  SelectionActionBubble,
  selectionBubblePosition,
  type SelectionAction,
} from '../ui/SelectionActionBubble'

interface DiscussCaseDocumentViewerProps {
  packageContent: DiscussPackageContent | null
  annotations: DiscussCaseAnnotation[]
  participants?: DiscussCaseParticipant[]
  currentUserId?: string
  activeSectionId?: string
  onSectionSelect?: (sectionId: string) => void
  canHighlight: boolean
  canComment: boolean
  canCopy: boolean
  canQuote: boolean
  onHighlight?: (input: {
    sectionId: string
    sectionLabel: string
    startOffset: number
    endOffset: number
    text: string
  }) => void
  onQuoteToChat?: (quote: DiscussQuoteExcerpt) => void
}

interface SelectionState {
  text: string
  startOffset: number
  endOffset: number
}

const ROLE_TAGS: Record<DiscussCaseParticipant['role'], string> = {
  owner: 'Eigentümer',
  internal: 'Intern',
  external: 'Extern',
}

export function DiscussCaseDocumentViewer({
  packageContent,
  annotations,
  participants,
  currentUserId,
  activeSectionId,
  onSectionSelect,
  canHighlight,
  canComment: _canComment,
  canCopy,
  canQuote,
  onHighlight,
  onQuoteToChat,
}: DiscussCaseDocumentViewerProps) {
  const sections = packageContent?.sections ?? []
  const [internalSectionId, setInternalSectionId] = useState(sections[0]?.id ?? '')
  const textRef = useRef<HTMLPreElement>(null)
  const [bubbleVisible, setBubbleVisible] = useState(false)
  const [bubblePosition, setBubblePosition] = useState({ x: 0, y: 0 })
  const [selection, setSelection] = useState<SelectionState | null>(null)
  const [activeComment, setActiveComment] = useState<{
    annotationId: string
    commentBody: string
    x: number
    y: number
  } | null>(null)

  const currentSectionId = activeSectionId ?? internalSectionId
  const currentSection = sections.find((s) => s.id === currentSectionId) ?? sections[0]

  const participantByUserId = useMemo(
    () => new Map((participants ?? []).map((p) => [p.userId, p])),
    [participants],
  )

  const sectionAnnotations = useMemo(
    () => annotations.filter((a) => a.sectionId === currentSection?.id && !a.resolvedAt),
    [annotations, currentSection?.id],
  )

  const textSegments = useMemo(
    () => buildHighlightSegments(currentSection?.content ?? '', sectionAnnotations),
    [currentSection?.content, sectionAnnotations],
  )

  const legendEntries = useMemo(() => {
    const seen = new Set<string>()
    const entries: Array<{ userId: string; label: string; highlight: string; text: string }> = []
    for (const annotation of sectionAnnotations) {
      if (seen.has(annotation.authorUserId)) continue
      seen.add(annotation.authorUserId)
      const participant = participantByUserId.get(annotation.authorUserId)
      const isSelf = currentUserId && annotation.authorUserId === currentUserId
      const label = isSelf
        ? 'Sie'
        : participant
          ? `${annotation.authorUserId.slice(0, 8)} (${ROLE_TAGS[participant.role]})`
          : annotation.authorUserId.slice(0, 8)
      const participantColor = getParticipantColor(annotation.authorUserId)
      entries.push({
        userId: annotation.authorUserId,
        label,
        highlight: participantColor.highlight,
        text: participantColor.text,
      })
    }
    return entries
  }, [currentUserId, participantByUserId, sectionAnnotations])

  const selectSection = useCallback(
    (id: string) => {
      setInternalSectionId(id)
      onSectionSelect?.(id)
      setBubbleVisible(false)
      setSelection(null)
      setActiveComment(null)
    },
    [onSectionSelect],
  )

  const closeBubble = useCallback(() => {
    setBubbleVisible(false)
    setSelection(null)
  }, [])

  const handleTextMouseUp = useCallback(() => {
    if (!currentSection) return
    requestAnimationFrame(() => {
      const container = textRef.current
      if (!container) return
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return

      const range = sel.getRangeAt(0)
      if (
        !container.contains(range.startContainer) ||
        !container.contains(range.endContainer)
      ) {
        return
      }

      const selStr = sel.toString()
      const trimmedText = selStr.trim()
      if (!trimmedText) return

      const preRange = document.createRange()
      preRange.selectNodeContents(container)
      preRange.setEnd(range.startContainer, range.startOffset)
      const rawStart = preRange.toString().length
      const leadingWhitespace = selStr.length - selStr.trimStart().length
      const startOffset = rawStart + leadingWhitespace
      const endOffset = startOffset + trimmedText.length

      const rect = range.getBoundingClientRect()
      setSelection({
        text: trimmedText,
        startOffset,
        endOffset,
      })
      setBubblePosition(selectionBubblePosition(rect))
      setBubbleVisible(true)
      setActiveComment(null)
    })
  }, [currentSection])

  const handleMarkieren = useCallback(() => {
    if (!currentSection || !selection || !canHighlight || !onHighlight) return
    onHighlight({
      sectionId: currentSection.id,
      sectionLabel: currentSection.label,
      startOffset: selection.startOffset,
      endOffset: selection.endOffset,
      text: selection.text,
    })
    window.getSelection()?.removeAllRanges()
    closeBubble()
  }, [canHighlight, closeBubble, currentSection, onHighlight, selection])

  const handleZitieren = useCallback(() => {
    if (!currentSection || !selection || !onQuoteToChat) return
    onQuoteToChat({
      sectionId: currentSection.id,
      sectionLabel: currentSection.label,
      text: selection.text,
      startOffset: selection.startOffset,
      endOffset: selection.endOffset,
    })
    window.getSelection()?.removeAllRanges()
    closeBubble()
  }, [closeBubble, currentSection, onQuoteToChat, selection])

  const handleCopySelection = useCallback(() => {
    if (!selection?.text) return
    void navigator.clipboard.writeText(selection.text)
    window.getSelection()?.removeAllRanges()
    closeBubble()
  }, [closeBubble, selection])

  const handleHighlightClick = useCallback(
    (event: React.MouseEvent<HTMLElement>, annotationId: string, commentBody: string | null) => {
      if (!commentBody) return
      event.stopPropagation()
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
      setActiveComment({
        annotationId,
        commentBody,
        x: rect.left + rect.width / 2,
        y: rect.top,
      })
      setBubbleVisible(false)
      setSelection(null)
    },
    [],
  )

  const bubbleActions = useMemo((): SelectionAction[] => {
    const actions: SelectionAction[] = []
    if (canHighlight && onHighlight) {
      actions.push({ id: 'markieren', label: 'Markieren', onClick: handleMarkieren })
    }
    if (canQuote && onQuoteToChat) {
      actions.push({ id: 'zitieren', label: 'Zitieren', onClick: handleZitieren })
    }
    if (canCopy && selection?.text) {
      actions.push({ id: 'kopieren', label: 'Kopieren', onClick: handleCopySelection })
    }
    return actions
  }, [
    canCopy,
    canHighlight,
    canQuote,
    handleCopySelection,
    handleMarkieren,
    handleZitieren,
    onHighlight,
    onQuoteToChat,
    selection?.text,
  ])

  if (!packageContent || sections.length === 0) {
    return (
      <div className="discuss-case-doc discuss-case-doc--empty">
        <p>Kein Paketinhalt verfügbar.</p>
      </div>
    )
  }

  return (
    <div className="discuss-case-doc" onClick={() => setActiveComment(null)}>
      <nav className="discuss-case-doc__nav" aria-label="Abschnitte">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            className={[
              'discuss-case-doc__nav-item',
              section.id === currentSection?.id ? 'discuss-case-doc__nav-item--active' : '',
            ].join(' ').trim()}
            onClick={() => selectSection(section.id)}
          >
            {section.label}
          </button>
        ))}
      </nav>

      <article className="discuss-case-doc__content">
        <header className="discuss-case-doc__header">
          <h2 className="discuss-case-doc__heading">{currentSection?.label}</h2>
          <span className="discuss-case-doc__meta">{packageContent.patientLabel}</span>
        </header>

        <div className="discuss-case-doc__body">
          <pre
            ref={textRef}
            className="discuss-case-doc__text"
            onMouseUp={handleTextMouseUp}
          >
            {textSegments.map((seg, i) =>
              seg.annotationId ? (
                <mark
                  key={`${seg.annotationId}-${i}`}
                  className="discuss-case-doc__highlight"
                  style={{
                    backgroundColor: seg.backgroundColor,
                    borderBottom: seg.borderColor ? `2px solid ${seg.borderColor}` : undefined,
                  }}
                  title={seg.commentBody ?? undefined}
                  onClick={(e) =>
                    handleHighlightClick(e, seg.annotationId!, seg.commentBody ?? null)
                  }
                >
                  {seg.text}
                </mark>
              ) : (
                <span key={i}>{seg.text}</span>
              ),
            )}
          </pre>
          {legendEntries.length > 0 ? (
            <div className="discuss-case-doc__legend" aria-label="Markierungsfarben">
              {legendEntries.map((entry) => (
                <span key={entry.userId} className="discuss-case-doc__legend-item">
                  <span
                    className="discuss-case-doc__legend-dot"
                    style={{ backgroundColor: entry.highlight, borderColor: entry.text }}
                    aria-hidden="true"
                  />
                  <span style={{ color: entry.text }}>{entry.label}</span>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </article>

      {activeComment ? (
        <div
          className="discuss-case-doc__comment-popup"
          style={{
            left: activeComment.x,
            top: activeComment.y,
          }}
          role="note"
          onClick={(e) => e.stopPropagation()}
        >
          {activeComment.commentBody}
        </div>
      ) : null}

      <SelectionActionBubble
        visible={bubbleVisible && bubbleActions.length > 0}
        position={bubblePosition}
        actions={bubbleActions}
        onClose={closeBubble}
      />
    </div>
  )
}
