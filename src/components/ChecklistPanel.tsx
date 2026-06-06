import { useMemo } from 'react'
import type { DocumentChecklistItem } from '../types'

interface ChecklistPanelProps {
  items: DocumentChecklistItem[]
  selections: Record<string, boolean>
  disabled?: boolean
  onToggle: (itemId: string, checked: boolean) => void
}

export function ChecklistPanel({
  items,
  selections,
  disabled = false,
  onToggle,
}: ChecklistPanelProps) {
  const groups = useMemo(() => {
    const grouped: Array<{ name: string; hint?: string; items: DocumentChecklistItem[] }> = []
    const indexByName = new Map<string, number>()

    for (const item of items) {
      const name = item.group ?? ''
      const existingIndex = indexByName.get(name)

      if (existingIndex === undefined) {
        indexByName.set(name, grouped.length)
        grouped.push({
          name,
          hint: item.hint,
          items: [item],
        })
        continue
      }

      grouped[existingIndex].items.push(item)
      if (!grouped[existingIndex].hint && item.hint) {
        grouped[existingIndex].hint = item.hint
      }
    }

    return grouped
  }, [items])

  if (items.length === 0) return null

  return (
    <div className="checklist-panel shrink-0 px-3 py-2 sm:px-5">
      <div className="workspace-float-block space-y-2.5 p-2.5 sm:p-3">
        {groups.map((group) => (
          <div key={group.name || 'default'} className="checklist-group">
            {group.name ? (
              <div className="mb-1">
                <p className="text-[11px] font-medium text-ink sm:text-xs">{group.name}</p>
                {group.hint ? (
                  <p className="mt-0.5 text-[10px] leading-snug text-muted sm:text-[11px]">
                    {group.hint}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {group.items.map((item) => {
                const checked = Boolean(selections[item.id])

                return (
                  <label
                    key={item.id}
                    title={item.hint}
                    className={`checklist-item inline-flex cursor-pointer items-center gap-1.5 rounded-[calc(var(--radius-sm)-0.25rem)] border px-2 py-1 text-[11px] shadow-[var(--shadow-elevated-sm)] transition-colors sm:text-xs ${
                      checked
                        ? 'checklist-item--active border-accent bg-surface text-ink'
                        : 'border-border/70 bg-surface text-muted hover:border-border hover:text-ink'
                    } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={(event) => onToggle(item.id, event.target.checked)}
                      className="h-3.5 w-3.5 rounded-sm border-2 border-border accent-accent"
                    />
                    <span>{item.label}</span>
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
