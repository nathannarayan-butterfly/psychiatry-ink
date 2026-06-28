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
 * Default for unmapped countries (e.g. India, EU members other than DE/AT/CH).
 * Only explicitly listed overrides (DACH → `local_only`; US/GB/AU/CA → `full`)
 * deviate from this fallback.
 */
export const DEFAULT_PRIVACY_TIER: PrivacyTier = 'full'

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
