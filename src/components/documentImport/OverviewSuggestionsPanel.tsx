import { Sparkles } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import type { OverviewWidgetSuggestion } from '../../schemas/documentImport/aiSuggestion'

export type OverviewSuggestionStatus = 'pending' | 'accepted' | 'rejected'

interface OverviewSuggestionsPanelProps {
  suggestions: OverviewWidgetSuggestion[]
  statuses: Record<number, OverviewSuggestionStatus>
  onToggle: (index: number, status: OverviewSuggestionStatus) => void
  onAcceptAll: () => void
}

import type { UiTranslationKey } from '../../data/uiTranslations'

function widgetLabel(suggestion: OverviewWidgetSuggestion, t: (key: UiTranslationKey) => string): string {
  switch (suggestion.widget) {
    case 'compliance':
      return t('documentImportOverviewWidgetCompliance')
    case 'angemeldete-therapien':
      return t('documentImportOverviewWidgetTherapies')
    case 'psychotherapy':
      return t('documentImportOverviewWidgetPsychotherapy')
    case 'verlaufstendenz':
      return t('documentImportOverviewWidgetVerlaufstendenz')
    case 'safety':
      return t('documentImportOverviewWidgetSafety')
  }
}

function suggestionSummary(suggestion: OverviewWidgetSuggestion): string {
  switch (suggestion.widget) {
    case 'compliance':
      return `${suggestion.itemLabel} (${suggestion.itemGroup}) → ${suggestion.status}`
    case 'angemeldete-therapien':
      return `${suggestion.kind}: ${suggestion.label}`
    case 'psychotherapy':
      return [suggestion.method, suggestion.mainGoal].filter(Boolean).join(' · ') || 'Psychotherapie'
    case 'verlaufstendenz':
      return suggestion.courseDirection
    case 'safety':
      return suggestion.title
  }
}

export function OverviewSuggestionsPanel({
  suggestions,
  statuses,
  onToggle,
  onAcceptAll,
}: OverviewSuggestionsPanelProps) {
  const { t } = useTranslation()

  if (suggestions.length === 0) return null

  const pendingCount = suggestions.filter((_, i) => (statuses[i] ?? 'pending') === 'pending').length

  return (
    <section className="doc-import-overview-suggestions" aria-labelledby="doc-import-overview-heading">
      <div className="doc-import-overview-suggestions__header">
        <h3 id="doc-import-overview-heading" className="doc-import-overview-suggestions__title">
          <Sparkles className="doc-import-overview-suggestions__icon" aria-hidden strokeWidth={1.75} />
          {t('documentImportOverviewSuggestionsHeading')}
        </h3>
        <button type="button" className="doc-import-textbtn" onClick={onAcceptAll}>
          {t('documentImportOverviewAcceptAll')}
        </button>
      </div>
      <p className="doc-import-overview-suggestions__hint">{t('documentImportOverviewSuggestionsHint')}</p>
      <ul className="doc-import-overview-suggestions__list">
        {suggestions.map((suggestion, index) => {
          const status = statuses[index] ?? 'pending'
          return (
            <li key={`${suggestion.widget}-${index}`} className="doc-import-overview-suggestions__item">
              <div className="doc-import-overview-suggestions__meta">
                <span className="doc-import-overview-suggestions__widget">
                  {widgetLabel(suggestion, t)}
                </span>
                <span className="doc-import-overview-suggestions__summary">{suggestionSummary(suggestion)}</span>
                {suggestion.rationale ? (
                  <span className="doc-import-overview-suggestions__rationale">{suggestion.rationale}</span>
                ) : null}
              </div>
              <div className="doc-import-overview-suggestions__actions">
                <button
                  type="button"
                  className={`doc-import-chip ${status === 'accepted' ? 'doc-import-chip--accepted' : ''}`}
                  onClick={() => onToggle(index, status === 'accepted' ? 'pending' : 'accepted')}
                >
                  {t('documentImportAccept')}
                </button>
                <button
                  type="button"
                  className={`doc-import-chip ${status === 'rejected' ? 'doc-import-chip--rejected' : ''}`}
                  onClick={() => onToggle(index, status === 'rejected' ? 'pending' : 'rejected')}
                >
                  {t('documentImportReject')}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      {pendingCount > 0 ? (
        <p className="doc-import-overview-suggestions__pending">
          {t('documentImportOverviewPendingCount').replace('{count}', String(pendingCount))}
        </p>
      ) : null}
    </section>
  )
}
