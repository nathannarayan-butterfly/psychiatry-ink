import { checklistHintTranslations, therapieVerlaufHintTranslations } from '../data/hintTranslations'
import { defaultPsychopathSections } from '../data/psychopathSections'
import { defaultTherapieVerlaufSections } from '../data/therapieVerlaufSections'
import type { UiLanguage } from '../types/settings'
import type {
  WorkspaceChecklistItem,
  WorkspaceComponentTemplate,
  WorkspaceSectionTemplate,
} from '../types/workspaceSettings'

const CACHE_KEY = 'psychiatry-ink:hint-translation-cache'
const BATCH_SIZE = 15

type HintCache = Record<string, Partial<Record<UiLanguage, string>>>

function readCache(): HintCache {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as HintCache) : {}
  } catch {
    return {}
  }
}

function writeCache(cache: HintCache): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
}

function collectGermanHints(): string[] {
  const hints = new Set<string>()

  for (const section of defaultTherapieVerlaufSections) {
    if (section.description) hints.add(section.description)
    if (section.exampleHint) hints.add(section.exampleHint)
  }

  for (const section of defaultPsychopathSections) {
    if (section.description) hints.add(section.description)
    for (const item of section.checklistItems ?? []) {
      if (item.hint) hints.add(item.hint)
    }
  }

  return [...hints]
}

function lookupStaticTranslation(germanText: string, language: UiLanguage): string | undefined {
  if (language === 'de') return germanText

  if (checklistHintTranslations[germanText]?.[language]) {
    return checklistHintTranslations[germanText][language]
  }

  for (const entry of Object.values(therapieVerlaufHintTranslations)) {
    if (entry.description.de === germanText && entry.description[language]) {
      return entry.description[language]
    }
    if (entry.exampleHint.de === germanText && entry.exampleHint[language]) {
      return entry.exampleHint[language]
    }
  }

  return undefined
}

/** Mock agent batch — replace with secure API proxy when database layer exists. */
async function translateBatch(
  texts: string[],
  targetLanguage: UiLanguage,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {}

  for (const text of texts) {
    const staticTranslation = lookupStaticTranslation(text, targetLanguage)
    result[text] = staticTranslation ?? text
  }

  return result
}

export async function ensureHintsTranslated(language: UiLanguage): Promise<void> {
  if (language === 'de') return

  const cache = readCache()
  const germanHints = collectGermanHints()
  const missing = germanHints.filter((hint) => !cache[hint]?.[language])

  for (let index = 0; index < missing.length; index += BATCH_SIZE) {
    const batch = missing.slice(index, index + BATCH_SIZE)
    const translated = await translateBatch(batch, language)

    for (const [german, localized] of Object.entries(translated)) {
      cache[german] = { ...cache[german], [language]: localized }
    }
  }

  writeCache(cache)
}

export function translateHintText(germanText: string | undefined, language: UiLanguage): string | undefined {
  if (!germanText) return undefined
  if (language === 'de') return germanText

  const cache = readCache()
  return (
    cache[germanText]?.[language] ??
    lookupStaticTranslation(germanText, language) ??
    germanText
  )
}

function localizeChecklistItem(
  item: WorkspaceChecklistItem,
  language: UiLanguage,
): WorkspaceChecklistItem {
  return {
    ...item,
    hint: translateHintText(item.hint, language),
  }
}

function localizeSectionHints(
  section: WorkspaceSectionTemplate,
  language: UiLanguage,
): WorkspaceSectionTemplate {
  return {
    ...section,
    description: translateHintText(section.description, language),
    exampleHint: translateHintText(section.exampleHint, language),
    checklistItems: section.checklistItems?.map((item) =>
      localizeChecklistItem(item, language),
    ),
  }
}

export function getLocalizedTherapieVerlaufSections(language: UiLanguage) {
  return defaultTherapieVerlaufSections.map((section) => localizeSectionHints(section, language))
}

export function applyHintTranslationsToComponents(
  components: WorkspaceComponentTemplate[],
  language: UiLanguage,
): WorkspaceComponentTemplate[] {
  if (language === 'de') return components

  return components.map((component) => ({
    ...component,
    sections: component.sections.map((section) => localizeSectionHints(section, language)),
    variants: component.variants?.map((variant) => ({
      ...variant,
      sections: variant.sections.map((section) => localizeSectionHints(section, language)),
    })),
  }))
}
