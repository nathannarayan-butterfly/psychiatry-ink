import { resolveDomainConfig } from '../config/domainConfig'
import {
  getPublicRoute,
  localizedPath,
  toPublicLocale,
  type PublicLocale,
  type PublicPageKey,
} from './publicRoutes'

/** Absolute origin per primary public locale — used for canonical + hreflang. */
export const PUBLIC_ORIGINS: Record<PublicLocale, string> = {
  en: 'https://psychiatry.ink',
  de: 'https://psychiatrie.ink',
}

export interface HreflangAlternate {
  hreflang: string
  href: string
}

export interface PublicPageMeta {
  locale: PublicLocale
  brandName: string
  title: string
  description: string
  canonicalUrl: string
  alternates: HreflangAlternate[]
  ogTitle: string
  ogDescription: string
  ogSiteName: string
  ogLocale: string
  robots: string
}

/** Per-page, per-locale title (without brand suffix) + meta description. */
const PAGE_COPY: Record<
  PublicPageKey,
  Record<PublicLocale, { title: string; description: string }>
> = {
  landing: {
    en: {
      title: 'The intelligent workspace for modern psychiatry',
      description:
        'Psychiatry.Ink is a secure psychiatric workspace for documentation, case discussion, psychopharmacology reference, treatment planning, and clinician-reviewed AI assistance.',
    },
    de: {
      title: 'Der intelligente Arbeitsbereich für die moderne Psychiatrie',
      description:
        'Psychiatrie.Ink ist ein sicherer psychiatrischer Arbeitsbereich für Dokumentation, Fallbesprechung, psychopharmakologische Referenz, Therapieplanung und ärztlich geprüfte KI-Unterstützung.',
    },
  },
  features: {
    en: {
      title: 'Features',
      description:
        'Structured documentation, case discussion, psychopharmacology knowledge base, treatment planning, clinical tools, and optional clinical intelligence — one psychiatric workspace.',
    },
    de: {
      title: 'Funktionen',
      description:
        'Strukturierte Dokumentation, Fallbesprechung, psychopharmakologische Wissensdatenbank, Therapieplanung, klinische Tools und optionale Clinical Intelligence — ein psychiatrischer Arbeitsbereich.',
    },
  },
  pricing: {
    en: {
      title: 'Pricing',
      description:
        'Start with a one-month free trial including 500 AI credits. Individual use £24.99/month or £239.90/year. Team and enterprise plans in development.',
    },
    de: {
      title: 'Preise',
      description:
        'Starten Sie mit einer einmonatigen kostenlosen Testphase inklusive 500 KI-Credits. Einzelnutzung £24,99/Monat oder £239,90/Jahr. Team- und Enterprise-Tarife in Entwicklung.',
    },
  },
  security: {
    en: {
      title: 'Security & data protection',
      description:
        'Clinician control, de-identification workflows, regional privacy options, and auditability — security and GDPR-aligned data protection are central to Psychiatry.Ink.',
    },
    de: {
      title: 'Sicherheit & Datenschutz',
      description:
        'Ärztliche Kontrolle, De-Identifikations-Workflows, regionale Datenschutzoptionen und Auditierbarkeit — Sicherheit und DSGVO-konformer Datenschutz stehen bei Psychiatrie.Ink im Zentrum.',
    },
  },
  privacy: {
    en: {
      title: 'Privacy policy',
      description:
        'How Psychiatry.Ink processes personal data under the UK GDPR and EU GDPR: lawful bases, your rights, data security, processors, and international transfers.',
    },
    de: {
      title: 'Datenschutzerklärung',
      description:
        'Wie Psychiatrie.Ink personenbezogene Daten nach DSGVO und UK GDPR verarbeitet: Rechtsgrundlagen, Ihre Rechte, Datensicherheit, Auftragsverarbeiter und Drittlandübermittlungen.',
    },
  },
  terms: {
    en: {
      title: 'Terms of service',
      description:
        'The terms governing use of Psychiatry.Ink, including clinical responsibility, acceptable use, subscriptions and billing, and limitation of liability.',
    },
    de: {
      title: 'Allgemeine Geschäftsbedingungen',
      description:
        'Die Nutzungsbedingungen von Psychiatrie.Ink, einschließlich ärztlicher Verantwortung, zulässiger Nutzung, Abonnements und Abrechnung sowie Haftungsbeschränkung.',
    },
  },
  impressum: {
    en: {
      title: 'Legal notice',
      description: 'Provider identification and legal notice for Psychiatry.Ink.',
    },
    de: {
      title: 'Impressum',
      description: 'Anbieterkennzeichnung und Impressum gemäß § 5 DDG für Psychiatrie.Ink.',
    },
  },
  contact: {
    en: {
      title: 'Contact',
      description:
        'Contact Psychiatry.Ink for professional inquiries about the psychiatric workspace, support, billing, privacy, or technical issues.',
    },
    de: {
      title: 'Kontakt',
      description:
        'Kontakt zu Psychiatrie.Ink für professionelle Anfragen zum psychiatrischen Arbeitsbereich, Support, Abrechnung, Datenschutz oder technische Probleme.',
    },
  },
  login: {
    en: {
      title: 'Sign in',
      description: 'Sign in to your Psychiatry.Ink workspace.',
    },
    de: {
      title: 'Anmelden',
      description: 'Melden Sie sich bei Ihrem Psychiatrie.Ink-Arbeitsbereich an.',
    },
  },
}

const OG_LOCALE: Record<PublicLocale, string> = {
  en: 'en_GB',
  de: 'de_DE',
}

/** Build canonical URL, hreflang alternates and OG/meta for a page on a host. */
export function getPublicPageMeta(key: PublicPageKey, hostname: string): PublicPageMeta {
  const config = resolveDomainConfig(hostname)
  const locale = toPublicLocale(config.defaultLocale)
  const route = getPublicRoute(key)
  const copy = PAGE_COPY[key][locale]
  const brandName = config.brandName

  const canonicalUrl = `${PUBLIC_ORIGINS[locale]}${localizedPath(key, locale)}`

  // hreflang alternates: one per locale the page is offered in, plus x-default
  // pointing at the English URL. Login/non-indexable pages get no alternates.
  const alternates: HreflangAlternate[] = []
  if (route.indexable) {
    for (const altLocale of route.locales) {
      alternates.push({
        hreflang: altLocale === 'en' ? 'en-GB' : 'de-DE',
        href: `${PUBLIC_ORIGINS[altLocale]}${localizedPath(key, altLocale)}`,
      })
    }
    if (route.locales.includes('en')) {
      alternates.push({
        hreflang: 'x-default',
        href: `${PUBLIC_ORIGINS.en}${localizedPath(key, 'en')}`,
      })
    }
  }

  const isLanding = key === 'landing'
  const title = isLanding ? `${brandName} — ${copy.title}` : `${copy.title} · ${brandName}`

  return {
    locale,
    brandName,
    title,
    description: copy.description,
    canonicalUrl,
    alternates,
    ogTitle: title,
    ogDescription: copy.description,
    ogSiteName: brandName,
    ogLocale: OG_LOCALE[locale],
    robots: route.indexable ? 'index,follow' : 'noindex,follow',
  }
}
