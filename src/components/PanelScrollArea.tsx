import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslation } from '../context/TranslationContext'
import { IconButton } from './IconButton'

interface PanelScrollAreaProps {
  children: ReactNode
  className?: string
  scrollClassName?: string
}

export function PanelScrollArea({
  children,
  className = '',
  scrollClassName = '',
}: PanelScrollAreaProps) {
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollUp, setCanScrollUp] = useState(false)
  const [canScrollDown, setCanScrollDown] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    setCanScrollUp(scrollTop > 1)
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - 1)
  }, [])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const update = () => updateScrollState()

    update()
    el.addEventListener('scroll', update, { passive: true })

    const resizeObserver = new ResizeObserver(update)
    resizeObserver.observe(el)

    const mutationObserver = new MutationObserver(update)
    mutationObserver.observe(el, { childList: true, subtree: true, attributes: true })

    return () => {
      el.removeEventListener('scroll', update)
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [updateScrollState])

  const scrollByPage = (direction: 'up' | 'down') => {
    const el = scrollRef.current
    if (!el) return
    const amount = el.clientHeight * 0.8
    el.scrollBy({ top: direction === 'up' ? -amount : amount, behavior: 'smooth' })
  }

  return (
    <div className={`workspace-column__scroll-host flex min-h-0 flex-1 flex-col ${className}`}>
      {canScrollUp ? (
        <div className="workspace-column__scroll-controls flex shrink-0 justify-center py-0.5">
          <IconButton
            bordered
            icon={<ChevronUp strokeWidth={1.5} />}
            label={t('scrollUp')}
            onClick={() => scrollByPage('up')}
            className="workspace-column__scroll-btn h-6 w-6"
          />
        </div>
      ) : null}
      <div ref={scrollRef} className={`workspace-column__scroll ${scrollClassName}`}>
        {children}
      </div>
      {canScrollDown ? (
        <div className="workspace-column__scroll-controls flex shrink-0 justify-center py-0.5">
          <IconButton
            bordered
            icon={<ChevronDown strokeWidth={1.5} />}
            label={t('scrollDown')}
            onClick={() => scrollByPage('down')}
            className="workspace-column__scroll-btn h-6 w-6"
          />
        </div>
      ) : null}
    </div>
  )
}
