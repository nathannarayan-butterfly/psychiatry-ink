import type { PublicLocale } from './publicRoutes'

/** Contact form category values (shared between client form and API). */
export type ContactCategory =
  | 'general'
  | 'support'
  | 'billing'
  | 'privacy'
  | 'technical'

export const CONTACT_CATEGORY_ENUM = [
  'general',
  'support',
  'billing',
  'privacy',
  'technical',
] as const satisfies readonly ContactCategory[]

export const CONTACT_CATEGORIES: readonly ContactCategory[] = CONTACT_CATEGORY_ENUM

export interface ContactCategoryOption {
  value: ContactCategory
  label: string
}

export interface ContactCopy {
  title: string
  lead: string
  nameLabel: string
  emailLabel: string
  subjectLabel: string
  messageLabel: string
  organisationLabel: string
  categoryLabel: string
  categoryPlaceholder: string
  categories: ContactCategoryOption[]
  messageWarning: string
  privacyConsentBefore: string
  privacyConsentLink: string
  privacyConsentAfter: string
  submit: string
  submitting: string
  success: string
  errorGeneric: string
  errorUnavailable: string
  requiredHint: string
}

const CATEGORIES_EN: ContactCategoryOption[] = [
  { value: 'general', label: 'General inquiry' },
  { value: 'support', label: 'Support' },
  { value: 'billing', label: 'Billing' },
  { value: 'privacy', label: 'Privacy' },
  { value: 'technical', label: 'Technical issue' },
]

const CATEGORIES_DE: ContactCategoryOption[] = [
  { value: 'general', label: 'Allgemeine Anfrage' },
  { value: 'support', label: 'Support' },
  { value: 'billing', label: 'Abrechnung' },
  { value: 'privacy', label: 'Datenschutz' },
  { value: 'technical', label: 'Technisches Problem' },
]

const COPY: Record<PublicLocale, ContactCopy> = {
  en: {
    title: 'Contact',
    lead: 'Send us a message about Psychiatry.Ink. We respond to professional inquiries from clinicians and healthcare organisations.',
    nameLabel: 'Name',
    emailLabel: 'Email address',
    subjectLabel: 'Subject',
    messageLabel: 'Message',
    organisationLabel: 'Organisation / practice / clinic (optional)',
    categoryLabel: 'Category (optional)',
    categoryPlaceholder: 'Select a category',
    categories: CATEGORIES_EN,
    messageWarning:
      'Please do not submit patient data, health data, or other confidential clinical content through this form.',
    privacyConsentBefore: 'I have read the ',
    privacyConsentLink: 'privacy policy',
    privacyConsentAfter:
      ' and agree that my details will be processed to handle my inquiry.',
    submit: 'Send message',
    submitting: 'Sending…',
    success: 'Thank you. Your message has been submitted.',
    errorGeneric: 'Something went wrong. Please try again or email us directly.',
    errorUnavailable:
      'The contact form is temporarily unavailable. Please email hello@psychiatry.ink directly.',
    requiredHint: 'Required',
  },
  de: {
    title: 'Kontakt',
    lead: 'Senden Sie uns eine Nachricht zu Psychiatrie.Ink. Wir antworten auf professionelle Anfragen von Ärztinnen und Ärzten sowie Gesundheitseinrichtungen.',
    nameLabel: 'Name',
    emailLabel: 'E-Mail-Adresse',
    subjectLabel: 'Betreff',
    messageLabel: 'Nachricht',
    organisationLabel: 'Organisation / Praxis / Klinik (optional)',
    categoryLabel: 'Kategorie (optional)',
    categoryPlaceholder: 'Kategorie auswählen',
    categories: CATEGORIES_DE,
    messageWarning:
      'Bitte übermitteln Sie über dieses Formular keine Patientendaten, Gesundheitsdaten oder sonstigen vertraulichen klinischen Inhalte.',
    privacyConsentBefore: 'Ich habe die ',
    privacyConsentLink: 'Datenschutzerklärung',
    privacyConsentAfter:
      ' gelesen und bin damit einverstanden, dass meine Angaben zur Bearbeitung meiner Anfrage verarbeitet werden.',
    submit: 'Nachricht senden',
    submitting: 'Wird gesendet…',
    success: 'Vielen Dank. Ihre Anfrage wurde übermittelt.',
    errorGeneric: 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut oder schreiben Sie uns direkt per E-Mail.',
    errorUnavailable:
      'Das Kontaktformular ist vorübergehend nicht verfügbar. Bitte schreiben Sie direkt an hello@psychiatry.ink.',
    requiredHint: 'Pflichtfeld',
  },
}

export function getContactCopy(locale: PublicLocale): ContactCopy {
  return COPY[locale]
}
