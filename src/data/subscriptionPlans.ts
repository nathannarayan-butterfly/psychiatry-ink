/**
 * Psychiatry.ink subscription tiers — numbers derived from codebase usage.
 *
 * Internal rationale (not shown on landing):
 * - Default dev balance: 500 credits (prisma CreditBalance, credits.ts)
 * - Observed API spend: ~$0.25 total for ~500 credits of usage → ~$0.0005 / credit actual cost
 * - Retail mapping: CREDITS_PER_EUR = 100 → 1 credit ≈ 1 ct nominal at list price
 * - Generation costs (creditPricing.ts): fast 1, standard 4, thorough 15 (+ length multiplier)
 * - Typical clinical note (standard): ~4 credits → Free 200 ≈ 50 notes; Pro 3000 ≈ 750 notes/mo
 * - Dictation (TRANSCRIBE_CREDITS): 5 credits per transcription
 * - Pro €19/mo leaves healthy margin vs ~€1.50 API at 3000 credits while fitting DE ambulatory SaaS
 */

export type SubscriptionPlan = 'free' | 'pro'

export const TRANSCRIBE_CREDITS = 5

export const FREE_SIGNUP_CREDITS = 200
export const PRO_MONTHLY_CREDITS = 3000

export interface PlanDefinition {
  id: SubscriptionPlan
  nameDe: string
  nameEn: string
  priceEurMonthly: number
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
    priceEurMonthly: 0,
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
    priceEurMonthly: 19,
    signupCredits: 0,
    monthlyCredits: PRO_MONTHLY_CREDITS,
    featuresDe: [
      `${PRO_MONTHLY_CREDITS} Credits pro Monat`,
      'KI-Assistent (schnell / standard / gründlich)',
      'Diktat-Transkription',
      'Patienten anlegen & verwalten',
      'Verschlüsselte Workspace-Snapshots (volle Datenschutz-Stufe)',
    ],
    featuresEn: [
      `${PRO_MONTHLY_CREDITS} credits per month`,
      'AI assistant (fast / standard / thorough)',
      'Dictation transcription',
      'Add & manage patients',
      'Encrypted workspace snapshots (full privacy tier)',
    ],
  },
}

export function isProPlan(plan: SubscriptionPlan): boolean {
  return plan === 'pro'
}
