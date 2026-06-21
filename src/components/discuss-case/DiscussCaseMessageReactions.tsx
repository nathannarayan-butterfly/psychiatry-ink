import { Plus, Smile } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { DiscussCaseMessageReaction } from '../../types/discussCase'
import { DISCUSS_REACTION_EMOJIS } from '../../utils/discussCase/chatEmojis'
import { DiscussCaseEmojiPicker } from './DiscussCaseEmojiPicker'

const REACTIONS_I18N = {
  de: {
    react: 'Reagieren',
    addReaction: 'Reaktion hinzufügen',
    removeReaction: 'Reaktion entfernen',
    quickReact: 'Schnell reagieren',
    reactWith: (emoji: string) => `Reagieren mit ${emoji}`,
    reactionCount: (emoji: string, count: number) => `${count}× ${emoji}`,
  },
  en: {
    react: 'React',
    addReaction: 'Add reaction',
    removeReaction: 'Remove reaction',
    quickReact: 'Quick react',
    reactWith: (emoji: string) => `React with ${emoji}`,
    reactionCount: (emoji: string, count: number) => `${count}× ${emoji}`,
  },
} as const

type ReactionsLocale = keyof typeof REACTIONS_I18N

interface ReactionGroup {
  emoji: string
  count: number
  reactedBySelf: boolean
}

function groupReactions(
  reactions: DiscussCaseMessageReaction[],
  currentUserId?: string,
): ReactionGroup[] {
  const map = new Map<string, ReactionGroup>()
  for (const reaction of reactions) {
    const existing = map.get(reaction.emoji)
    if (existing) {
      existing.count += 1
      if (currentUserId && reaction.userId === currentUserId) existing.reactedBySelf = true
    } else {
      map.set(reaction.emoji, {
        emoji: reaction.emoji,
        count: 1,
        reactedBySelf: Boolean(currentUserId && reaction.userId === currentUserId),
      })
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji))
}

interface DiscussCaseMessageReactionsProps {
  reactions: DiscussCaseMessageReaction[]
  currentUserId?: string
  locale?: ReactionsLocale
  align?: 'left' | 'right'
  canReact: boolean
  busy?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onToggle: (emoji: string) => void
}

