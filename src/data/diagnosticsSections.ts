import type { UiTranslationKey } from './uiTranslations'

export type DiagnosticsSectionId = 'labor' | 'befunde' | 'imaging' | 'neurophysiology'

// LP (Lumbalpunktion) has no dedicated page: LP results surface via the Labor section.
export const DIAGNOSTICS_SECTIONS: Array<{
  id: DiagnosticsSectionId
  labelKey: UiTranslationKey
  enabled: boolean
}> = [
  { id: 'labor', labelKey: 'diagnosticsSectionLabor', enabled: true },
  { id: 'befunde', labelKey: 'diagnosticsSectionBefunde', enabled: true },
  { id: 'imaging', labelKey: 'diagnosticsSectionImaging', enabled: false },
  { id: 'neurophysiology', labelKey: 'diagnosticsSectionNeurophysiology', enabled: false },
]
