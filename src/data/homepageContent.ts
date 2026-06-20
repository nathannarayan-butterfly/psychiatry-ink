/**
 * @deprecated Import from `src/data/homepage` instead.
 * Re-exports English content for legacy call sites.
 */
export { getHomepageContent, homepageContentByLanguage } from './homepage'

// Legacy named exports — English only; migrate to getHomepageContent(language).
import { homepageContentEn } from './homepage/content.en'

export const homepageMeta = homepageContentEn.meta

export const homepageNav = homepageContentEn.nav
export const homepageHero = homepageContentEn.hero
export const homepagePillars = homepageContentEn.pillars
export const homepageWorkflow = homepageContentEn.workflow
export const homepageModules = homepageContentEn.modules
export const homepageSecurity = homepageContentEn.security
export const homepageTiers = homepageContentEn.tiers
export const homepageDemo = homepageContentEn.demo
export const homepageFinalCta = homepageContentEn.finalCta
export const homepagePoweredBy = homepageContentEn.poweredBy
export const homepageFooter = homepageContentEn.footer
