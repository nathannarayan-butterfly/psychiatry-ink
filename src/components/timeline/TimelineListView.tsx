import type { TimelineEntry } from '../../types/timeline'
import { TimelineEntryActions } from './TimelineEntryActions'

interface TimelineListViewProps {
  entries: TimelineEntry[]
  onEditEntry: (entry: TimelineEntry) => void
  onDeleteEntry: (entryId: string) => void
  onToggleEntryVisibility: (entryId: string) => void
  editLabel: string
  hideLabel: string
  showLabel: string
  deleteLabel: string
  priorityLabels: Record<TimelineEntry['priority'], string>
}

export function TimelineListView({
  entries,
  onEditEntry,
  onDeleteEntry,
  onToggleEntryVisibility,
  editLabel,
  hideLabel,
  showLabel,
  deleteLabel,
  priorityLabels,
}: TimelineListViewProps) {
  const sorted = [...entries].sort((a, b) => a.sortKey - b.sortKey)

  return (
    <div className="timeline-list">
      <ul className="timeline-list__items">
        {sorted.map((entry) => (
          <li
            key={entry.id}
            className={`timeline-list__row timeline-entry--${entry.priority}${
              entry.visible ? '' : ' timeline-entry--hidden'
            }`}
          >
            <span className="timeline-list__date">{entry.displayDate}</span>
            <div className="timeline-list__content">
              <span className="timeline-list__heading">{entry.heading.trim() || entry.displayDate}</span>
              {entry.subheading ? (
                <span className="timeline-list__subheading">{entry.subheading}</span>
              ) : null}
            </div>
            <span className="timeline-list__priority">{priorityLabels[entry.priority]}</span>
            <TimelineEntryActions
              entry={entry}
              onEdit={onEditEntry}
              onDelete={onDeleteEntry}
              onToggleVisibility={onToggleEntryVisibility}
              editLabel={editLabel}
              hideLabel={hideLabel}
              showLabel={showLabel}
              deleteLabel={deleteLabel}
              className="timeline-list__actions"
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
