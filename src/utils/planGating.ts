import type { PrivacyTier } from '../data/privacyRegions'
import type { SubscriptionPlan } from '../data/subscriptionPlans'

/** AI generation and dictation require a positive credit balance. */
export function hasAiAndDictationCredits(balance: number): boolean {
  return balance > 0
}

/** Patient registry is free and unrestricted for all plans and countries. */
export function canManagePatientRegistry(_plan: SubscriptionPlan, _tier: PrivacyTier): boolean {
  return true
}

export function patientRegistryBlockedReason(
  _plan: SubscriptionPlan,
  _tier: PrivacyTier,
): 'free_plan' | 'tier_disabled' | null {
  return null
}
