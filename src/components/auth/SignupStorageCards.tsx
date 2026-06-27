import { useTranslation } from '../../context/TranslationContext'
import type { IdentifierStorageMode } from '../../utils/identifierStorage'

interface SignupStorageCardsProps {
  value: IdentifierStorageMode
  onChange: (mode: IdentifierStorageMode) => void
  disabled?: boolean
}

export function SignupStorageCards({ value, onChange, disabled = false }: SignupStorageCardsProps) {
  const { t } = useTranslation()

  const options: {
    mode: IdentifierStorageMode
    titleKey: 'identifierStorageDeviceTitle' | 'identifierStorageAccountTitle'
    descKey: 'signupWizardStorageDeviceDesc' | 'signupWizardStorageAccountDesc'
    warn?: boolean
  }[] = [
    {
      mode: 'device',
      titleKey: 'identifierStorageDeviceTitle',
      descKey: 'signupWizardStorageDeviceDesc',
      warn: true,
    },
    {
      mode: 'account',
      titleKey: 'identifierStorageAccountTitle',
      descKey: 'signupWizardStorageAccountDesc',
    },
  ]

  return (
    <fieldset className="signup-storage-cards" disabled={disabled}>
      <legend className="signup-storage-cards__legend">{t('identifierStorageLabel')}</legend>
      <div className="signup-storage-cards__grid">
        {options.map(({ mode, titleKey, descKey, warn }) => {
          const selected = value === mode
          return (
            <button
              key={mode}
              type="button"
              className={`signup-storage-cards__card${selected ? ' signup-storage-cards__card--selected' : ''}`}
              aria-pressed={selected}
              onClick={() => onChange(mode)}
            >
              <span className="signup-storage-cards__card-title">{t(titleKey)}</span>
              <span
                className={`signup-storage-cards__card-desc${warn && selected ? ' signup-storage-cards__card-desc--warn' : ''}`}
              >
                {t(descKey)}
              </span>
            </button>
          )
        })}
      </div>
      <p className="signup-storage-cards__note" role="note">
        {t('signupWizardStoragePassphraseNote')}
      </p>
    </fieldset>
  )
}
