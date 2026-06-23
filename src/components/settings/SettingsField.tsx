import type { ReactNode } from 'react'

interface SettingsFieldProps {
  label: string
  description?: string
  children: ReactNode
  /**
   * Stack the label above a full-row-width control instead of the default
   * aligned label/control columns. Used by the Appearance section so the rich
   * pickers (colour swatches, font cards) can use the full content width.
   */
  stack?: boolean
}

export function SettingsField({ label, description, children, stack = false }: SettingsFieldProps) {
  return (
    <div className={`settings-field${stack ? ' settings-field--stack' : ''}`}>
      <div className="settings-field__label-col">
        <p className="settings-field__label">{label}</p>
        {description ? <p className="settings-field__description">{description}</p> : null}
      </div>
      <div className="settings-field__control">{children}</div>
    </div>
  )
}
