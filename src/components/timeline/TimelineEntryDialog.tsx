import { useTranslation } from '../../context/TranslationContext'
import type { TimelineDateKind, TimelinePriority } from '../../types/timeline'
import { timelineDatePlaceholder } from '../../utils/timelineDates'
import type { TimelineToolState } from '../../hooks/useTimelineTool'

interface TimelineEntryDialogProps {
  timeline: TimelineToolState
}

const dateKinds: TimelineDateKind[] = ['ddmmyy', 'mmyy', 'yy', 'age']
const priorities: TimelinePriority[] = ['low', 'medium', 'high', 'critical']

const dateKindLabelKey = {
  ddmmyy: 'timelineDateDdmmyy',
  mmyy: 'timelineDateMmyy',
  yy: 'timelineDateYy',
  age: 'timelineDateAge',
} as const

const priorityLabelKey = {
  low: 'timelinePriorityLow',
  medium: 'timelinePriorityMedium',
  high: 'timelinePriorityHigh',
  critical: 'timelinePriorityCritical',
} as const

export function TimelineEntryDialog({ timeline }: TimelineEntryDialogProps) {
  const { t } = useTranslation()

  if (!timeline.dialogOpen) return null

  return (
    <div className="timeline-entry-dialog__backdrop" role="presentation" onClick={timeline.closeDialog}>
      <div
        className="timeline-entry-dialog workspace-float-block"
        role="dialog"
        aria-modal="true"
        aria-labelledby="timeline-entry-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="timeline-entry-dialog__header">
          <h2 id="timeline-entry-dialog-title" className="text-sm font-semibold text-ink">
            {timeline.editingId ? t('timelineEditEntry') : t('timelineAddEntry')}
          </h2>
        </div>

        <div className="timeline-entry-dialog__body">
          <label className="timeline-entry-dialog__field">
            <span>{t('timelineHeading')}</span>
            <input
              type="text"
              value={timeline.draft.heading}
              onChange={(event) => timeline.updateDraft({ heading: event.target.value })}
              className="timeline-entry-dialog__input"
              autoFocus
            />
          </label>

          <label className="timeline-entry-dialog__field">
            <span>{t('timelineSubheading')}</span>
            <input
              type="text"
              value={timeline.draft.subheading}
              onChange={(event) => timeline.updateDraft({ subheading: event.target.value })}
              className="timeline-entry-dialog__input"
            />
          </label>

          <div className="timeline-entry-dialog__field">
            <span>{t('timelineDateKind')}</span>
            <div className="timeline-entry-dialog__segment">
              {dateKinds.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  className={`timeline-entry-dialog__segment-btn ${
                    timeline.draft.dateKind === kind ? 'timeline-entry-dialog__segment-btn--active' : ''
                  }`}
                  onClick={() => timeline.updateDraft({ dateKind: kind })}
                >
                  {t(dateKindLabelKey[kind])}
                </button>
              ))}
            </div>
          </div>

          <label className="timeline-entry-dialog__field">
            <span>{t('timelineDateValue')}</span>
            <input
              type="text"
              value={timeline.draft.dateValue}
              onChange={(event) => timeline.updateDraft({ dateValue: event.target.value })}
              placeholder={timelineDatePlaceholder(timeline.draft.dateKind)}
              className="timeline-entry-dialog__input"
            />
          </label>

          <div className="timeline-entry-dialog__field">
            <span>{t('timelinePriority')}</span>
            <div className="timeline-entry-dialog__segment">
              {priorities.map((priority) => (
                <button
                  key={priority}
                  type="button"
                  className={`timeline-entry-dialog__segment-btn timeline-entry-dialog__segment-btn--priority timeline-entry-dialog__segment-btn--${priority} ${
                    timeline.draft.priority === priority ? 'timeline-entry-dialog__segment-btn--active' : ''
                  }`}
                  onClick={() => timeline.updateDraft({ priority })}
                >
                  {t(priorityLabelKey[priority])}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="timeline-entry-dialog__footer">
          <button type="button" className="timeline-entry-dialog__btn" onClick={timeline.closeDialog}>
            {t('timelineCancel')}
          </button>
          <button
            type="button"
            className="timeline-entry-dialog__btn timeline-entry-dialog__btn--primary"
            onClick={() => timeline.saveDraft()}
          >
            {t('timelineSave')}
          </button>
        </div>
      </div>
    </div>
  )
}
