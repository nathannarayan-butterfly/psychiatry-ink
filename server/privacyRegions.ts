/**
 * Server mirror of src/data/privacyRegions.ts — keep tier maps in sync.
 */

export type PrivacyTier = 'full' | 'local_only' | 'disabled'

export const COUNTRY_TIER_OVERRIDES: Record<string, PrivacyTier> = {
  DE: 'local_only',
  AT: 'local_only',
  CH: 'local_only',
  US: 'full',
  GB: 'full',
  AU: 'full',
  CA: 'full',
}

/**
 * EU-safe default: any country without an explicit `full` override (which
 * includes every EU/EEA member state, plus DE/AT/CH above) falls back to
 * `local_only`, so EU clinical data is never opted into server-side public-key
 * registration or DB snapshots by default. Only the explicitly listed non-EU
 * jurisdictions (US/GB/AU/CA) are granted the `full` tier.
 */
export const DEFAULT_PRIVACY_TIER: PrivacyTier = 'local_only'

export function resolvePrivacyTier(countryCode: string | null | undefined): PrivacyTier {
  if (!countryCode) return DEFAULT_PRIVACY_TIER
  const normalized = countryCode.trim().toUpperCase()
  return COUNTRY_TIER_OVERRIDES[normalized] ?? DEFAULT_PRIVACY_TIER
}

export function allowsPublicKeyRegistration(tier: PrivacyTier): boolean {
  return tier === 'full'
}

export function allowsWorkspaceDbSnapshot(tier: PrivacyTier): boolean {
  return tier === 'full'
}
