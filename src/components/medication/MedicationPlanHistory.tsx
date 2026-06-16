import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import {
  getChangeTypeLabel,
  getFormulationLabel,
  getStatusLabel,
  translateMedicationUi,
} from '../../data/medicationUiTranslations'
import type { MedicationStatus } from '../../types/medicationPlan'
import type { PlanTimelineEntry } from '../../utils/medication/planOps'
import { ChangeTypeIcon } from './MedicationToolbar'

/** Maps medication status onto the shared therapy status-pill palette (mirrors MedicationRow). */
const MED_STATUS_TONE: Record<MedicationStatus, string> = {
  active: 'green',
  reduced: 'blue',
  increased: 'violet',
  paused: 'amber',
  discontinued: 'gray',
}

interface MedicationPlanHistoryProps {
  /** Plan snapshots in chronological order (oldest first). */
  timeline: PlanTimelineEntry[]
  onBackToCurrent: () => void
}

/**
 * Read-only, plan-level history: a dated list of every change point with the
 * whole medication plan as it stood at that moment. Selecting a date renders
 * that snapshot; the back control returns to the live, editable plan.
 */
export function MedicationPlanHistory({ timeline, onBackToCurrent }: MedicationPlanHistoryProps) {
  const { language } = useTranslation()
  const locale = language === 'de' ? 'de-DE' : language

  // Most recent first — the newest snapshot equals the current live plan.
  const entries = [...timeline].reverse()
  const latestAt = entries[0]?.changedAt ?? null
  const [selectedAt, setSelectedAt] = useState<string | null>(latestAt)

  const selected =
    entries.find((entry) => entry.changedAt === selectedAt) ?? entries[0] ?? null

  return (
    <div className="medication-history">
      <div className="medication-history__bar">
        <div className="medication-history__heading">
          <h4 className="medication-history__title">
            {translateMedicationUi(language, 'medPlanHistoryTitle')}
          </h4>
          <p className="medication-history__subtitle">
            {translateMedicationUi(language, 'medPlanHistorySubtitle')}
          </p>
        </div>
        <button type="button" className="medication-history__back" onClick={onBackToCurrent}>
          <ArrowLeft size={14} aria-hidden />
          {translateMedicationUi(language, 'medLastPlan')}
        </button>
      </div>

      {!selected ? (
        <p className="medication-history__empty">
          {translateMedicationUi(language, 'medPlanHistoryEmpty')}
        </p>
      ) : (
        <div className="medication-history__layout">
          <ul className="medication-history__timeline">
            {entries.map((entry) => {
              const isCurrent = entry.changedAt === latestAt
              const isActive = entry.changedAt === selected.changedAt
              const summary = entry.changes.length
                ? entry.changes
                    .map((change) => `${change.substance} · ${getChangeTypeLabel(change.changeType, language)}`)
                    .join(', ')
                : '—'
              return (
                <li key={entry.changedAt}>
                  <button
                    type="button"
                    className={`medication-history__entry${isActive ? ' medication-history__entry--active' : ''}`}
                    onClick={() => setSelectedAt(entry.changedAt)}
                    aria-pressed={isActive}
                  >
                    <span className="medication-history__entry-date">
                      {new Date(entry.changedAt).toLocaleDateString(locale, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                      {isCurrent ? (
                        <span className="medication-history__badge">
                          {translateMedicationUi(language, 'medLastPlan')}
                        </span>
                      ) : null}
                    </span>
                    <span className="medication-history__entry-summary">{summary}</span>
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="medication-history__snapshot">
            <div className="medication-history__snapshot-head">
              <span className="medication-history__snapshot-date">
                {new Date(selected.changedAt).toLocaleString(locale, {
                  dateStyle: 'long',
                  timeStyle: 'short',
                })}
              </span>
              {selected.changedAt === latestAt ? (
                <span className="medication-history__badge medication-history__badge--strong">
                  {translateMedicationUi(language, 'medLastPlan')}
                </span>
              ) : null}
            </div>

            {selected.medications.length === 0 ? (
              <p className="medication-history__snapshot-empty">
                {translateMedicationUi(language, 'medEmpty')}
              </p>
            ) : (
              <ul className="medication-history__meds">
                {selected.medications.map((med) => (
                  <li
                    key={med.id}
                    className={`medication-history__med${med.changedNow ? ' medication-history__med--changed' : ''}`}
                  >
                    <span
                      className="medication-history__med-icon"
                      title={getChangeTypeLabel(med.changeType, language)}
                    >
                      <ChangeTypeIcon changeType={med.changeType} />
                    </span>
                    <div className="medication-history__med-body">
                      <div className="medication-history__med-title">
                        <span className="medication-history__med-substance">
                          {med.substance}
                          {med.displayBrandName ? (
                            <span className="medication-history__med-brand"> ({med.displayBrandName})</span>
                          ) : null}
                        </span>
                        <span className="medication-history__med-form">
                          {getFormulationLabel(med.formulation, language)}
                          {med.strength ? ` · ${med.strength}` : ''}
                        </span>
                        <span
                          className={`therapy-status therapy-status--${MED_STATUS_TONE[med.status] ?? 'gray'} medication-row__status`}
                        >
                          {getStatusLabel(med.status, language)}
                        </span>
                      </div>
                      <div className="medication-history__med-dose">{med.doseLineGerman}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