export function DiscussCaseMessageReactions({
  reactions,
  currentUserId,
  locale = 'de',
  align = 'left',
  canReact,
  busy = false,
  open = false,
  onOpenChange,
  onToggle,
}: DiscussCaseMessageReactionsProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [quickReactionsShift, setQuickReactionsShift] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const quickReactionsRef = useRef<HTMLDivElement>(null)
  const t = REACTIONS_I18N[locale]
  const groups = useMemo(
    () => groupReactions(reactions, currentUserId),
    [currentUserId, reactions],
  )
  const ownReaction = reactions.find((r) => r.userId === currentUserId)?.emoji
  const reactedEmojis = useMemo(() => new Set(groups.map((g) => g.emoji)), [groups])

  useEffect(() => {
    if (!open) {
      setPickerOpen(false)
      return
    }
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      if (wrapRef.current?.contains(target)) return
      onOpenChange?.(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange?.(false)
    }
    const attachTimer = window.setTimeout(() => {
      document.addEventListener('mousedown', handlePointerDown)
      document.addEventListener('touchstart', handlePointerDown)
      document.addEventListener('keydown', handleKeyDown)
    }, 0)
    return () => {
      window.clearTimeout(attachTimer)
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onOpenChange, open])

  useLayoutEffect(() => {
    if (!open) {
      setQuickReactionsShift(0)
      return
    }

    const adjust = () => {
      const el = quickReactionsRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const margin = 8
      let shift = 0
      if (rect.right > window.innerWidth - margin) {
        shift += window.innerWidth - margin - rect.right
      }
      if (rect.left + shift < margin) {
        shift += margin - (rect.left + shift)
      }
      setQuickReactionsShift(shift)
    }

    adjust()
    window.addEventListener('resize', adjust)
    window.addEventListener('scroll', adjust, true)
    return () => {
      window.removeEventListener('resize', adjust)
      window.removeEventListener('scroll', adjust, true)
    }
  }, [open, pickerOpen, groups.length])

  const handleToggleOpen = () => {
    onOpenChange?.(!open)
  }

  const handleEmojiToggle = (emoji: string) => {
    onToggle(emoji)
    onOpenChange?.(false)
  }

  if (!canReact && groups.length === 0) return null

  return (
    <div
      ref={wrapRef}
      className={[
        'discuss-case-chat__reactions-wrap',
        align === 'right' ? 'discuss-case-chat__reactions-wrap--right' : '',
        open ? 'discuss-case-chat__reactions-wrap--open' : '',
      ].join(' ').trim()}
    >
      {canReact ? (
        <>
          <button
            type="button"
            className={[
              'discuss-case-chat__react-trigger',
              open ? 'discuss-case-chat__react-trigger--active' : '',
            ].join(' ').trim()}
            disabled={busy}
            aria-label={t.react}
            title={t.react}
            aria-expanded={open}
            onClick={(event) => {
              event.stopPropagation()
              handleToggleOpen()
            }}
          >
            <Smile className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
          </button>
          <div
            ref={quickReactionsRef}
            className={[
              'discuss-case-chat__quick-reactions',
              align === 'right' ? 'discuss-case-chat__quick-reactions--right' : '',
              open ? 'discuss-case-chat__quick-reactions--open' : '',
            ].join(' ').trim()}
            role="toolbar"
            aria-label={t.quickReact}
            hidden={!open}
            style={
              quickReactionsShift
                ? ({ '--dc-quick-reactions-shift': `${quickReactionsShift}px` } as CSSProperties)
                : undefined
            }
          >
          {DISCUSS_REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className={[
                'discuss-case-chat__quick-reaction-btn',
                reactedEmojis.has(emoji) ? 'discuss-case-chat__quick-reaction-btn--active' : '',
              ].join(' ').trim()}
              disabled={busy}
              aria-label={t.reactWith(emoji)}
              title={emoji}
              onClick={() => handleEmojiToggle(emoji)}
            >
              <span className="discuss-case-chat__reaction-emoji" aria-hidden="true">
                {emoji}
              </span>
            </button>
          ))}
          <div className="discuss-case-chat__reaction-add-wrap">
            <button
              type="button"
              className="discuss-case-chat__quick-reaction-btn discuss-case-chat__quick-reaction-btn--more"
              disabled={busy}
              aria-label={t.addReaction}
              title={t.react}
              aria-expanded={pickerOpen}
              onClick={(event) => {
                event.stopPropagation()
                setPickerOpen((prev) => !prev)
              }}
            >
              {ownReaction &&
              !DISCUSS_REACTION_EMOJIS.includes(
                ownReaction as (typeof DISCUSS_REACTION_EMOJIS)[number],
              ) ? (
                <span className="discuss-case-chat__reaction-emoji" aria-hidden="true">
                  {ownReaction}
                </span>
              ) : pickerOpen ? (
                <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              ) : (
                <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              )}
            </button>
            {pickerOpen ? (
              <DiscussCaseEmojiPicker
                locale={locale}
                mode="reaction"
                align={align}
                onSelect={handleEmojiToggle}
                onClose={() => setPickerOpen(false)}
              />
            ) : null}
          </div>
        </div>
        </>
      ) : null}

      {groups.length > 0 ? (
        <div
          className={[
            'discuss-case-chat__reactions',
            align === 'right' ? 'discuss-case-chat__reactions--right' : '',
          ].join(' ').trim()}
        >
          {groups.map((group) => (
            <button
              key={group.emoji}
              type="button"
              className={[
                'discuss-case-chat__reaction-chip',
                group.reactedBySelf ? 'discuss-case-chat__reaction-chip--own' : '',
              ].join(' ').trim()}
              disabled={!canReact || busy}
              aria-label={
                group.reactedBySelf
                  ? `${t.removeReaction}: ${t.reactionCount(group.emoji, group.count)}`
                  : t.reactionCount(group.emoji, group.count)
              }
              title={group.reactedBySelf ? t.removeReaction : undefined}
              onClick={() => handleEmojiToggle(group.emoji)}
            >
              <span className="discuss-case-chat__reaction-emoji" aria-hidden="true">
                {group.emoji}
              </span>
              {group.count > 1 ? (
                <span className="discuss-case-chat__reaction-count">{group.count}</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
