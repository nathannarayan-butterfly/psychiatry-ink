import type { ReactNode } from 'react'
import type { TemplateField, TemplateFieldType } from '../../types/documentTemplate'
import { FIELD_MENU_ITEMS } from '../../utils/documentTemplate/constants'
import { sanitizeRichHtml } from '../../utils/documentTemplate/htmlUtils'
import { fieldTypeLabel } from '../../utils/documentTemplate/constants'

export function createFieldFromType(
  type: TemplateFieldType,
  order: number,
  label: string,
): TemplateField {
  const menuItem = FIELD_MENU_ITEMS.find((i) => i.type === type && i.defaultBinding)
  const field: TemplateField = {
    id: crypto.randomUUID(),
    type,
    label,
    order,
    required: false,
  }

  if (type === 'select' || type === 'multi_select' || type === 'radio_group') {
    field.options = [
      { id: crypto.randomUUID(), label: 'Option 1' },
      { id: crypto.randomUUID(), label: 'Option 2' },
    ]
  }
  if (type === 'yes_no') {
    field.label = label || 'Ja / Nein'
  }
  if (type === 'static_text') {
    field.defaultValue = '<p>Text…</p>'
  }
  if (type === 'heading') {
    field.label = 'Abschnitt'
    field.defaultValue = 'Abschnitt'
  }
  if (type === 'spacer') {
    field.defaultValue = '4'
  }
  if (type === 'number_with_unit') {
    field.unit = 'EUR'
  }
  if (type.includes('placeholder') || menuItem?.defaultBinding) {
    field.binding = menuItem?.defaultBinding ?? 'patient.name'
  }
  if (type === 'signature') {
    field.label = 'Unterschrift'
  }
  if (type === 'initials') {
    field.label = 'Paraphe'
  }
  if (type === 'name_line') {
    field.label = 'Name'
  }

  return field
}

interface TemplateFieldPreviewProps {
  field: TemplateField
  lang: 'de' | 'en'
  selected?: boolean
  onSelect: () => void
}

export function TemplateFieldPreview({ field, lang, selected, onSelect }: TemplateFieldPreviewProps) {
  const typeLabel = fieldTypeLabel(field.type, lang)

  let preview: ReactNode = null
  if (field.type === 'static_text') {
    preview = (
      <div
        className="dt-canvas-static"
        dangerouslySetInnerHTML={{ __html: sanitizeRichHtml((field.defaultValue as string) ?? '') }}
      />
    )
  } else if (field.type === 'heading') {
    preview = <h4 className="dt-canvas-heading">{field.label ?? field.defaultValue as string}</h4>
  } else if (field.type === 'divider') {
    preview = <hr className="dt-canvas-divider" />
  } else if (field.type === 'spacer') {
    const mm = Math.max(2, Number(field.defaultValue) || 4)
    preview = <div className="dt-canvas-spacer" style={{ height: `${mm}mm` }} aria-hidden />
  } else if (field.type === 'long_text') {
    preview = (
      <div className="dt-canvas-field">
        <span className="dt-canvas-label">{field.label}</span>
        <div className="dt-canvas-input dt-canvas-input--area">…</div>
      </div>
    )
  } else if (field.type === 'yes_no') {
    preview = (
      <div className="dt-canvas-field">
        <span className="dt-canvas-label">{field.label}</span>
        <span className="dt-canvas-inline">Ja ☐ &nbsp; Nein ☐</span>
      </div>
    )
  } else if (field.type === 'multi_select' || field.type === 'checkbox_group') {
    preview = (
      <div className="dt-canvas-field">
        <span className="dt-canvas-label">{field.label}</span>
        {(field.options ?? []).map((opt) => (
          <div key={opt.id} className="dt-canvas-check">☐ {opt.label}</div>
        ))}
      </div>
    )
  } else if (field.type === 'signature' || field.type === 'initials' || field.type === 'name_line') {
    preview = (
      <div className="dt-canvas-field">
        <span className="dt-canvas-label">{field.label}</span>
        <span className="dt-canvas-line">________________________</span>
      </div>
    )
  } else if (field.type.includes('placeholder')) {
    preview = (
      <div className="dt-canvas-field dt-canvas-field--placeholder">
        <span className="dt-canvas-label">{field.label ?? field.binding}</span>
        <span className="dt-canvas-placeholder">{'{{'}…{'}}'}</span>
      </div>
    )
  } else {
    preview = (
      <div className="dt-canvas-field">
        <span className="dt-canvas-label">{field.label}</span>
        <span className="dt-canvas-input">…</span>
      </div>
    )
  }

  return (
    <div
      className={[
        'dt-canvas-block',
        selected ? 'dt-canvas-block--selected' : '',
        field.type === 'divider' || field.type === 'spacer' ? 'dt-canvas-block--layout' : '',
      ].join(' ').trim()}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
    >
      <span className="dt-canvas-block__type">{typeLabel}</span>
      {preview}
    </div>
  )
}
