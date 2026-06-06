import { Pencil, Trash2 } from 'lucide-react'

import { useTranslation } from '../../context/TranslationContext'
import type { LabEntry } from '../../types/lab'
import type { LabToolState } from '../../hooks/useLabTool'

interface LabEntriesTableProps {
  lab: LabToolState
  entries: LabEntry[]
}

function formatReference(low: number | null, high: number | null): string {
  if (low !== null && high !== null) return `${low} – ${high}`
  if (low !== null) return `≥ ${low}`
  if (high !== null) return `≤ ${high}`
  return '—'
}

export function LabEntriesTable({ lab, entries }: LabEntriesTableProps) {
  const { t } = useTranslation()

  if (entries.length === 0) {
    return (
      <div className="lab-table lab-table--empty">
        <p>{t('labTableEmpty')}</p>
      </div>
    )
  }

  return (
    <div className="lab-table">
      <table className="lab-table__grid">
        <thead>
          <tr>
            <th>{t('labDate')}</th>
            <th>{t('labValue')}</th>
            <th>{t('labUnit')}</th>
            <th>{t('labReferenceRange')}</th>
            <th>{t('labStatus')}</th>
            <th>{t('labNote')}</th>
            <th className="lab-table__actions-col">{t('labActions')}</th>
          </tr>
        </thead>
        <tbody>
          {[...entries]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((entry) => {
              const status = lab.getLabValueStatus(
                entry.value,
                entry.referenceLow,
                entry.referenceHigh,
              )
              return (
                <tr key={entry.id} className={`lab-table__row lab-table__row--${status}`}>
                  <td>{lab.formatLabDate(entry.date)}</td>
                  <td>{entry.value}</td>
                  <td>{entry.unit || '—'}</td>
                  <td>{formatReference(entry.referenceLow, entry.referenceHigh)}</td>
                  <td>
                    <span className={`lab-table__status lab-table__status--${status}`}>
                      {t(
                        status === 'low'
                          ? 'labStatusLow'
                          : status === 'high'
                            ? 'labStatusHigh'
                            : 'labStatusNormal',
                      )}
                    </span>
                  </td>
                  <td className="lab-table__note">{entry.note || '—'}</td>
                  <td className="lab-table__actions">
                    <button
                      type="button"
                      className="lab-table__action"
                      aria-label={t('labEditEntry')}
                      onClick={() => lab.openEditLabDialog(entry)}
                    >
                      <Pencil className="h-3 w-3" strokeWidth={1.5} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="lab-table__action lab-table__action--danger"
                      aria-label={t('labDeleteEntry')}
                      onClick={() => lab.removeLabEntry(entry.id)}
                    >
                      <Trash2 className="h-3 w-3" strokeWidth={1.5} aria-hidden />
                    </button>
                  </td>
                </tr>
              )
            })}
        </tbody>
      </table>
    </div>
  )
}
