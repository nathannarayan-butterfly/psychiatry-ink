import type { AssessmentStandard } from '../types/isdm'
import type { EnglishVariant, UiLanguage } from '../types/settings'

export type PsychopathSubMode = 'free' | 'checklist' | 'isdm'

export const PSYCHOPATH_SUB_MODES: PsychopathSubMode[] = ['free', 'checklist', 'isdm']

export function isPsychopathSubMode(value: string): value is PsychopathSubMode {
  return PSYCHOPATH_SUB_MODES.includes(value as PsychopathSubMode)
}

export function resolveDefaultPsychopathSubMode(
  assessmentStandard: AssessmentStandard,
): PsychopathSubMode {
  return assessmentStandard === 'international_structured_diagnostic_mapping'
    ? 'isdm'
    : 'checklist'
}

export function resolveAssessmentStandardForSubMode(
  subMode: PsychopathSubMode,
): AssessmentStandard {
  return subMode === 'isdm' ? 'international_structured_diagnostic_mapping' : 'local_clinical'
}

export function getPsychopathSubModeLabel(
  subMode: PsychopathSubMode,
  language: UiLanguage,
  _englishVariant: EnglishVariant = 'uk',
): string {
  switch (subMode) {
    case 'free':
      switch (language) {
        case 'de':
          return 'Freitext'
        case 'en':
          return 'Free text'
        case 'fr':
          return 'Texte libre'
        case 'es':
          return 'Texto libre'
      }
      break
    case 'checklist':
      return 'AMDP'
    case 'isdm':
      return 'ISDM V.1'
      break
  }
}
