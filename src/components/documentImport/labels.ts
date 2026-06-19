import type { UiTranslationKey } from '../../data/uiTranslations'
import type {
  CandidateModule,
  ImportConfidence,
} from '../../schemas/documentImport/envelope'
import { isoToGermanDate } from '../../utils/documentImport/dateAssociation'
import { complementaryTherapyDisplayName } from '../../utils/documentImport/complementaryTherapyMapping'

/** Modules selectable as remap targets in the review screen. */
export const REMAP_MODULES: CandidateModule[] = [
  'anamnese',
  'verlauf',
  'diagnosis',
  'medication',
  'lab',
  'investigation',
  'therapy',
  'complementaryTherapy',
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
    case 'complementaryTherapy':
      return 'documentImportModuleComplementaryTherapy'
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
    (module === 'verlauf' ||
      module === 'therapy' ||
      module === 'complementaryTherapy') &&
    typeof data.date === 'string' &&
    data.date
      ? ` · ${isoToGermanDate(data.date)}`
      : ''
  if (typeof data.therapyTypeId === 'string' && module === 'complementaryTherapy') {
    const name = complementaryTherapyDisplayName(data.therapyTypeId, 'de')
    const preview =
      typeof data.text === 'string' ? data.text.slice(0, 60) : ''
    return `${name}${dateSuffix}${preview ? ` — ${preview}` : ''}`
  }
  if (typeof data.label === 'string') {
    const code = typeof data.icd10Code === 'string' && data.icd10Code ? `${data.icd10Code} ` : ''
    return `${code}${data.label}`.trim()
  }
  if (typeof data.substance === 'string') {
    const strength = typeof data.strength === 'string' && data.strength ? ` ${data.strength}` : ''
    const dose = typeof data.doseText === 'string' && data.doseText ? ` ${data.doseText}` : ''
    const route = typeof data.route === 'string' && data.route ? ` · ${data.route}` : ''
    const prn = data.isPrn === true ? ' · PRN' : ''
    const depot =
      data.isDepot === true
        ? ` · ${typeof data.depotInterval === 'string' && data.depotInterval ? data.depotInterval : 'Depot'}`
        : ''
    return `${data.substance}${strength}${dose}${route}${prn}${depot}`.trim()
  }
  if (Array.isArray(data.values)) {
    const panel = typeof data.panelLabel === 'string' ? data.panelLabel : 'Labor'
    return `${panel} (${data.values.length})`
  }
  if (typeof data.title === 'string' && data.title) {
    if (
      module === 'anamnese' &&
      data.sectionContents &&
      typeof data.sectionContents === 'object' &&
      !Array.isArray(data.sectionContents)
    ) {
      const sectionCount = Object.keys(data.sectionContents as Record<string, unknown>).length
      return sectionCount > 0 ? `${data.title} (${sectionCount})` : data.title
    }
    return `${data.title}${dateSuffix}`
  }
  if (typeof data.text === 'string') return `${data.text.slice(0, 80)}${dateSuffix}`
  return ''
}
