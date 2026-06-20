import type { UiLanguage } from '../../types/settings'
import { homepageContentDe } from './content.de'
import { homepageContentEn } from './content.en'
import { homepageContentEs } from './content.es'
import { homepageContentFr } from './content.fr'
import type { HomepageContent, HomepageContentByLanguage } from './types'

export type {
  HomepageCard,
  HomepageContent,
  HomepageContentByLanguage,
  HomepageDemoPanel,
  HomepageModuleCard,
  HomepageNavLink,
  HomepageSecurityPrinciple,
  HomepageSingleUseTier,
  HomepageWorkflowStep,
} from './types'

export { formatHomepageTemplate } from './types'

const homepageContentByLanguage: HomepageContentByLanguage = {
  de: homepageContentDe,
  en: homepageContentEn,
  fr: homepageContentFr,
  es: homepageContentEs,
}

export function getHomepageContent(language: UiLanguage): HomepageContent {
  return homepageContentByLanguage[language] ?? homepageContentDe
}

export { homepageContentByLanguage }
