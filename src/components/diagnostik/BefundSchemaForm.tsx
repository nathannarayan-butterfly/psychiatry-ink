import type { BefundFieldDef } from '../../data/befundSchemas/types'
import type { BefundSchema } from '../../data/befundSchemas/types'

interface BefundSchemaFormProps {
  schema: BefundSchema
  values: Record<string, string | string[] | boolean>
  onChange: (fieldId: string, value: string | string[] | boolean) => void
  examDate: string
  onExamDateChange: (date: string) => void
}

function RadioGroupField({
  field,
  value,
  onChange,
}: {
  field: BefundFieldDef
  value: string
  onChange: (value: string) => void
}) {
  return (
    <fieldset className="befund-form__fieldset">
      <legend className="befund-form__legend">{field.label}</legend>
      <div className="befund-form__radio-grid">
        {(field.options ?? []).map((opt) => (
          <label key={opt.value} className="befund-form__radio-label">
            <input
              type="radio"
              name={field.id}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function CheckboxGroupField({
  field,
  value,
  onChange,
}: {
  field: BefundFieldDef
  value: string[]
  onChange: (value: string[]) => void
}) {
  const selected = new Set(value)
  return (
    <fieldset className="befund-form__fieldset">
      <legend className="befund-form__legend">{field.label}</legend>
      <div className="befund-form__checkbox-grid">
        {(field.options ?? []).map((opt) => (
          <label key={opt.value} className="befund-form__checkbox-label">
            <input
              type="checkbox"
              checked={selected.has(opt.value)}
              onChange={(e) => {
                const next = new Set(selected)
                if (e.target.checked) next.add(opt.value)
                else next.delete(opt.value)
                onChange([...next])
              }}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function BefundSchemaForm({
  schema,
  values,
  onChange,
  examDate,
  onExamDateChange,
}: BefundSchemaFormProps) {
  return (
    <div className="befund-form">
      <div className="befund-form__meta">
        <label className="befund-form__date-label">
          <span>Untersuchungsdatum</span>
          <input
            type="date"
            className="befund-form__date-input"
            value={examDate}
            onChange={(e) => onExamDateChange(e.target.value)}
          />
        </label>
      </div>

      {schema.sections.map((section) => (
        <section key={section.id} className="befund-form__section">
          <h3 className="befund-form__section-title">{section.label}</h3>
          <div className="befund-form__fields">
            {section.fields.map((field) => {
              const raw = values[field.id]

              if (field.type === 'checkbox_group') {
                return (
                  <CheckboxGroupField
                    key={field.id}
                    field={field}
                    value={Array.isArray(raw) ? raw : []}
                    onChange={(v) => onChange(field.id, v)}
                  />
                )
              }

              if (field.type === 'radio_group') {
                return (
                  <RadioGroupField
                    key={field.id}
                    field={field}
                    value={typeof raw === 'string' ? raw : ''}
                    onChange={(v) => onChange(field.id, v)}
                  />
                )
              }

              if (field.type === 'checkbox') {
                return (
                  <label key={field.id} className="befund-form__checkbox-label befund-form__checkbox-label--single">
                    <input
                      type="checkbox"
                      checked={raw === true}
                      onChange={(e) => onChange(field.id, e.target.checked)}
                    />
                    <span>{field.label}</span>
                  </label>
                )
              }

              if (field.type === 'select') {
                return (
                  <label key={field.id} className="befund-form__field">
                    <span className="befund-form__field-label">{field.label}</span>
                    <select
                      className="befund-form__select"
                      value={typeof raw === 'string' ? raw : ''}
                      onChange={(e) => onChange(field.id, e.target.value)}
                    >
                      <option value="">—</option>
                      {(field.options ?? []).map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )
              }

              if (field.type === 'long_text') {
                return (
                  <label key={field.id} className="befund-form__field">
                    <span className="befund-form__field-label">{field.label}</span>
                    <textarea
                      className="befund-form__textarea"
                      rows={3}
                      placeholder={field.placeholder}
                      value={typeof raw === 'string' ? raw : ''}
                      onChange={(e) => onChange(field.id, e.target.value)}
                    />
                  </label>
                )
              }

              return (
                <label key={field.id} className="befund-form__field">
                  <span className="befund-form__field-label">{field.label}</span>
                  <input
                    type="text"
                    className="befund-form__input"
                    placeholder={field.placeholder}
                    value={typeof raw === 'string' ? raw : ''}
                    onChange={(e) => onChange(field.id, e.target.value)}
                  />
                </label>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
