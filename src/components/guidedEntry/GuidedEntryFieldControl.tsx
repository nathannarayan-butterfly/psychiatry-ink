import { useTranslation } from '../../context/TranslationContext'
import type { UiTranslationKey } from '../../data/uiTranslations'
import type { GuidedEntryField } from '../../types/guidedEntry'

interface GuidedEntryFieldControlProps {
  field: GuidedEntryField
  value: string | boolean | string[] | undefined
  hasError?: boolean
  onChange: (value: string | boolean | string[]) => void
}

export function GuidedEntryFieldControl({
  field,
  value,
  hasError = false,
  onChange,
}: GuidedEntryFieldControlProps) {
  const { t } = useTranslation()
  const label = t(field.labelKey as UiTranslationKey)
  const placeholder = field.placeholderKey ? t(field.placeholderKey as UiTranslationKey) : undefined
  const helper = field.helperKey ? t(field.helperKey as UiTranslationKey) : undefined
  const fieldClass = `ge-field${hasError ? ' ge-field--error' : ''}`

  if (field.type === 'yes_no') {
    const checked = value === true
    return (
      <label className={fieldClass}>
        <span className="ge-field__label">{label}</span>
        <div className="ge-yesno">
          <button
            type="button"
            className={`ge-yesno__btn${checked ? ' ge-yesno__btn--active' : ''}`}
            onClick={() => onChange(true)}
          >
            {t('guidedEntryYes')}
          </button>
          <button
            type="button"
            className={`ge-yesno__btn${value === false ? ' ge-yesno__btn--active' : ''}`}
            onClick={() => onChange(false)}
          >
            {t('guidedEntryNo')}
          </button>
        </div>
        {helper ? <span className="ge-field__helper">{helper}</span> : null}
      </label>
    )
  }

  if (field.type === 'select' || field.type === 'radio_group') {
    return (
      <label className={fieldClass}>
        <span className="ge-field__label">
          {label}
          {!field.required ? <span className="ge-optional"> ({t('guidedEntryOptional')})</span> : null}
        </span>
        <select
          className="ge-input"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{t('guidedEntrySelectPlaceholder')}</option>
          {field.options?.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {t(opt.labelKey as UiTranslationKey)}
            </option>
          ))}
        </select>
        {helper ? <span className="ge-field__helper">{helper}</span> : null}
      </label>
    )
  }

  if (field.type === 'checkbox_group') {
    const selected = Array.isArray(value) ? value : []
    return (
      <fieldset className={fieldClass}>
        <legend className="ge-field__label">
          {label}
          {!field.required ? <span className="ge-optional"> ({t('guidedEntryOptional')})</span> : null}
        </legend>
        <div className="ge-checkgroup">
          {field.options?.map((opt) => {
            const checked = selected.includes(opt.id)
            return (
              <label key={opt.id} className="ge-checkgroup__item">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...selected, opt.id]
                      : selected.filter((id) => id !== opt.id)
                    onChange(next)
                  }}
                />
                <span>{t(opt.labelKey as UiTranslationKey)}</span>
              </label>
            )
          })}
        </div>
        {helper ? <span className="ge-field__helper">{helper}</span> : null}
      </fieldset>
    )
  }

  if (field.type === 'textarea' || field.type === 'long_text') {
    return (
      <label className={fieldClass}>
        <span className="ge-field__label">
          {label}
          {!field.required ? <span className="ge-optional"> ({t('guidedEntryOptional')})</span> : null}
        </span>
        <textarea
          className="ge-textarea"
          value={typeof value === 'string' ? value : ''}
          placeholder={placeholder}
          rows={4}
          onChange={(e) => onChange(e.target.value)}
        />
        {helper ? <span className="ge-field__helper">{helper}</span> : null}
      </label>
    )
  }

  return (
    <label className={fieldClass}>
      <span className="ge-field__label">
        {label}
        {!field.required ? <span className="ge-optional"> ({t('guidedEntryOptional')})</span> : null}
      </span>
      <input
        className="ge-input"
        type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
        value={typeof value === 'string' ? value : ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {helper ? <span className="ge-field__helper">{helper}</span> : null}
    </label>
  )
}
