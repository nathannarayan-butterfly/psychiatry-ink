/**
 * Psychiatry.ink subscription tiers — reconciled to the LIVE Stripe billing.
 *
 * Source of truth for what customers are actually charged:
 * - Subscription price: £24.99/mo (yearly £239.90) — the live Stripe prices in
 *   server/services/stripeCredits.ts. Billed in GBP, like the credit packs.
 * - Period credit grant: MONTHLY_CREDIT_GRANT = 500 (server/ai/aiPricingConfig.ts);
 *   PRO_MONTHLY_CREDITS below MUST stay in sync with it.
 * - Per-credit value: see realized retail rate in creditPacks.ts (≈ €0.035/credit).
 *
 * The previous values here (€19/mo, 3,000 credits) were stale marketing copy
 * that never matched the live Stripe subscription and have been corrected.
 * `priceGbpPenceMonthly` is display-only; the authoritative charge is the Stripe
 * price id, never this number.
 */

export type SubscriptionPlan = 'free' | 'pro'

export const TRANSCRIBE_CREDITS = 5

export const FREE_SIGNUP_CREDITS = 200
/** Live subscription period grant — keep in sync with server MONTHLY_CREDIT_GRANT. */
export const PRO_MONTHLY_CREDITS = 500

/** Live monthly subscription price in GBP pence (£24.99). Display-only. */
export const PRO_MONTHLY_PRICE_GBP_PENCE = 2499

export interface PlanDefinition {
  id: SubscriptionPlan
  nameDe: string
  nameEn: string
  /** Display-only monthly price in GBP pence (authoritative charge = Stripe price id). */
  priceGbpPenceMonthly: number
  signupCredits: number
  monthlyCredits: number
  featuresDe: string[]
  featuresEn: string[]
}

export const PLAN_DEFINITIONS: Record<SubscriptionPlan, PlanDefinition> = {
  free: {
    id: 'free',
    nameDe: 'Kostenlos',
    nameEn: 'Free',
    priceGbpPenceMonthly: 0,
    signupCredits: FREE_SIGNUP_CREDITS,
    monthlyCredits: 0,
    featuresDe: [
      `${FREE_SIGNUP_CREDITS} Credits einmalig bei Registrierung`,
      'Dokumentation, Export, lokaler Tresor',
      'Patienten anlegen & verwalten',
      'Keine KI-Generierung und keine Diktat-Transkription bei 0 Credits',
    ],
    featuresEn: [
      `${FREE_SIGNUP_CREDITS} one-time credits on signup`,
      'Documentation, export, local vault',
      'Add & manage patients',
      'No AI generation or dictation transcription at 0 credits',
    ],
  },
  pro: {
    id: 'pro',
    nameDe: 'Pro',
    nameEn: 'Pro',
    priceGbpPenceMonthly: PRO_MONTHLY_PRICE_GBP_PENCE,
    signupCredits: 0,
    monthlyCredits: PRO_MONTHLY_CREDITS,
    featuresDe: [
      `${PRO_MONTHLY_CREDITS} Credits pro Monat`,
      'KI-Assistent (Economical / Standard / Gründlich)',
      'Diktat-Transkription',
      'Patienten anlegen & verwalten',
      'Verschlüsselte Workspace-Snapshots (volle Datenschutz-Stufe)',
    ],
    featuresEn: [
      `${PRO_MONTHLY_CREDITS} credits per month`,
      'AI assistant (Economical / Standard / Thorough)',
      'Dictation transcription',
      'Add & manage patients',
      'Encrypted workspace snapshots (full privacy tier)',
    ],
  },
}

export function isProPlan(plan: SubscriptionPlan): boolean {
  return plan === 'pro'
}

/** Format a plan's monthly price as a localized GBP currency string. */
export function formatPlanMonthlyPrice(plan: PlanDefinition, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: plan.priceGbpPenceMonthly % 100 === 0 ? 0 : 2,
  }).format(plan.priceGbpPenceMonthly / 100)
}
