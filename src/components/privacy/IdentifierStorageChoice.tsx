import { useTranslation } from '../../context/TranslationContext'
import type { IdentifierStorageMode } from '../../utils/identifierStorage'

interface IdentifierStorageChoiceProps {
  value: IdentifierStorageMode
  onChange: (mode: IdentifierStorageMode) => void
  /** Signup shows full intro; settings shows “change anytime” note. */
  variant: 'signup' | 'settings'
  switchNote?: string | null
  /**
   * When set, the lengthy explainer + comparison table are tucked behind a
   * “mehr anzeigen” disclosure so the dialog leads with a short plain-language
   * summary and the actual choice. Used for the onboarding popup, which was
   * previously a wall of text. Signup/settings keep the full detail inline.
   */
  detailsCollapsible?: boolean
}

export function IdentifierStorageChoice({
  value,
  onChange,
  variant,
  switchNote,
  detailsCollapsible = false,
}: IdentifierStorageChoiceProps) {
  const { t } = useTranslation()

  const details = (
    <>
      <div className="identifier-storage-choice__explainer" role="note">
        <p className="identifier-storage-choice__explainer-line">{t('identifierStorageWhatAreIdentifiers')}</p>
        <p className="identifier-storage-choice__explainer-line">{t('identifierStorageWhatIsCaseFile')}</p>
        <p className="identifier-storage-choice__explainer-line identifier-storage-choice__explainer-line--emphasis">
          {t('identifierStoragePassphraseAlways')}
        </p>
      </div>

      <p className="identifier-storage-choice__warning" role="note">
        {t('identifierStorageDeviceWarning')}
      </p>

      <table className="identifier-storage-choice__table">
        <thead>
          <tr>
            <th scope="col">{t('identifierStorageTableTopic')}</th>
            <th scope="col">{t('identifierStorageDeviceTitle')}</th>
            <th scope="col">{t('identifierStorageAccountTitle')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">{t('identifierStorageTableNameDob')}</th>
            <td>{t('identifierStorageTableDeviceNameDob')}</td>
            <td>{t('identifierStorageTableAccountNameDob')}</td>
          </tr>
          <tr>
            <th scope="row">{t('identifierStorageTableCaseFile')}</th>
            <td colSpan={2}>{t('identifierStorageTableCaseFileBoth')}</td>
          </tr>
          <tr>
            <th scope="row">{t('identifierStorageTableNewDevice')}</th>
            <td className="identifier-storage-choice__table-cell--warning">
              {t('identifierStorageTableDeviceNewDevice')}
            </td>
            <td>{t('identifierStorageTableAccountNewDevice')}</td>
          </tr>
        </tbody>
      </table>
    </>
  )

  return (
    <div className="identifier-storage-choice">
      {variant === 'signup' ? (
        <p className="identifier-storage-choice__intro">{t('identifierStorageSignupIntro')}</p>
      ) : (
        <p className="identifier-storage-choice__change-note">{t('identifierStorageCanChangeLater')}</p>
      )}

      {detailsCollapsible ? (
        <>
          <p className="identifier-storage-choice__summary">{t('identifierStorageOnboardingSummary')}</p>
          <details className="identifier-storage-choice__details">
            <summary className="identifier-storage-choice__details-toggle">
              {t('identifierStorageDetailsToggle')}
            </summary>
            <div className="identifier-storage-choice__details-body">{details}</div>
          </details>
        </>
      ) : (
        details
      )}

      <fieldset className="identifier-storage-choice__options">
        <legend className="identifier-storage-choice__legend">{t('identifierStorageLabel')}</legend>
        <label
          className={`identifier-storage-choice__option${value === 'device' ? ' identifier-storage-choice__option--selected' : ''}`}
        >
          <input
            type="radio"
            name={`identifier-storage-${variant}`}
            checked={value === 'device'}
            onChange={() => onChange('device')}
          />
          <span className="identifier-storage-choice__option-body">
            <span className="identifier-storage-choice__option-title">{t('identifierStorageDeviceTitle')}</span>
            <span
              className={`identifier-storage-choice__option-desc${value === 'device' ? ' identifier-storage-choice__option-desc--warning' : ''}`}
            >
              {t('identifierStorageDeviceShort')}
            </span>
          </span>
        </label>
        <label
          className={`identifier-storage-choice__option${value === 'account' ? ' identifier-storage-choice__option--selected' : ''}`}
        >
          <input
            type="radio"
            name={`identifier-storage-${variant}`}
            checked={value === 'account'}
            onChange={() => onChange('account')}
          />
          <span className="identifier-storage-choice__option-body">
            <span className="identifier-storage-choice__option-title">{t('identifierStorageAccountTitle')}</span>
            <span className="identifier-storage-choice__option-desc">{t('identifierStorageAccountShort')}</span>
          </span>
        </label>
      </fieldset>

      {switchNote ? (
        <p
          className={
            value === 'device'
              ? 'identifier-storage-choice__warning'
              : 'identifier-storage-choice__switch-note'
          }
          role="status"
        >
          {switchNote}
        </p>
      ) : null}
    </div>
  )
}
