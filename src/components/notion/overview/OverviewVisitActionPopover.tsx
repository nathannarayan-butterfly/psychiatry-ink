import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import {
  buildAdaptiveVisitActionBlocks,
  flattenOverviewQuickActionItems,
  type OverviewQuickActionId,
  type VisitActionPrioritizationContext,
} from '../../../utils/overview/overviewQuickActions'

interface OverviewVisitActionPopoverProps {
  context: VisitActionPrioritizationContext
  onAction: (action: OverviewQuickActionId) => void
}

export function OverviewVisitActionPopover({ context, onAction }: OverviewVisitActionPopoverProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])

  const blocks = useMemo(() => buildAdaptiveVisitActionBlocks(context), [context])
  const items = useMemo(() => flattenOverviewQuickActionItems(blocks), [blocks])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    setActiveIndex(0)
    requestAnimationFrame(() => itemRefs.current[0]?.focus())
  }, [open])

  const runAction = useCallback(
    (action: OverviewQuickActionId) => {
      onAction(action)
      setOpen(false)
    },
    [onAction],
  )

  const handleMenuKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (items.length === 0) return
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        const next = (activeIndex + 1) % items.length
        setActiveIndex(next)
        itemRefs.current[next]?.focus()
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        const next = (activeIndex - 1 + items.length) % items.length
        setActiveIndex(next)
        itemRefs.current[next]?.focus()
        return
      }
      if (event.key === 'Home') {
        event.preventDefault()
        setActiveIndex(0)
        itemRefs.current[0]?.focus()
        return
      }
      if (event.key === 'End') {
        event.preventDefault()
        const last = items.length - 1
        setActiveIndex(last)
        itemRefs.current[last]?.focus()
      }
    },
    [activeIndex, items.length],
  )

  let itemIndex = -1

  return (
    <div className="ov-visit-action" ref={wrapperRef}>
      <button
        type="button"
        className="ov-visit-action__trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('overviewQuickActionButton')}
        title={t('overviewQuickActionButtonHint')}
      >
        <Plus strokeWidth={2} aria-hidden />
        <span>{t('overviewQuickActionButton')}</span>
      </button>
      {open ? (
        <div
          className="ov-visit-action__popover"
          role="menu"
          aria-label={t('overviewQuickActionButton')}
          onKeyDown={handleMenuKeyDown}
        >
          {blocks.map((block, blockIndex) => {
            if (block.type === 'section') {
              return (
                <p
                  key={`section-${block.titleKey}-${blockIndex}`}
                  className="ov-visit-action__section"
                  role="presentation"
                >
                  {t(block.titleKey)}
                </p>
              )
            }
            itemIndex += 1
            const currentIndex = itemIndex
            return (
              <button
                key={`${block.id}-${blockIndex}`}
                ref={(node) => {
                  itemRefs.current[currentIndex] = node
                }}
                type="button"
                role="menuitem"
                className={[
                  'ov-visit-action__item',
                  block.priority ? 'ov-visit-action__item--priority' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                tabIndex={currentIndex === activeIndex ? 0 : -1}
                onFocus={() => setActiveIndex(currentIndex)}
                onClick={() => runAction(block.id)}
              >
                {t(block.labelKey)}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
