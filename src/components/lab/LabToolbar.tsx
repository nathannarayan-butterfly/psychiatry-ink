import { Plus } from 'lucide-react'

import { useTranslation } from '../../context/TranslationContext'
import type { LabDateRangePreset } from '../../types/lab'
import type { LabToolState } from '../../hooks/useLabTool'

interface LabToolbarProps {
  lab: LabToolState
}

const dateRangePresets: LabDateRangePreset[] = ['all', '3m', '6m', '12m']

const dateRangeLabelKey: Record<
  LabDateRangePreset,
  'labDateRangeAll' | 'labDateRange3m' | 'labDateRange6m' | 'labDateRange12m'
> = {
  all: 'labDateRangeAll',
  '3m': 'labDateRange3m',
  '6m': 'labDateRange6m',
  '12m': 'labDateRange12m',
}

export function LabToolbar({ lab }: LabToolbarProps) {
  const { t } = useTranslation()

  return (
    <div className="lab-toolbar">
      <label className="lab-toolbar__field">
        <span className="lab-toolbar__label">{t('labParameter')}</span>
        <select
          className="lab-toolbar__select"
          value={lab.selectedParameter ?? ''}
          onChange={(event) => lab.setSelectedParameter(event.target.value || null)}
          disabled={lab.parameters.length === 0}
        >
          {lab.parameters.length === 0 ? (
            <option value="">{t('labNoParameters')}</option>
          ) : (
            lab.parameters.map((parameter) => (
              <option key={parameter} value={parameter}>
                {parameter}
              </option>
            ))
          )}
        </select>
      </label>

      <div className="lab-toolbar__field">
        <span className="lab-toolbar__label">{t('labDateRange')}</span>
        <div className="lab-toolbar__segment">
          {dateRangePresets.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`lab-toolbar__segment-btn ${
                lab.dateRangePreset === preset ? 'lab-toolbar__segment-btn--active' : ''
              }`}
              onClick={() => lab.setDateRangePreset(preset)}
            >
              {t(dateRangeLabelKey[preset])}
            </button>
          ))}
        </div>
      </div>

      <div className="lab-toolbar__actions">
        <button type="button" className="lab-workspace__action" onClick={lab.openAddLabDialog}>
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
          {t('labAddEntry')}
        </button>
        <button type="button" className="lab-workspace__action" onClick={lab.openAddMarkerDialog}>
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
          {t('labAddMedication')}
        </button>
      </div>
    </div>
  )
}
