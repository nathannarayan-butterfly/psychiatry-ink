import type { ReactNode } from 'react'

interface SettingsFieldProps {
  label: string
  description?: string
  children: ReactNode
}

export function SettingsField({ label, description, children }: SettingsFieldProps) {
  return (
    <div className="settings-field">
      <div className="settings-field__label-col">
        <p className="settings-field__label">{label}</p>
        {description ? <p className="settings-field__description">{description}</p> : null}
      </div>
      <div className="settings-field__control">{children}</div>
    </div>
  )
}
