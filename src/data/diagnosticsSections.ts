import type { UiTranslationKey } from './uiTranslations'

export const DIAGNOSTICS_SECTION_IDS = ['labor', 'ekg', 'eeg', 'imaging'] as const

export type DiagnosticsSectionId = (typeof DIAGNOSTICS_SECTION_IDS)[number]

export function isDiagnosticsSectionId(value: unknown): value is DiagnosticsSectionId {
  return (
    typeof value === 'string' &&
    (DIAGNOSTICS_SECTION_IDS as readonly string[]).includes(value)
  )
}

// LP (Lumbalpunktion) has no dedicated page: LP results surface via the Labor section.
export const DIAGNOSTICS_SECTIONS: Array<{
  id: DiagnosticsSectionId
  labelKey: UiTranslationKey
  enabled: boolean
}> = [
  { id: 'labor', labelKey: 'diagnosticsSectionLabor', enabled: true },
  { id: 'ekg', labelKey: 'diagnosticsSectionEkg', enabled: true },
  { id: 'eeg', labelKey: 'diagnosticsSectionEeg', enabled: true },
  { id: 'imaging', labelKey: 'diagnosticsSectionImaging', enabled: true },
]
