import { useTranslation } from '../../../context/TranslationContext'
import type { ClinicalSignalChip } from '../../../utils/overview/overviewClinicalSignals'

interface OverviewClinicalSignalChipsProps {
  chips: ClinicalSignalChip[]
  onChipClick: (chip: ClinicalSignalChip) => void
}

export function OverviewClinicalSignalChips({ chips, onChipClick }: OverviewClinicalSignalChipsProps) {
  const { t } = useTranslation()

  if (chips.length === 0) return null

  return (
    <ul className="ov-hero__chips" aria-label={t('overviewChipListLabel')}>
      {chips.map((chip) => {
        const label = t(chip.labelKey)
        const text = chip.count !== undefined ? `${label} ${chip.count}` : label
        return (
          <li key={chip.id}>
            <button
              type="button"
              className={`ov-hero__chip ov-hero__chip--tone-${chip.tone}`}
              onClick={() => onChipClick(chip)}
              aria-label={text}
            >
              <span className="ov-hero__chip-label">{label}</span>
              {chip.count !== undefined ? (
                <span className="ov-hero__chip-count">{chip.count}</span>
              ) : null}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
