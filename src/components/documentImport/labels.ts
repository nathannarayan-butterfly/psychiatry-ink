import type { UiTranslationKey } from '../../data/uiTranslations'
import type {
  CandidateModule,
  ImportConfidence,
} from '../../schemas/documentImport/envelope'
import { isoToGermanDate } from '../../utils/documentImport/dateAssociation'

/** Modules selectable as remap targets in the review screen. */
export const REMAP_MODULES: CandidateModule[] = [
  'anamnese',
  'verlauf',
  'diagnosis',
  'medication',
  'lab',
  'investigation',
  'therapy',
  'risk',
  'document',
]

export function moduleLabelKey(module: CandidateModule): UiTranslationKey {
  switch (module) {
    case 'anamnese':
      return 'documentImportModuleAnamnese'
    case 'verlauf':
      return 'documentImportModuleVerlauf'
    case 'diagnosis':
      return 'documentImportModuleDiagnosis'
    case 'medication':
      return 'documentImportModuleMedication'
    case 'lab':
      return 'documentImportModuleLab'
    case 'investigation':
      return 'documentImportModuleInvestigation'
    case 'therapy':
      return 'documentImportModuleTherapy'
    case 'risk':
      return 'documentImportModuleRisk'
    case 'document':
      return 'documentImportModuleDocument'
  }
}

export function confidenceLabelKey(confidence: ImportConfidence): UiTranslationKey {
  switch (confidence) {
    case 'high':
      return 'documentImportConfidenceHigh'
    case 'medium':
      return 'documentImportConfidenceMedium'
    case 'low':
      return 'documentImportConfidenceLow'
  }
}

/** Short, human-readable summary of a candidate's primary content. */
export function candidateSummary(data: Record<string, unknown>, module?: string): string {
  const dateSuffix =
    (module === 'verlauf' || module === 'therapy') && typeof data.date === 'string' && data.date
      ? ` · ${isoToGermanDate(data.date)}`
      : ''
  if (typeof data.label === 'string') {
    const code = typeof data.icd10Code === 'string' && data.icd10Code ? `${data.icd10Code} ` : ''
    return `${code}${data.label}`.trim()
  }
  if (typeof data.substance === 'string') {
    const strength = typeof data.strength === 'string' && data.strength ? ` ${data.strength}` : ''
    const dose = typeof data.doseText === 'string' && data.doseText ? ` ${data.doseText}` : ''
    return `${data.substance}${strength}${dose}`.trim()
  }
  if (Array.isArray(data.values)) {
    const panel = typeof data.panelLabel === 'string' ? data.panelLabel : 'Labor'
    return `${panel} (${data.values.length})`
  }
  if (typeof data.title === 'string' && data.title) return `${data.title}${dateSuffix}`
  if (typeof data.text === 'string') return `${data.text.slice(0, 80)}${dateSuffix}`
  return ''
}
