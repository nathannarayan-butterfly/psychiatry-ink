import { useTranslation } from '../../context/TranslationContext'
import type { TemplateField } from '../../types/documentTemplate'
import { isDeferredWizardFieldType, normalizeFieldType } from '../../utils/documentTemplate/fieldTypeNormalize'
import { sanitizeRichHtml } from '../../utils/documentTemplate/htmlUtils'
import { RichTextField } from './RichTextField'

interface WizardFieldInputProps {
  field: TemplateField
  value: string | boolean | string[]
  onChange: (value: string | boolean | string[]) => void
  readOnly?: boolean
}

export function WizardFieldInput({ field, value, onChange, readOnly }: WizardFieldInputProps) {
  const { t } = useTranslation()
  const effectiveType = normalizeFieldType(field.type)

  if (isDeferredWizardFieldType(field.type)) {
    return (
      <div className="dt-wizard-deferred">
        <p className="dt-field-help">{t('templateWizardDeferredField')}</p>
        <input
          className="dt-input"
          value={typeof value === 'string' ? value : ''}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.label}
        />
      </div>
    )
  }

  if (field.type === 'legal_checkbox') {
    return (
      <label className="dt-field-check dt-field-check--legal">
        <input
          type="checkbox"
          checked={value === true}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>
          <strong>{field.label}</strong>
          {field.legalText ? (
            <span className="dt-legal-text">{field.legalText}</span>
          ) : null}
        </span>
      </label>
    )
  }

  if (field.type === 'checkbox') {
    return (
      <label className="dt-field-check">
        <input
          type="checkbox"
          checked={value === true}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{field.label}</span>
      </label>
    )
  }

  if (field.type === 'multi_select' || field.type === 'checkbox_group') {
    const selected = Array.isArray(value) ? value : []
    return (
      <fieldset className="dt-field-label">
        <legend>{field.label}</legend>
        {field.options?.map((opt) => (
          <label key={opt.id} className="dt-field-check">
            <input
              type="checkbox"
              checked={selected.includes(opt.id)}
              disabled={readOnly}
              onChange={(e) => {
                const next = e.target.checked
                  ? [...selected, opt.id]
                  : selected.filter((id) => id !== opt.id)
                onChange(next)
              }}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </fieldset>
    )
  }

  if (field.type === 'radio_group') {
    const selected = typeof value === 'string' ? value : ''
    return (
      <fieldset className="dt-field-label">
        <legend>{field.label}</legend>
        {field.options?.map((opt) => (
          <label key={opt.id} className="dt-field-check">
            <input
              type="radio"
              name={field.id}
              checked={selected === opt.id}
              disabled={readOnly}
              onChange={() => onChange(opt.id)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </fieldset>
    )
  }

  if (field.type === 'yes_no') {
    const selected = typeof value === 'string' ? value : ''
    return (
      <fieldset className="dt-field-label">
        <legend>{field.label}</legend>
        <label className="dt-field-check">
          <input
            type="radio"
            name={field.id}
            checked={selected === 'yes'}
            disabled={readOnly}
            onChange={() => onChange('yes')}
          />
          <span>{t('templateYes')}</span>
        </label>
        <label className="dt-field-check">
          <input
            type="radio"
            name={field.id}
            checked={selected === 'no'}
            disabled={readOnly}
            onChange={() => onChange('no')}
          />
          <span>{t('templateNo')}</span>
        </label>
      </fieldset>
    )
  }

  if (field.type === 'select') {
    return (
      <label className="dt-field-label">
        {field.label}
        <select
          className="dt-input"
          value={typeof value === 'string' ? value : ''}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{t('templateSelectEmpty')}</option>
          {field.options?.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
      </label>
    )
  }

  if (
    effectiveType === 'long_text' ||
    field.type === 'ai_assisted_text' ||
    field.type === 'textarea'
  ) {
    return (
      <label className="dt-field-label">
        {field.label}
        <RichTextField
          value={typeof value === 'string' ? value : ''}
          onChange={(html) => onChange(html)}
          readOnly={readOnly}
          minHeight="5rem"
          resizable
          ariaLabel={field.label}
        />
      </label>
    )
  }

  if (effectiveType === 'short_text' || field.type === 'text') {
    return (
      <label className="dt-field-label">
        {field.label}
        <input
          className="dt-input"
          value={typeof value === 'string' ? value : ''}
          readOnly={readOnly}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    )
  }

  if (
    field.type === 'patient_placeholder' ||
    field.type === 'case_placeholder' ||
    field.type === 'clinician_placeholder' ||
    field.type === 'organization_placeholder'
  ) {
    const text = typeof value === 'string' ? value : ''
    const unresolved = !text.trim()
    return (
      <label className="dt-field-label">
        {field.label ?? field.binding}
        <input
          className={`dt-input${unresolved ? ' dt-input--unresolved' : ''}`}
          value={text}
          readOnly={readOnly}
          placeholder={t('templatePlaceholderUnresolved')}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    )
  }

  if (field.type === 'signature' || field.type === 'initials' || field.type === 'name_line') {
    return (
      <label className="dt-field-label">
        {field.label}
        <input
          className="dt-input dt-input--line"
          value={typeof value === 'string' ? value : ''}
          readOnly={readOnly}
          placeholder="________________________"
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    )
  }

  if (field.type === 'date' || field.type === 'time' || field.type === 'number') {
    const inputType = field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : 'number'
    return (
      <label className="dt-field-label">
        {field.label}
        <input
          className="dt-input"
          type={inputType}
          value={typeof value === 'string' ? value : ''}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    )
  }

  if (field.type === 'static_text') {
    return (
      <div
        className="dt-field-static"
        dangerouslySetInnerHTML={{
          __html: sanitizeRichHtml((field.defaultValue as string | undefined) ?? field.label ?? ''),
        }}
      />
    )
  }

  return (
    <label className="dt-field-label">
      {field.label}
      <input
        className="dt-input"
        value={typeof value === 'string' ? value : ''}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}
