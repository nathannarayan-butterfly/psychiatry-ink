import type { ReactNode } from 'react'

interface SettingsFieldProps {
  label: string
  description?: string
  children: ReactNode
}

export function SettingsField({ label, description, children }: SettingsFieldProps) {
  return (
    <div className="flex flex-col gap-3 border-b-2 border-border py-5 last:border-b-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="sm:max-w-[240px]">
        <p className="text-sm font-medium text-ink">{label}</p>
        {description ? <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p> : null}
      </div>
      <div className="min-w-0 flex-1 sm:max-w-md">{children}</div>
    </div>
  )
}
