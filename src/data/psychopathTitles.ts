import type { EnglishVariant, UiLanguage } from '../types/settings'
import type { UiTranslationKey } from './uiTranslations'

export function resolveEnPsychopathDocumentTitle(variant: EnglishVariant): string {
  return variant === 'us' ? 'Mental Status Examination' : 'Mental State Examination'
}

export function getPsychopathDocumentTitle(
  language: UiLanguage,
  englishVariant: EnglishVariant = 'uk',
): string {
  if (language === 'en') return resolveEnPsychopathDocumentTitle(englishVariant)
  if (language === 'de') return 'Psychopathologischer Befund'
  if (language === 'fr') return 'Examen psychiatrique'
  return 'Exploración psicopatológica'
}

export function getPsychopathChecklistVariantLabel(language: UiLanguage): string {
  switch (language) {
    case 'de':
      return 'AMDP-Checkliste'
    case 'en':
      return 'Structured examination'
    case 'fr':
      return 'Sémiologie psychiatrique'
    case 'es':
      return 'Exploración estructurada'
  }
}

export function getPsychopathRailHeading(
  language: UiLanguage,
  englishVariant: EnglishVariant = 'uk',
): string {
  switch (language) {
    case 'de':
      return 'Psychopathologie'
    case 'en':
      return resolveEnPsychopathDocumentTitle(englishVariant)
    case 'fr':
      return 'Sémiologie psychiatrique'
    case 'es':
      return 'Exploración psicopatológica'
  }
}

export function getPsychopathNormalBefundHeading(
  language: UiLanguage,
  englishVariant: EnglishVariant = 'uk',
): string {
  return getPsychopathDocumentTitle(language, englishVariant)
}

export function getPsychopathToolLabelLines(
  language: UiLanguage,
  englishVariant: EnglishVariant = 'uk',
): [string, string] {
  switch (language) {
    case 'de':
      return ['Psycho-', 'pathologie']
    case 'en':
      return englishVariant === 'us'
        ? ['Mental Status', 'Examination']
        : ['Mental State', 'Examination']
    case 'fr':
      return ['Examen', 'psychiatrique']
    case 'es':
      return ['Exploración', 'psicopatológica']
  }
}

const PSYCHOPATH_UI_KEYS = new Set<UiTranslationKey>([
  'workspaceModeChecklist',
  'notionPagePsychopath',
  'notionPastePsychopath',
  'notionSlashPsychopath',
  'notionSlashPsychopathTemplate',
  'notionSlashVerlaufTemplate',
  'notionConvertPpb',
  'kiDocPpb',
])

export function isPsychopathUiKey(key: UiTranslationKey): boolean {
  return PSYCHOPATH_UI_KEYS.has(key)
}

export function resolvePsychopathUiTranslation(
  key: UiTranslationKey,
  language: UiLanguage,
  englishVariant: EnglishVariant = 'uk',
): string | undefined {
  if (!PSYCHOPATH_UI_KEYS.has(key)) return undefined

  const title = getPsychopathDocumentTitle(language, englishVariant)
  const checklistLabel = getPsychopathChecklistVariantLabel(language)

  switch (key) {
    case 'workspaceModeChecklist':
      return checklistLabel
    case 'notionPagePsychopath':
    case 'notionSlashPsychopath':
    case 'kiDocPpb':
      return title
    case 'notionPastePsychopath':
      switch (language) {
        case 'de':
          return 'In Psychopathologischen Befund übernehmen'
        case 'en':
          return `Apply to ${title.toLowerCase()}`
        case 'fr':
          return "Appliquer à l'examen psychiatrique"
        case 'es':
          return 'Aplicar a exploración psicopatológica'
      }
      break
    case 'notionSlashPsychopathTemplate':
      return `${title}:\n\n`
    case 'notionSlashVerlaufTemplate':
      switch (language) {
        case 'de':
          return 'Visite / Kurzkontakt:\n\nAnlass:\n\nPsychopathologischer Befund:\n\nVerlauf / Maßnahmen:\n\nPlan:'
        case 'en':
          return `Visit / brief contact:\n\nReason:\n\n${title}:\n\nProgress / measures:\n\nPlan:`
        case 'fr':
          return 'Visite / contact bref :\n\nMotif :\n\nExamen psychiatrique :\n\nÉvolution / mesures :\n\nPlan :'
        case 'es':
          return 'Visita / contacto breve:\n\nMotivo:\n\nExploración psicopatológica:\n\nEvolución / medidas:\n\nPlan:'
      }
      break
    case 'notionConvertPpb':
      switch (language) {
        case 'de':
          return 'In PPB umwandeln'
        case 'en':
          return `Convert to ${title.toLowerCase()}`
        case 'fr':
          return "Convertir en examen psychiatrique"
        case 'es':
          return 'Convertir en exploración psicopatológica'
      }
      break
  }

  return undefined
}
