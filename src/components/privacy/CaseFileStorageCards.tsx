import { useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import {
  caseFileStorageStatusKey,
  type CaseFileStorageMode,
} from '../../utils/caseFileStorageMode'

interface CaseFileStorageCardsProps {
  mode: CaseFileStorageMode
  onChange: (mode: CaseFileStorageMode) => void
  disabled?: boolean
  /** Show the plain-language "Aktuell: …" status line above the cards. */
  showStatus?: boolean
  /**
   * Show the "Erweiterte Einstellungen" disclosure with the pseudonymous
   * sync mode (case file synced, identifiers device-only). Off by default —
   * this mode is confusing for non-technical users and must be opted into,
   * never a main choice (see the redesign spec).
   */
  allowAdvanced?: boolean
  name: string
}

const mainOptions: Array<{
  value: Exclude<CaseFileStorageMode, 'advanced'>
  titleKey: 'caseFileStorageLocalTitle' | 'caseFileStorageIdentifiersTitle' | 'caseFileStorageFullTitle'
  descKey: 'caseFileStorageLocalDesc' | 'caseFileStorageIdentifiersDesc' | 'caseFileStorageFullDesc'
}> = [
  { value: 'local', titleKey: 'caseFileStorageLocalTitle', descKey: 'caseFileStorageLocalDesc' },
  {
    value: 'identifiers',
    titleKey: 'caseFileStorageIdentifiersTitle',
    descKey: 'caseFileStorageIdentifiersDesc',
  },
  { value: 'full', titleKey: 'caseFileStorageFullTitle', descKey: 'caseFileStorageFullDesc' },
]

/**
 * The one storage-mode picker shared by the signup wizard, the first-login
 * popup, and the Datenschutz settings page. Keeping this in one place is the
 * whole point — three separate copies of this choice is exactly how the
 * original "DE silently disables sync" bug happened.
 */
export function CaseFileStorageCards({
  mode,
  onChange,
  disabled = false,
  showStatus = false,
  allowAdvanced = false,
  name,
}: CaseFileStorageCardsProps) {
  const { t } = useTranslation()
  const [advancedOpen, setAdvancedOpen] = useState(mode === 'advanced')

  return (
    <div className="case-file-storage-cards">
      {showStatus ? (
        <p className="case-file-storage-status" role="status">
          {t(caseFileStorageStatusKey(mode))}
        </p>
      ) : null}

      <fieldset className="case-file-storage-cards__grid" disabled={disabled}>
        <legend className="sr-only">{t('caseFileStorageLabel')}</legend>
        {mainOptions.map((option) => {
          const selected = mode === option.value
          return (
            <label
              key={option.value}
              className={`case-file-storage-cards__card${selected ? ' case-file-storage-cards__card--selected' : ''}`}
            >
              <input
                type="radio"
                name={name}
                className="case-file-storage-cards__radio"
                checked={selected}
                onChange={() => onChange(option.value)}
              />
              <span className="case-file-storage-cards__body">
                <span className="case-file-storage-cards__title">{t(option.titleKey)}</span>
                <span className="case-file-storage-cards__desc">{t(option.descKey)}</span>
                {option.value === 'full' ? (
                  <span className="case-file-storage-cards__note">
                    {t('caseFileStorageFullPassphraseNote')}
                  </span>
                ) : null}
              </span>
            </label>
          )
        })}
      </fieldset>

      {allowAdvanced ? (
        <div className="case-file-storage-advanced">
          {!advancedOpen ? (
            <button
              type="button"
              className="case-file-storage-advanced__toggle"
              onClick={() => setAdvancedOpen(true)}
            >
              {t('storageAdvancedToggle')}
            </button>
          ) : (
            <div className="case-file-storage-advanced__body">
              <label
                className={`case-file-storage-cards__card${mode === 'advanced' ? ' case-file-storage-cards__card--selected' : ''}`}
              >
                <input
                  type="radio"
                  name={name}
                  className="case-file-storage-cards__radio"
                  checked={mode === 'advanced'}
                  disabled={disabled}
                  onChange={() => onChange('advanced')}
                />
                <span className="case-file-storage-cards__body">
                  <span className="case-file-storage-cards__title">
                    {t('caseFileStorageAdvancedTitle')}
                  </span>
                  <span className="case-file-storage-cards__desc">
                    {t('caseFileStorageAdvancedDesc')}
                  </span>
                </span>
              </label>
              {mode === 'advanced' ? (
                <p className="case-file-storage-advanced__warning">
                  {t('caseFileStorageAdvancedWarning')}
                </p>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
