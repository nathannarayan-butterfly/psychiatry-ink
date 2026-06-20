import type { UiLanguage } from '../../types/settings'

export interface HomepageNavLink {
  id: string
  label: string
  href: string
}

export interface HomepageCard {
  id: string
  title: string
  description: string
}

export interface HomepageModuleCard extends HomepageCard {
  label: string
}

export interface HomepageWorkflowStep {
  id: string
  title: string
  description: string
}

export interface HomepageSecurityPrinciple {
  id: string
  title: string
  description: string
}

export interface HomepageDemoPanel {
  id: string
  label: string
  title: string
  description: string
  imageSrc: string
  imageAlt: string
}

export interface HomepageSingleUseTier {
  name: string
  trial: { price: string; detail: string }
  thenLabel: string
  toggle: { monthly: string; yearly: string }
  yearlyRecommendation: string
  yearlyConfirmation: string
  billing: {
    monthly: {
      price: string
      period: string
      credits: string
      savings: string | null
    }
    yearly: {
      price: string
      period: string
      credits: string
      savings: string | null
    }
  }
  description: string
  features: string[]
  aiCreditsLink: { label: string; href: string }
  cta: string
}

export interface HomepageContent {
  meta: { title: string; tagline: string }
  nav: {
    links: HomepageNavLink[]
    openWorkspaceLabel: string
    homeAriaLabel: string
    mainNavAriaLabel: string
  }
  hero: {
    eyebrow: string
    headline: string
    subtitle: string
    primaryCta: string
    secondaryCta: string
    devModeLink: string
    trustLabelsAriaLabel: string
    trustLabels: string[]
    workspaceModules: string[]
  }
  pillars: {
    sectionId: string
    eyebrow: string
    title: string
    lead: string
    cards: HomepageCard[]
  }
  workflow: {
    sectionId: string
    eyebrow: string
    title: string
    lead: string
    steps: HomepageWorkflowStep[]
  }
  modules: {
    sectionId: string
    eyebrow: string
    title: string
    lead: string
    cards: HomepageModuleCard[]
  }
  security: {
    sectionId: string
    eyebrow: string
    title: string
    lead: string
    principles: HomepageSecurityPrinciple[]
  }
  tiers: {
    sectionId: string
    eyebrow: string
    title: string
    lead: string
    singleUse: HomepageSingleUseTier
    comingSoonNote: string
  }
  demo: {
    sectionId: string
    eyebrow: string
    title: string
    lead: string
    panels: HomepageDemoPanel[]
  }
  finalCta: {
    title: string
    subtitle: string
    primaryCta: string
    secondaryCta: string
  }
  poweredBy: { label: string }
  footer: {
    companyName: string
    companyRegistration: string
    companyNumber: string
    address: string
    allRightsReserved: string
    footerNavAriaLabel: string
    links: HomepageNavLink[]
    disclaimer: string
  }
  ui: {
    availableNow: string
    billingPeriodAriaLabel: string
    syntheticDemoBadge: string
    enlargeScreenshotTemplate: string
    closeScreenshotAriaLabel: string
  }
}

export type HomepageContentByLanguage = Record<UiLanguage, HomepageContent>

export function formatHomepageTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    template,
  )
}
