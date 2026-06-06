import { Eye, EyeOff, Pencil, Trash2 } from 'lucide-react'

import type { TimelineEntry } from '../../types/timeline'

interface TimelineEntryActionsProps {
  entry: TimelineEntry
  onEdit: (entry: TimelineEntry) => void
  onDelete: (entryId: string) => void
  onToggleVisibility: (entryId: string) => void
  editLabel: string
  hideLabel: string
  showLabel: string
  deleteLabel: string
  className?: string
}

export function TimelineEntryActions({
  entry,
  onEdit,
  onDelete,
  onToggleVisibility,
  editLabel,
  hideLabel,
  showLabel,
  deleteLabel,
  className = '',
}: TimelineEntryActionsProps) {
  return (
    <div className={`timeline-entry__actions ${className}`.trim()}>
      <button
        type="button"
        className="timeline-entry__action"
        aria-label={editLabel}
        title={editLabel}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => onEdit(entry)}
      >
        <Pencil className="h-2.5 w-2.5" strokeWidth={1.75} aria-hidden />
      </button>
      <button
        type="button"
        className="timeline-entry__action"
        aria-label={entry.visible ? hideLabel : showLabel}
        title={entry.visible ? hideLabel : showLabel}
        aria-pressed={!entry.visible}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => onToggleVisibility(entry.id)}
      >
        {entry.visible ? (
          <Eye className="h-2.5 w-2.5" strokeWidth={1.75} aria-hidden />
        ) : (
          <EyeOff className="h-2.5 w-2.5" strokeWidth={1.75} aria-hidden />
        )}
      </button>
      <button
        type="button"
        className="timeline-entry__action timeline-entry__action--danger"
        aria-label={deleteLabel}
        title={deleteLabel}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => onDelete(entry.id)}
      >
        <Trash2 className="h-2.5 w-2.5" strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  )
}
